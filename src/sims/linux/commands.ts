/** Mười lệnh Linux, mỗi lệnh một hàm thuần biến `(tham số, trạng thái)` thành
 *  một kết quả có kiểu.
 *
 *  Không có bộ phân tích dòng lệnh, và **không gõ được gì cả** — cả dòng lệnh,
 *  kể cả tham số, do tác giả viết sẵn; người dùng chỉ bấm Chạy và xem. Đây là
 *  chủ ý: thứ đáng nhìn là *lệnh đó làm ra cái gì*, và một ô nhập trống là lời
 *  mời đi chệch khỏi đúng cái đó ngay giây đầu tiên. Ai muốn gõ thật thì lab
 *  container có shell thật.
 *
 *  Hệ quả: mỗi tham số cố định phải chạy được ở **mọi** thư mục hiện hành, vì
 *  người dùng không sửa nó lại được. Mấy lệnh trỏ tới một file cụ thể dùng đường
 *  dẫn tuyệt đối; mấy lệnh dạy chính chuyện "đường dẫn tính từ chỗ bạn đứng" thì
 *  cố tình dùng đường dẫn tương đối. `linux.check.ts` canh chỗ này.
 *
 *  Kết quả là dữ liệu, không phải chữ. `ls` trả về mảng dòng chứ không trả về
 *  một khối văn bản, vì chỗ vẽ cần biết cái nào là thư mục để tô màu — và một
 *  cái vẽ đi dò lại chữ mình vừa in ra là chỗ hỏng chờ sẵn.
 *
 *  Không import gì từ `@/`: file này chạy trong `linux.check.ts` bằng node. */
import {
  START,
  isDir,
  lookup,
  mkdirp,
  modeString,
  relative,
  resolve,
  seedFs,
  short,
  sizeOf,
  sorted,
  walk,
} from './fs.ts'
import type { FsNode } from './fs.ts'

/** Cái mà mọi thẻ dùng chung: một cây file và một thư mục hiện hành.
 *
 *  Dùng chung là điểm chính. `cd src` ở thẻ 03 rồi bấm `ls` ở thẻ 02 phải thấy
 *  bên trong `src` — nếu mỗi thẻ giữ trạng thái riêng thì đây là mười cái ảnh
 *  minh hoạ, không phải một mô phỏng. */
export interface LinuxState {
  root: FsNode
  cwd: string
}

export const initState = (): LinuxState => ({ root: seedFs(), cwd: START })

// ── Kết quả ────────────────────────────────────────────────────────────────

export interface ListRow {
  name: string
  mode: string
  size: number
  dir: boolean
}

export interface TreeLine {
  /** Sâu bao nhiêu nấc, để thụt lề. */
  depth: number
  name: string
  dir: boolean
  /** Lệnh vừa rồi tạo ra hoặc tìm thấy dòng này. */
  hit?: boolean
}

export interface Match {
  path: string
  line: number
  text: string
  /** Vị trí khớp trong `text`, để tô đúng đoạn chữ. */
  from: number
  to: number
}

export interface Hop {
  title: string
  sub: string
  state: 'ok' | 'fail'
}

/** Mọi thứ một thẻ có thể vẽ ra. Bảy hình dạng cho mười lệnh — `pwd` và `cd`
 *  cùng nói "bạn đang ở đâu", `curl` và `ssh` cùng nói "gói tin đi qua đâu", nên
 *  chúng dùng chung một cách vẽ thay vì mỗi lệnh một cái. */
