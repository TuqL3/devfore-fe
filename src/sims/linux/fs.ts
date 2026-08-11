/** Hệ thống file giả cho mô phỏng Linux.
 *
 *  Một cây trong RAM, không phải một tầng ảo hoá. Ở đây không có inode, không có
 *  symlink, không có quyền được **thi hành** — `chmod 000` rồi `cat` vẫn đọc
 *  được. Mô phỏng này dạy *lệnh làm gì*, không dạy nhân Linux xử lý ra sao; ai
 *  cần cái thứ hai thì lab container đã có shell thật.
 *
 *  ponytail: quyền là số để hiện, không phải để kiểm. Đổi khi nào có bài học nào
 *  cần "Permission denied" là kết quả đúng.
 *
 *  Không import gì từ `@/` — file này chạy được bằng `node --experimental-strip-types`
 *  trong `linux.check.ts`, và alias của Vite thì node không biết. */

export interface FsNode {
  name: string
  /** Quyền dạng bát phân, ví dụ `0o644`. Hiện bằng `modeString`. */
  mode: number
  /** Có `children` là thư mục, có `content` là file. Đúng một trong hai. */
  children?: FsNode[]
  content?: string
}

export const HOME = '/home/dev'
export const START = '/home/dev/project'

const dir = (name: string, children: FsNode[], mode = 0o755): FsNode => ({
  name,
  mode,
  children,
})
const file = (name: string, content: string, mode = 0o644): FsNode => ({
  name,
  mode,
  content,
})

/** Cây lúc mới mở. Dựng lại mỗi lần gọi — nút "Dựng lại" chỉ cần gọi hàm này,
 *  không cần đi gỡ những gì `mkdir` và `chmod` đã sửa. */
export function seedFs(): FsNode {
  return dir('', [
    dir('home', [
      dir('dev', [
        dir('project', [
          dir('.git', [file('HEAD', 'ref: refs/heads/main\n')]),
          // 600: chỉ chủ sở hữu đọc được. Đây là lý do `chmod` có mặt trong bộ
          // mười lệnh — file bí mật để 644 là bí mật cả máy đọc được.
          file(
            '.env',
            'API_URL=http://localhost:3000\nDB_HOST=db.internal\nDB_PASS=doi-mat-khau-nay\n',
            0o600,
          ),
          file('README.md', '# project\n\nChay: npm run dev\nKiem tra: GET /health\n'),
          file(
            'package.json',
            '{\n  "name": "project",\n  "scripts": {\n    "dev": "vite",\n    "test": "vitest"\n  }\n}\n',
          ),
          dir('config', [
            file('app.yaml', 'server:\n  port: 3000\nhealthcheck: /health\ntimeout: 30s\n'),
          ]),
          dir('src', [
            file(
              'app.ts',
              [
                "import express from 'express'",
                "import router from './api/v1/route.ts'",
                '',
                'const app = express()',
                "app.use('/api', router)",
                'app.listen(3000)',
                '',
              ].join('\n'),
            ),
            dir('api', [
              dir('v1', [
                file(
                  'route.ts',
                  [
                    "import { Router } from 'express'", // 1
                    '', // 2
                    'const router = Router()', // 3
                    '', // 4
                    "router.get('/users', (_req, res) => {", // 5
                    "  res.json([{ id: 1, name: 'dev' }])", // 6
                    '})', // 7
                    '', // 8
                    "router.post('/users', (req, res) => {", // 9
                    '  res.status(201).json(req.body)', // 10
                    '})', // 11
                    "router.get('/health', (_req, res) => res.json({ status: 'ok' }))", // 12
                    '', // 13
                    'export default router', // 14
                    '',
                  ].join('\n'),
                ),
              ]),
            ]),
          ]),
          dir('logs', [
            file(
              'api.log',
              [
                'GET /api/users 200 12ms',
                'POST /api/login 201 34ms',
                'cache HIT users:1 2ms',
                'worker ready',
                'GET /health 200 1ms',
                'stream open',
                '',
              ].join('\n'),
            ),
          ]),
        ]),
      ]),
    ]),
  ])
}

/** Biến một đường dẫn người gõ thành đường dẫn tuyệt đối đã rút gọn.
 *
 *  Xử lý `~`, `/`, `.`, `..` và dấu `/` thừa. Không xử lý `$HOME` hay bung dấu
 *  sao — cái đó là việc của shell, mà ở đây không có shell.
 *
 *  `..` ở gốc thì đứng yên, đúng như Linux: `cd /..` vẫn là `/`. */
