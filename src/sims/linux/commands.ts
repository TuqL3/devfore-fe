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
  text: `${p}: no such file or directory`,
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
  blurb: 'WHERE AM I',
  teach: `Every relative path you type is measured from here. Run \`npm test\` in the wrong directory and the error says nothing about directories — it says package.json was not found, and you go looking in the wrong place. \`pwd\` is the cheapest answer to "why can this command not see my file".`,
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
  blurb: 'LIST EVERYTHING',
  arg: '.',
  teach: `\`-a\` is *all*: it shows files starting with a dot too. Bare \`ls\` hides \`.env\` and \`.git\` — the two things most likely to be the cause of whatever you are debugging. \`-l\` is *long*: one file per line, with permissions and size. That permission column is exactly what \`chmod\` on card 08 changes.`,
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
  blurb: 'CHANGE DIRECTORY',
  // Tuyệt đối, không phải `src/api`. Không gõ được thì bấm hai lần là chuyện
  // thường, mà `cd src/api` lần hai đi tìm `src/api/src/api` và đỏ lên — đúng
  // như shell thật, nhưng ở đây nó đọc ra là thẻ hỏng chứ không ra bài học.
  // Chuyện "đường dẫn tương đối cộng dồn" để `mkdir -p` ở thẻ 04 dạy, chỗ đó
  // `-p` làm cho bấm lại vô hại.
  arg: '~/project/src/api',
  teach: `This is the only one of the ten that changes state without changing a file — and **every card run after it is measured from the new place**. Run this card, then go back up and press \`ls -la\`: same command, same \`.\` argument, a different listing.

\`~\` is your home directory, so \`~/project/src/api\` names exactly one place no matter where you are standing. \`cd\` also takes \`..\` to go up one level and \`/\` to go to the root of the machine.`,
  run: (arg, st) => {
    const from = st.cwd
    const abs = resolve(st.cwd, arg)
    const node = lookup(st.root, abs)
    if (!node) return notFound(arg)
    if (!isDir(node)) return { kind: 'error', text: `${arg}: not a directory` }
    st.cwd = abs
    return { kind: 'path', from, to: abs, entries: entriesOf(node) }
  },
}

// ── 04 mkdir -p ────────────────────────────────────────────────────────────

const mkdir: LinuxCmd = {
  no: '04',
  cmd: 'mkdir -p',
  blurb: 'BUILD A DIRECTORY TREE',
  arg: 'v2/handlers',
  teach: `Without \`-p\`, \`mkdir v2/handlers\` fails because \`v2\` does not exist yet — you have to create each level by hand. \`-p\` creates the whole branch, **and** stays quiet when the directory is already there. That second half is why it appears in every setup script: running it a second time does not break.

The argument here is a **relative** path. Run \`cd\` on card 03 first, then come back and press this one, and the new branch grows somewhere else entirely.`,
  run: (arg, st) => {
    if (arg.trim() === '') return { kind: 'error', text: 'mkdir: missing directory name' }
    const abs = resolve(st.cwd, arg)
    const { created, error } = mkdirp(st.root, abs)
    if (error) return { kind: 'error', text: error }
    const hits = new Set(created.length ? created : [abs])
    return {
      kind: 'tree',
      lines: branch(st.root, st.cwd, hits),
      hitLabel: 'new',
      changed: created,
      note: created.length
        ? `created ${created.length} directories`
        : 'already there — nothing created, and no error either',
    }
  },
}

// ── 05 grep -R ─────────────────────────────────────────────────────────────