export type LinuxResult =
  | { kind: 'error'; text: string }
  | { kind: 'path'; from: string; to: string; entries: { name: string; dir: boolean }[] }
  | { kind: 'list'; at: string; rows: ListRow[] }
  /** `hitLabel` là chữ dán cạnh dòng được tô. `mkdir` tô cái nó **tạo ra**,
   *  `find` tô cái nó **tìm thấy** — cùng một cách vẽ, hai nghĩa khác nhau, và
   *  để chỗ vẽ tự đoán là để nó đoán sai.
   *
   *  `changed` là đường dẫn **tuyệt đối** của những node lệnh này vừa sửa vào
   *  cây. Bảng cây sống bên phải dùng nó để tô. Nói ra chứ không bắt chỗ vẽ tự
   *  dò: `find` cũng trả về `tree` mà không đổi gì, và một bảng tự đoán sẽ tô
   *  sáng kết quả tìm kiếm y như thứ vừa được tạo. */
  | {
      kind: 'tree'
      lines: TreeLine[]
      note: string
      hitLabel: string
      changed?: string[]
    }
  | { kind: 'matches'; pattern: string; scanned: number; hits: Match[] }
  | { kind: 'stream'; file: string; lines: string[] }
  | { kind: 'perms'; file: string; before: number; after: number; changed: string[] }
  | { kind: 'hops'; hops: Hop[]; note: string; body: string[] }

export interface LinuxCmd {
  /** Số thứ tự hiện trên thẻ. Chữ chứ không phải số: `'01'` giữ được số 0. */
  no: string
  /** Phần cố định, gồm cả cờ. Hiện nguyên văn, không sửa được. */
  cmd: string
  /** Một câu nói lệnh này làm gì, in hoa nhỏ dưới tên lệnh. */
  blurb: string
  /** Tham số cố định, hiện nguyên văn cạnh tên lệnh. Không có thì lệnh chạy
   *  trần (chỉ `pwd`). */
  arg?: string
  /** Vì sao đáng học — hai ba câu, hiện dưới kết quả.
   *
   *  Mỗi đoạn văn nằm trên **đúng một dòng nguồn**, dù dài. `Prose` biến mọi
   *  xuống dòng đơn thành ngắt dòng thật, nên gói lại cho vừa 80 cột trong file
   *  là gói luôn cả trên màn hình. Xem chú thích ở `index.ts`. */
  teach: string
  run: (arg: string, st: LinuxState) => LinuxResult
}

export interface LinuxSection {
  no: string
  title: string
  cmds: LinuxCmd[]
}

// ── Phụ trợ ────────────────────────────────────────────────────────────────

const notFound = (p: string): LinuxResult => ({
  kind: 'error',
  text: `${p}: không có file hoặc thư mục`,
})

const entriesOf = (node: FsNode) =>
  sorted(node.children ?? []).map((c) => ({ name: c.name, dir: isDir(c) }))

/** `*.ts` → biểu thức khớp cả tên. Chỉ hai ký tự đại diện, `*` và `?`, vì đó là
 *  hai cái `find -name` nhận. Mọi ký tự khác được thoát, nên một dấu chấm trong
 *  mẫu là dấu chấm thật chứ không phải "ký tự bất kỳ". */
export function globToRe(pattern: string): RegExp {
  const body = pattern
    .split('')
    .map((ch) =>
      ch === '*' ? '.*' : ch === '?' ? '.' : ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    )
    .join('')
  return new RegExp('^' + body + '$')
}

/** Dựng các dòng cây cho một nhánh, tô sáng những đường dẫn trong `hits`.
 *
 *  Chỉ vẽ nhánh dẫn tới các dòng được tô cộng con trực tiếp của chúng. Vẽ cả cây
 *  thì `find` trong một thư mục vài chục file ra một danh sách dài, và cái người
 *  ta cần thấy — thứ vừa tìm ra nằm ở đâu — chìm mất trong đó. */
function branch(root: FsNode, base: string, hits: Set<string>): TreeLine[] {
  const keep = new Set<string>()
  for (const h of hits) {
    let p = h
    while (p.length > base.length) {
      keep.add(p)
      p = p.slice(0, p.lastIndexOf('/'))
    }
  }
  const lines: TreeLine[] = []
  walk(root, base, (node, path) => {
    if (!keep.has(path)) return
    lines.push({
      depth: path.slice(base.length + 1).split('/').length - 1,
      name: node.name,
      dir: isDir(node),
      hit: hits.has(path),
    })
  })
  return lines
}

// ── 01 pwd ─────────────────────────────────────────────────────────────────