export function resolve(cwd: string, path: string): string {
  const raw = path.trim() === '' ? '.' : path.trim()
  const start =
    raw === '~' || raw.startsWith('~/')
      ? HOME + raw.slice(1)
      : raw.startsWith('/')
        ? raw
        : cwd + '/' + raw

  const out: string[] = []
  for (const seg of start.split('/')) {
    if (seg === '' || seg === '.') continue
    if (seg === '..') {
      out.pop()
      continue
    }
    out.push(seg)
  }
  return '/' + out.join('/')
}

/** Node ở đường dẫn tuyệt đối đó, hoặc `null` nếu không có. Đi ngang qua một
 *  file thì cũng là `null` — `/README.md/x` không tồn tại. */
export function lookup(root: FsNode, abs: string): FsNode | null {
  let node: FsNode = root
  for (const seg of abs.split('/')) {
    if (seg === '') continue
    const next = node.children?.find((c) => c.name === seg)
    if (!next) return null
    node = next
  }
  return node
}

export const isDir = (n: FsNode): boolean => n.children !== undefined

/** Tạo thư mục kèm mọi thư mục cha còn thiếu — chính là việc mà cờ `-p` làm.
 *
 *  Trả về danh sách đường dẫn **vừa tạo**, không phải mọi đường dẫn đi qua: chỗ
 *  vẽ tô sáng đúng phần mới mọc ra, và đó là điều `-p` cần dạy. Cây có sẵn thì
 *  danh sách rỗng và không có lỗi — `mkdir -p` chạy hai lần vẫn im lặng, khác
 *  hẳn `mkdir` trần. */
export function mkdirp(
  root: FsNode,
  abs: string,
): { created: string[]; error?: string } {
  let node = root
  const created: string[] = []
  let walked = ''
  for (const seg of abs.split('/')) {
    if (seg === '') continue
    walked += '/' + seg
    const found = node.children?.find((c) => c.name === seg)
    if (found) {
      if (!isDir(found)) return { created, error: `${walked}: đã có file trùng tên` }
      node = found
      continue
    }
    const made: FsNode = { name: seg, mode: 0o755, children: [] }
    node.children!.push(made)
    created.push(walked)
    node = made
  }
  return { created }
}

/** Gọi `fn` cho mọi thứ nằm dưới `abs`, sâu bao nhiêu cũng đi. Thứ tự là thứ tự
 *  của `ls`, nên `find` và `grep` liệt kê ra cùng một trật tự với `ls -la`. */
export function walk(
  root: FsNode,
  abs: string,
  fn: (node: FsNode, path: string) => void,
): void {
  const start = lookup(root, abs)
  if (!start) return
  const go = (node: FsNode, path: string) => {
    for (const child of sorted(node.children ?? [])) {
      const p = path === '/' ? '/' + child.name : path + '/' + child.name
      fn(child, p)
      if (isDir(child)) go(child, p)
    }
  }
  go(start, abs)
}

/** Sắp như `ls`: theo tên, file ẩn nằm đúng chỗ chữ cái của nó chứ không bị gom
 *  lên đầu. Trả về mảng mới — cây không được sắp lại chỉ vì có người liệt kê. */
export const sorted = (nodes: FsNode[]): FsNode[] =>
  [...nodes].sort((a, b) => a.name.localeCompare(b.name))

/** `0o644` → `-rw-r--r--`. Chữ đầu là loại: `d` thư mục, `-` file. */
export function modeString(node: FsNode): string {
  const bits = ['---', '--x', '-w-', '-wx', 'r--', 'r-x', 'rw-', 'rwx']
  const o = node.mode
  return (
    (isDir(node) ? 'd' : '-') + bits[(o >> 6) & 7] + bits[(o >> 3) & 7] + bits[o & 7]
  )
}

/** Số byte cho cột size của `ls`. Thư mục ra 4096 như ext4 hay báo — không phải
 *  con số thật của gì cả, nhưng là con số người ta quen thấy ở đó. */
export const sizeOf = (node: FsNode): number =>
  isDir(node) ? 4096 : (node.content?.length ?? 0)

/** Đường dẫn tuyệt đối rút gọn để hiện: `/home/dev/project` → `~/project`. */
export const short = (abs: string): string =>
  abs === HOME ? '~' : abs.startsWith(HOME + '/') ? '~' + abs.slice(HOME.length) : abs

/** `abs` bỏ tiền tố `base`, để `grep` và `find` in ra `src/app.ts` chứ không phải
 *  cả đường dẫn tuyệt đối — đúng như lệnh thật khi chạy với `.`. */
export const relative = (base: string, abs: string): string =>
  abs.startsWith(base + '/') ? abs.slice(base.length + 1) : abs