const grep: LinuxCmd = {
  no: '05',
  cmd: 'grep -R',
  blurb: 'SEARCH FILE CONTENTS',
  arg: 'health',
  teach: `\`-R\` means descend into every subdirectory. The output is \`file:line: content\` — paste that into an editor and it jumps straight there. This is the fastest way to read an unfamiliar repository: search for a string you saw on screen and land on the code that produced it.

Here it matches substrings, case-sensitively. Real \`grep\` takes regular expressions too.`,
  run: (arg, st) => {
    if (arg.trim() === '') return { kind: 'error', text: 'grep: missing search pattern' }
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
  blurb: 'SEARCH BY NAME',
  arg: '*.ts',
  teach: `\`grep\` searches inside files, \`find\` searches the file names themselves. Two different jobs, and a common beginner mix-up.

\`*\` matches any run of characters, \`?\` matches exactly one. In a real shell the pattern has to be quoted — \`find . -name "*.ts"\` — otherwise the shell expands the star before \`find\` ever sees it.`,
  run: (arg, st) => {
    if (arg.trim() === '') return { kind: 'error', text: 'find: missing name pattern' }
    const re = globToRe(arg.trim())
    const hits = new Set<string>()
    walk(st.root, st.cwd, (node, path) => {
      if (re.test(node.name)) hits.add(path)
    })
    if (hits.size === 0)
      return { kind: 'tree', lines: [], hitLabel: 'match', note: `nothing matches ${arg}` }
    return {
      kind: 'tree',
      lines: branch(st.root, st.cwd, hits),
      hitLabel: 'match',
      note: `${hits.size} results`,
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
  blurb: 'FOLLOW A LOG',
  arg: '~/project/logs/api.log',
  teach: `\`tail\` prints the last few lines and exits. \`-f\` is *follow*: it does **not** exit, it sits there and keeps printing every time the file grows. This is the window you leave open beside you while clicking through — the error shows up the second it happens, not after you go looking for it.

Quit with \`Ctrl-C\`.`,
  run: (arg, st) => {
    const abs = resolve(st.cwd, arg)
    const node = lookup(st.root, abs)
    if (!node) return notFound(arg)
    if (isDir(node)) return { kind: 'error', text: `${arg}: is a directory` }
    const lines = node.content!.split('\n').filter((l) => l !== '')
    return { kind: 'stream', file: relative(st.cwd, abs), lines: lines.slice(-6) }
  },
}

// ── 08 chmod ───────────────────────────────────────────────────────────────

const chmod: LinuxCmd = {
  no: '08',
  cmd: 'chmod',
  blurb: 'CHANGE PERMISSIONS',
  arg: '640 ~/project/.env',
  teach: `The three digits are three groups: **owner**, **group**, **everyone**. Each digit adds up from \`4\` read, \`2\` write, \`1\` execute. So \`7 = 4+2+1\` is all three, while \`5 = 4+1\` is read and execute but no writing.

\`.env\` is currently \`600\` — owner-only read. This card pushes it to \`640\`, which opens it to **the whole group** as well. That sounds small, but what is inside that file is the database password. The last slot is still off: \`0\` for everyone, so it has not yet become machine-wide readable — \`644\` is where that happens.`,
  run: (arg, st) => {
    const [mode, target, ...rest] = arg.trim().split(/\s+/)
    if (!mode || !target || rest.length)
      return { kind: 'error', text: 'chmod: needs exactly two parts, e.g. `644 README.md`' }
    if (!/^[0-7]{3}$/.test(mode))
      return { kind: 'error', text: `${mode}: mode must be three digits from 0 to 7` }
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
  blurb: 'CALL AN API',
  arg: 'http://localhost:3000/health',
  teach: `Before blaming the frontend, call the API directly with \`curl\`. It skips the browser, skips CORS, skips the cache — what comes back is what the server actually says.

The three hops lighting up in turn are three places it can break, and the status code says which one: **404** means the server is alive but has no such route — you typed the URL wrong. **500** means the server received it and then died — the bug is in their code. And *no status code at all* means the second hop was never reached: wrong hostname, or nobody is running the server.`,
  run: (arg) => {
    const url = arg.trim()
    if (url === '') return { kind: 'error', text: 'curl: missing URL' }
    const bare = url.replace(/^https?:\/\//, '')
    const slash = bare.indexOf('/')
    const host = slash === -1 ? bare : bare.slice(0, slash)
    const path = slash === -1 ? '/' : bare.slice(slash)
    if (host === '') return { kind: 'error', text: `${url}: URL has no host` }

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
        : `HTTP 404 · no route ${path}`,
      body: route?.body ?? ['{', '  "error": "not found"', '}'],
    }
  },
}

// ── 10 ssh ─────────────────────────────────────────────────────────────────

const ssh: LinuxCmd = {
  no: '10',
  cmd: 'ssh',
  blurb: 'OPEN A REMOTE SHELL',
  arg: 'dev@server',
  teach: `The form is \`user@host\`. You sign in with a **key pair**, not a password: the private key stays on your machine and goes nowhere, the public key sits on the server in \`~/.ssh/authorized_keys\`.

This is the one card that cannot open a real shell — the simulation stops once the handshake completes. To type for real, the container lab has an actual terminal.`,
  run: (arg) => {
    const at = arg.trim()
    const m = at.match(/^([\w.-]+)@([\w.-]+)$/)
    if (!m)
      return { kind: 'error', text: `${at || '(empty)'}: expected the form user@host` }
    const [, user, host] = m
    return {
      kind: 'hops',
      hops: [
        { title: 'local', sub: '~/.ssh/id_ed25519', state: 'ok' },
        { title: host, sub: '22/tcp', state: 'ok' },
        { title: 'shell', sub: `${user}@${host}`, state: 'ok' },
      ],
      note: 'public key accepted · session open',
      body: [
        `Linux ${host} 6.6.0 x86_64`,
        'Last login: yesterday at 21:04',
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
  { no: '01', title: 'GETTING AROUND', cmds: [pwd, ls] },
  { no: '02', title: 'STRUCTURE', cmds: [cd, mkdir] },
  { no: '03', title: 'SEARCHING', cmds: [grep, find] },
  { no: '04', title: 'CONTROL', cmds: [tail, chmod] },
  { no: '05', title: 'CONNECTING', cmds: [curl, ssh] },
]

export const ALL_CMDS: LinuxCmd[] = SECTIONS.flatMap((s) => s.cmds)