const pwd: LinuxCmd = {
  no: '01',
  cmd: 'pwd',
  blurb: 'ĐANG Ở ĐÂU',
  teach: `Mọi đường dẫn tương đối bạn gõ đều tính từ chỗ này. Gõ \`npm test\` mà sai thư mục thì lỗi báo ra không nhắc gì tới thư mục — nó nói không tìm thấy package.json, và bạn đi tìm nhầm chỗ. \`pwd\` là câu trả lời rẻ nhất cho câu hỏi "tại sao lệnh này không thấy file của tôi".`,
  run: (_arg, st) => {
    const node = lookup(st.root, st.cwd)
    return {
      kind: 'path',
      from: st.cwd,
      to: st.cwd,
      entries: node ? entriesOf(node) : [],
    }
  },
}

// ── 02 ls -la ──────────────────────────────────────────────────────────────

const ls: LinuxCmd = {
  no: '02',
  cmd: 'ls -la',
  blurb: 'LIỆT KÊ TẤT CẢ',
  arg: '.',
  teach: `\`-a\` là *all*: hiện cả file bắt đầu bằng dấu chấm. \`ls\` trần giấu \`.env\` và \`.git\` đi — hai thứ hay là nguyên nhân của việc bạn đang gỡ. \`-l\` là *long*: mỗi file một dòng, kèm quyền và cỡ. Cột quyền chính là thứ \`chmod\` ở thẻ 08 sửa.`,
  run: (arg, st) => {
    const abs = resolve(st.cwd, arg)
    const node = lookup(st.root, abs)
    if (!node) return notFound(arg || '.')
    if (!isDir(node)) {
      return {
        kind: 'list',
        at: short(abs),
        rows: [{ name: node.name, mode: modeString(node), size: sizeOf(node), dir: false }],
      }
    }
    return {
      kind: 'list',
      at: short(abs),
      rows: sorted(node.children!).map((c) => ({
        name: c.name,
        mode: modeString(c),
        size: sizeOf(c),
        dir: isDir(c),
      })),
    }
  },
}

// ── 03 cd ──────────────────────────────────────────────────────────────────

const cd: LinuxCmd = {
  no: '03',
  cmd: 'cd',
  blurb: 'ĐỔI THƯ MỤC',
  // Tuyệt đối, không phải `src/api`. Không gõ được thì bấm hai lần là chuyện
  // thường, mà `cd src/api` lần hai đi tìm `src/api/src/api` và đỏ lên — đúng
  // như shell thật, nhưng ở đây nó đọc ra là thẻ hỏng chứ không ra bài học.
  // Chuyện "đường dẫn tương đối cộng dồn" để `mkdir -p` ở thẻ 04 dạy, chỗ đó
  // `-p` làm cho bấm lại vô hại.
  arg: '~/project/src/api',
  teach: `Đây là lệnh duy nhất trong mười cái đổi trạng thái mà không đổi file nào — và **mọi thẻ chạy sau nó đều tính từ chỗ mới**. Chạy thẻ này rồi quay lên bấm \`ls -la\` mà xem: cùng một lệnh, cùng một tham số \`.\`, ra danh sách khác.

\`~\` là thư mục nhà của bạn, nên \`~/project/src/api\` chỉ đúng một chỗ dù bạn đang đứng đâu. \`cd\` còn nhận \`..\` lùi một nấc và \`/\` lên tận gốc máy.`,
  run: (arg, st) => {
    const from = st.cwd
    const abs = resolve(st.cwd, arg)
    const node = lookup(st.root, abs)
    if (!node) return notFound(arg)
    if (!isDir(node)) return { kind: 'error', text: `${arg}: không phải thư mục` }
    st.cwd = abs
    return { kind: 'path', from, to: abs, entries: entriesOf(node) }
  },
}

// ── 04 mkdir -p ────────────────────────────────────────────────────────────

const mkdir: LinuxCmd = {
  no: '04',
  cmd: 'mkdir -p',
  blurb: 'TẠO CÂY THƯ MỤC',
  arg: 'v2/handlers',
  teach: `Không có \`-p\` thì \`mkdir v2/handlers\` báo lỗi vì \`v2\` chưa tồn tại — bạn phải tạo từng nấc một. \`-p\` tạo hết cả nhánh, **và** im lặng khi thư mục đã có sẵn. Vế thứ hai mới là lý do nó nằm trong mọi script cài đặt: chạy lại lần thứ hai không hỏng.

Tham số đây là đường dẫn **tương đối**. Chạy \`cd\` ở thẻ 03 trước rồi quay lại bấm cái này, nhánh mới mọc ở một chỗ khác hẳn.`,
  run: (arg, st) => {
    if (arg.trim() === '') return { kind: 'error', text: 'mkdir: thiếu tên thư mục' }
    const abs = resolve(st.cwd, arg)
    const { created, error } = mkdirp(st.root, abs)
    if (error) return { kind: 'error', text: error }
    const hits = new Set(created.length ? created : [abs])
    return {
      kind: 'tree',
      lines: branch(st.root, st.cwd, hits),
      hitLabel: 'mới',
      changed: created,
      note: created.length
        ? `tạo ${created.length} thư mục`
        : 'đã có sẵn — không tạo gì, cũng không báo lỗi',
    }
  },
}

// ── 05 grep -R ─────────────────────────────────────────────────────────────

const grep: LinuxCmd = {
  no: '05',
  cmd: 'grep -R',
  blurb: 'TÌM TRONG NỘI DUNG',
  arg: 'health',
  teach: `\`-R\` là đi xuống mọi thư mục con. Kết quả là \`file:dòng: nội dung\` — dán số đó vào editor là nhảy thẳng tới nơi. Đây là cách đọc một repo lạ nhanh nhất: tìm chuỗi bạn thấy trên màn hình, ra ngay chỗ sinh ra nó.

Ở đây khớp theo chuỗi con, phân biệt hoa thường. \`grep\` thật nhận cả biểu thức chính quy.`,
  run: (arg, st) => {
    if (arg.trim() === '') return { kind: 'error', text: 'grep: thiếu mẫu tìm' }
    const hits: Match[] = []
    let scanned = 0
    walk(st.root, st.cwd, (node, path) => {
      if (isDir(node)) return
      scanned++
      node.content!.split('\n').forEach((text, i) => {
        const at = text.indexOf(arg)
        if (at === -1) return
        hits.push({
          path: relative(st.cwd, path),
          line: i + 1,
          text,
          from: at,
          to: at + arg.length,
        })
      })
    })
    return { kind: 'matches', pattern: arg, scanned, hits }
  },
}

// ── 06 find ────────────────────────────────────────────────────────────────

const find: LinuxCmd = {
  no: '06',
  cmd: 'find . -name',
  blurb: 'TÌM THEO TÊN',
  arg: '*.ts',
  teach: `\`grep\` tìm trong ruột file, \`find\` tìm chính cái tên file. Hai việc khác nhau và người mới hay nhầm.

Dấu \`*\` khớp phần bất kỳ, \`?\` khớp đúng một ký tự. Ở shell thật phải bọc mẫu trong nháy — \`find . -name "*.ts"\` — không thì shell bung dấu sao trước khi \`find\` kịp nhìn thấy nó.`,
  run: (arg, st) => {
    if (arg.trim() === '') return { kind: 'error', text: 'find: thiếu mẫu tên' }
    const re = globToRe(arg.trim())
    const hits = new Set<string>()
    walk(st.root, st.cwd, (node, path) => {
      if (re.test(node.name)) hits.add(path)
    })
    if (hits.size === 0)
      return { kind: 'tree', lines: [], hitLabel: 'khớp', note: `không có gì khớp ${arg}` }
    return {
      kind: 'tree',
      lines: branch(st.root, st.cwd, hits),
      hitLabel: 'khớp',
      note: `${hits.size} kết quả`,
    }
  },
}

// ── 07 tail -f ─────────────────────────────────────────────────────────────

/** Dòng log mô phỏng đẩy thêm khi đang theo dõi. Lấy theo chỉ số chứ không phải
 *  ngẫu nhiên: bấm lại là thấy đúng chuỗi cũ, nên hai người nhìn hai màn hình
 *  vẫn đang nói về cùng một thứ. */
const FEED = [
  'GET /api/users 200 8ms',
  'POST /api/orders 201 41ms',
  'cache MISS users:7',
  'GET /api/orders 500 1204ms',
  'worker retry 1/3',
  'GET /health 200 1ms',
]

export const nextLogLine = (i: number): string => FEED[i % FEED.length]

const tail: LinuxCmd = {
  no: '07',
  cmd: 'tail -f',
  blurb: 'THEO DÕI LOG',
  arg: '~/project/logs/api.log',
  teach: `\`tail\` in mấy dòng cuối rồi thoát. \`-f\` là *follow*: nó **không** thoát, cứ nằm đó và in tiếp mỗi khi file dài thêm. Đây là cửa sổ bạn để mở bên cạnh trong lúc bấm thử — lỗi hiện ra ngay giây nó xảy ra, không phải sau khi bạn đi tìm.

Thoát bằng \`Ctrl-C\`.`,
  run: (arg, st) => {
    const abs = resolve(st.cwd, arg)
    const node = lookup(st.root, abs)
    if (!node) return notFound(arg)
    if (isDir(node)) return { kind: 'error', text: `${arg}: là thư mục` }
    const lines = node.content!.split('\n').filter((l) => l !== '')
    return { kind: 'stream', file: relative(st.cwd, abs), lines: lines.slice(-6) }
  },
}

// ── 08 chmod ───────────────────────────────────────────────────────────────

const chmod: LinuxCmd = {
  no: '08',
  cmd: 'chmod',
  blurb: 'ĐỔI QUYỀN',
  arg: '640 ~/project/.env',
  teach: `Ba chữ số là ba nhóm: **chủ sở hữu**, **nhóm**, **mọi người**. Mỗi chữ số cộng từ \`4\` đọc, \`2\` ghi, \`1\` chạy. Nên \`7 = 4+2+1\` là đủ cả ba, còn \`5 = 4+1\` là đọc và chạy nhưng không sửa được.

\`.env\` đang là \`600\` — chỉ mình chủ sở hữu đọc. Thẻ này đẩy nó lên \`640\`, tức là mở thêm cho **cả nhóm**. Nghe nhỏ, nhưng thứ nằm trong file đó là mật khẩu database. Hàng cuối vẫn tắt: \`0\` cho mọi người, nên nó chưa thành thứ cả máy đọc được — \`644\` mới là chỗ đó.`,
  run: (arg, st) => {
    const [mode, target, ...rest] = arg.trim().split(/\s+/)
    if (!mode || !target || rest.length)
      return { kind: 'error', text: 'chmod: cần đúng hai phần, ví dụ `644 README.md`' }
    if (!/^[0-7]{3}$/.test(mode))
      return { kind: 'error', text: `${mode}: quyền phải là ba chữ số từ 0 tới 7` }
    const abs = resolve(st.cwd, target)
    const node = lookup(st.root, abs)
    if (!node) return notFound(target)
    const before = node.mode
    node.mode = parseInt(mode, 8)
    return {
      kind: 'perms',
      file: relative(st.cwd, abs),
      before,
      after: node.mode,
      changed: [abs],
    }
  },
}

// ── 09 curl ────────────────────────────────────────────────────────────────

const ROUTES: Record<string, { status: number; body: string[] }> = {
  '/health': { status: 200, body: ['{', '  "status": "ok",', '  "uptime": "4h12m"', '}'] },
  '/api/users': { status: 200, body: ['[', '  { "id": 1, "name": "dev" }', ']'] },
  '/api/orders': { status: 500, body: ['{', '  "error": "db timeout"', '}'] },
}

const curl: LinuxCmd = {
  no: '09',
  cmd: 'curl',
  blurb: 'GỌI THỬ MỘT API',
  arg: 'http://localhost:3000/health',
  teach: `Trước khi đổ lỗi cho frontend, gọi thẳng API bằng \`curl\`. Nó bỏ qua trình duyệt, bỏ qua CORS, bỏ qua cache — cái nó trả về là cái server thật sự nói.

Ba chặng sáng lần lượt là ba chỗ có thể hỏng, và mã trả về nói hỏng ở chặng nào: **404** là server sống nhưng không có đường đó — bạn gõ sai URL. **500** là server nhận được rồi mới chết — lỗi nằm trong code của họ. Còn *không có mã nào cả* thì chặng thứ hai còn chưa tới: sai tên máy, hoặc chưa ai chạy server.`,
  run: (arg) => {
    const url = arg.trim()
    if (url === '') return { kind: 'error', text: 'curl: thiếu URL' }
    const bare = url.replace(/^https?:\/\//, '')
    const slash = bare.indexOf('/')
    const host = slash === -1 ? bare : bare.slice(0, slash)
    const path = slash === -1 ? '/' : bare.slice(slash)
    if (host === '') return { kind: 'error', text: `${url}: URL không có tên máy` }

    const route = ROUTES[path]
    const status = route?.status ?? 404
    const ok = status < 400
    return {
      kind: 'hops',
      hops: [
        { title: 'local', sub: 'terminal', state: 'ok' },
        { title: host, sub: path, state: ok ? 'ok' : 'fail' },
        { title: 'server', sub: `HTTP ${status}`, state: ok ? 'ok' : 'fail' },
      ],
      note: route
        ? `HTTP ${status} · content-type: application/json`
        : `HTTP 404 · không có đường ${path}`,
      body: route?.body ?? ['{', '  "error": "not found"', '}'],
    }
  },
}

// ── 10 ssh ─────────────────────────────────────────────────────────────────

const ssh: LinuxCmd = {
  no: '10',
  cmd: 'ssh',
  blurb: 'MỞ SHELL TỪ XA',
  arg: 'dev@server',
  teach: `Dạng là \`người-dùng@máy\`. Đăng nhập bằng **cặp khoá**, không phải mật khẩu: khoá riêng nằm ở máy bạn và không đi đâu cả, khoá công khai nằm ở máy chủ trong \`~/.ssh/authorized_keys\`.

Đây là thẻ duy nhất không mở được shell thật — mô phỏng dừng ở lúc bắt tay xong. Muốn gõ thật thì lab container có terminal thật.`,
  run: (arg) => {
    const at = arg.trim()
    const m = at.match(/^([\w.-]+)@([\w.-]+)$/)
    if (!m)
      return { kind: 'error', text: `${at || '(trống)'}: cần dạng người-dùng@máy` }
    const [, user, host] = m
    return {
      kind: 'hops',
      hops: [
        { title: 'local', sub: '~/.ssh/id_ed25519', state: 'ok' },
        { title: host, sub: '22/tcp', state: 'ok' },
        { title: 'shell', sub: `${user}@${host}`, state: 'ok' },
      ],
      note: 'khoá công khai khớp · phiên đã mở',
      body: [
        `Linux ${host} 6.6.0 x86_64`,
        'Lan dang nhap gan nhat: hom qua 21:04',
        '',
        `${user}@${host}:~$ `,
      ],
    }
  },
}

// ── Bộ mười lệnh ───────────────────────────────────────────────────────────

/** Chia nhóm theo *việc bạn đang làm*, không theo bảng chữ cái hay theo độ khó.
 *  Người mới không tra lệnh theo tên — họ tra theo "tôi đang muốn tìm một file". */
export const SECTIONS: LinuxSection[] = [
  { no: '01', title: 'ĐI LẠI', cmds: [pwd, ls] },
  { no: '02', title: 'CẤU TRÚC', cmds: [cd, mkdir] },
  { no: '03', title: 'TÌM KIẾM', cmds: [grep, find] },
  { no: '04', title: 'ĐIỀU KHIỂN', cmds: [tail, chmod] },
  { no: '05', title: 'KẾT NỐI', cmds: [curl, ssh] },
]

export const ALL_CMDS: LinuxCmd[] = SECTIONS.flatMap((s) => s.cmds)
