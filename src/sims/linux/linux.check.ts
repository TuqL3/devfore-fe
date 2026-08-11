// Chạy: npm run check
//
// Mấy chỗ trong mô phỏng này sai một cách âm thầm — nhìn màn hình vẫn thấy đẹp:
// số dòng của `grep` lệch một, `..` ở gốc rơi ra ngoài cây, `mkdir -p` tạo lại
// thư mục đã có. Cái nào cũng dạy người học một điều sai mà không ai nhận ra.
//
// ponytail: assert của node, không framework — cùng lý do với sim.check.ts.
import assert from 'node:assert/strict'

import { HOME, START, lookup, mkdirp, modeString, resolve, seedFs } from './fs.ts'
import { ALL_CMDS, SECTIONS, globToRe, initState } from './commands.ts'
import type { LinuxCmd } from './commands.ts'

// `throw` chứ không phải `assert.ok`: tsconfig của app không nạp `@types/node`,
// nên TypeScript không biết `assert.ok` là hàm khẳng định và mọi thứ sau nó vẫn
// mang kiểu `| undefined`. Một câu `if` thì nó hiểu.
const need = <T,>(v: T | null | undefined, what: string): T => {
  if (v === null || v === undefined) throw new Error(`thiếu ${what}`)
  return v
}

const cmd = (name: string): LinuxCmd =>
  need(
    ALL_CMDS.find((c) => c.cmd === name),
    `lệnh ${name}`,
  )

// ── resolve ────────────────────────────────────────────────────────────────

assert.equal(resolve(START, 'src'), '/home/dev/project/src')
assert.equal(resolve(START, './src/'), '/home/dev/project/src')
assert.equal(resolve(START, '..'), '/home/dev')
assert.equal(resolve(START, '../..'), '/home')
assert.equal(resolve(START, '~'), HOME)
assert.equal(resolve(START, '~/project/src'), '/home/dev/project/src')
assert.equal(resolve(START, '/etc'), '/etc')
assert.equal(resolve(START, ''), START, 'tham số trống là đứng yên, không phải về gốc')
// `..` ở gốc phải đứng lại ở gốc. Không chặn thì `out.pop()` ăn vào mảng rỗng và
// đường dẫn tiếp theo được ghép lên một cái gốc không tồn tại.
assert.equal(resolve('/', '../../..'), '/')

// ── lookup ─────────────────────────────────────────────────────────────────

{
  const root = seedFs()
  assert.ok(lookup(root, START), 'thư mục khởi đầu phải có thật')
  assert.equal(lookup(root, '/home/dev/project/README.md')?.name, 'README.md')
  assert.equal(lookup(root, '/home/dev/project/khong-co'), null)
  // Đi xuyên qua một file thì không có gì cả, không phải trả về chính file đó.
  assert.equal(lookup(root, '/home/dev/project/README.md/x'), null)
}

// ── mkdir -p ───────────────────────────────────────────────────────────────

{
  const root = seedFs()
  const first = mkdirp(root, '/home/dev/project/src/api/v2/handlers')
  assert.deepEqual(
    first.created,
    ['/home/dev/project/src/api/v2', '/home/dev/project/src/api/v2/handlers'],
    'chỉ báo phần MỚI tạo — `src` và `src/api` đã có sẵn',
  )
  // Chạy lần hai: không tạo gì, cũng không lỗi. Đây chính là lý do `-p` nằm
  // trong mọi script cài đặt.
  const again = mkdirp(root, '/home/dev/project/src/api/v2/handlers')
  assert.deepEqual(again.created, [])
  assert.equal(again.error, undefined)
  // Đè lên một file thì phải là lỗi, không phải im lặng nuốt mất file đó.
  const clash = mkdirp(root, '/home/dev/project/README.md/x')
  assert.match(clash.error ?? '', /trùng tên/)
}

// ── grep -R ────────────────────────────────────────────────────────────────

{
  const st = initState()
  const got = cmd('grep -R').run('health', st)
  assert.equal(got.kind, 'matches')
  if (got.kind !== 'matches') throw new Error('unreachable')

  // Số dòng đếm từ 1, như mọi editor và như grep thật. Đếm từ 0 thì dán số vào
  // editor là nhảy lệch một dòng — sai kiểu người dùng tự trách mình.
  const yaml = need(
    got.hits.find((h) => h.path === 'config/app.yaml'),
    'khớp trong config/app.yaml',
  )
  assert.equal(yaml.line, 3)
  assert.equal(yaml.text.slice(yaml.from, yaml.to), 'health')

  const route = need(
    got.hits.find((h) => h.path === 'src/api/v1/route.ts'),
    'khớp trong src/api/v1/route.ts',
  )
  assert.equal(route.line, 12)

  // Đường dẫn là tương đối so với thư mục hiện hành, đúng như `grep -R .`
  assert.ok(
    got.hits.every((h) => !h.path.startsWith('/')),
    'không in đường dẫn tuyệt đối',
  )
  assert.ok(got.scanned > 0)

  // Phân biệt hoa thường: `HEALTH` không khớp `health`.
  const upper = cmd('grep -R').run('HEALTH', st)
  assert.equal(upper.kind === 'matches' && upper.hits.length, 0)
}

// ── find ───────────────────────────────────────────────────────────────────

assert.ok(globToRe('*.ts').test('app.ts'))
assert.ok(!globToRe('*.ts').test('app.tsx'), 'mẫu neo hai đầu, không khớp một phần')
assert.ok(!globToRe('*.ts').test('appXts'), 'dấu chấm trong mẫu là dấu chấm thật')
assert.ok(globToRe('app.?s').test('app.ts'))

{
  const st = initState()
  const got = cmd('find . -name').run('*.ts', st)
  assert.equal(got.kind, 'tree')
  if (got.kind !== 'tree') throw new Error('unreachable')
  const hits = got.lines.filter((l) => l.hit).map((l) => l.name)
  assert.deepEqual(hits.sort(), ['app.ts', 'route.ts'])
  // Cây phải gồm cả nhánh dẫn tới kết quả, không chỉ mấy cái lá lơ lửng.
  assert.ok(got.lines.some((l) => l.name === 'api' && !l.hit))
}

// ── cd, và trạng thái dùng chung ───────────────────────────────────────────

{
  const st = initState()
  assert.equal(st.cwd, START)
  cmd('cd').run('src/api', st)
  assert.equal(st.cwd, '/home/dev/project/src/api')

  // Lệnh khác phải nhìn thấy chỗ mới. Mỗi thẻ giữ trạng thái riêng thì đây là
  // mười cái ảnh minh hoạ, không phải một mô phỏng.
  const listed = cmd('ls -la').run('.', st)
  assert.equal(listed.kind === 'list' && listed.rows[0].name, 'v1')

  cmd('cd').run('..', st)
  assert.equal(st.cwd, '/home/dev/project/src')

  // `cd` vào một file là lỗi, và thư mục hiện hành KHÔNG được đổi.
  const bad = cmd('cd').run('app.ts', st)
  assert.equal(bad.kind, 'error')
  assert.equal(st.cwd, '/home/dev/project/src')
}

// ── ls -la ─────────────────────────────────────────────────────────────────

{
  const st = initState()
  const got = cmd('ls -la').run('.', st)
  assert.equal(got.kind, 'list')
  if (got.kind !== 'list') throw new Error('unreachable')
  const names = got.rows.map((r) => r.name)
  assert.ok(names.includes('.env'), '-a phải hiện cả file ẩn')
  assert.ok(names.includes('.git'))
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)))
  assert.equal(got.rows.find((r) => r.name === '.env')?.mode, '-rw-------')
  assert.equal(got.rows.find((r) => r.name === 'src')?.mode, 'drwxr-xr-x')
}

// ── chmod ──────────────────────────────────────────────────────────────────

{
  const st = initState()
  const got = cmd('chmod').run('600 README.md', st)
  assert.equal(got.kind, 'perms')
  if (got.kind !== 'perms') throw new Error('unreachable')
  assert.equal(got.before, 0o644)
  assert.equal(got.after, 0o600)
  // Đổi thật vào cây, không phải chỉ vẽ ra.
  const node = need(lookup(st.root, '/home/dev/project/README.md'), 'README.md')
  assert.equal(modeString(node), '-rw-------')

  assert.equal(cmd('chmod').run('999 README.md', st).kind, 'error')
  assert.equal(cmd('chmod').run('644', st).kind, 'error', 'thiếu tên file là lỗi')
  assert.equal(cmd('chmod').run('644 a b', st).kind, 'error')
}

// ── curl, ssh ──────────────────────────────────────────────────────────────

{
  const st = initState()
  const ok = cmd('curl').run('http://localhost:3000/health', st)
  assert.equal(ok.kind, 'hops')
  if (ok.kind !== 'hops') throw new Error('unreachable')
  assert.ok(ok.hops.every((h) => h.state === 'ok'))
  assert.match(ok.note, /HTTP 200/)

  const missing = cmd('curl').run('http://localhost:3000/khong-co', st)
  assert.equal(missing.kind === 'hops' && missing.note.includes('404'), true)
  assert.equal(
    missing.kind === 'hops' && missing.hops.at(-1)?.state,
    'fail',
    'chặng cuối phải đỏ khi 404 — nếu không thì hỏng và không hỏng trông giống nhau',
  )

  // 500 là server hỏng, vẫn phải đỏ.
  const boom = cmd('curl').run('http://localhost:3000/api/orders', st)
  assert.equal(boom.kind === 'hops' && boom.hops.at(-1)?.state, 'fail')

  assert.equal(cmd('ssh').run('dev@server', st).kind, 'hops')
  assert.equal(cmd('ssh').run('server', st).kind, 'error', 'thiếu người-dùng@')
}

// ── bộ lệnh ────────────────────────────────────────────────────────────────

assert.equal(ALL_CMDS.length, 10, 'tiêu đề nói mười lệnh')
assert.deepEqual(
  ALL_CMDS.map((c) => c.no),
  ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'],
  'số thứ tự phải liền và đúng thứ tự hiện ra',
)
// Mọi tham số cố định phải chạy được từ chỗ xuất phát.
for (const c of ALL_CMDS) {
  const st = initState()
  const got = c.run(c.arg ?? '', st)
  assert.notEqual(got.kind, 'error', `${c.cmd} ${c.arg ?? ''} → lỗi`)
}

// ...và phải chạy được cả SAU KHI `cd`. Không gõ được thì người dùng không sửa
// tham số lại được: một thẻ đỏ lên chỉ vì họ vừa bấm thẻ 03 là thẻ hỏng, không
// phải bài học. Mấy lệnh trỏ tới một file cụ thể vì thế dùng đường dẫn tuyệt
// đối; ngoại lệ là `cd`, `mkdir -p` và `ls` — đường dẫn tương đối CHÍNH LÀ thứ
// chúng dạy, và chúng vẫn hợp lệ ở mọi thư mục.
for (const to of ['src/api', '/', '~']) {
  for (const c of ALL_CMDS) {
    const st = initState()
    cmd('cd').run(to, st)
    const got = c.run(c.arg ?? '', st)
    assert.notEqual(got.kind, 'error', `sau \`cd ${to}\`: ${c.cmd} ${c.arg ?? ''} → lỗi`)
  }
}

// ── `changed`: cái bảng cây sống dùng để tô ─────────────────────────────────
//
// Sai chỗ này là tô sáng nhầm node — hỏng theo kiểu trông vẫn chạy. Ba luật:
// đúng đường dẫn tuyệt đối, node đó phải có thật, và lệnh KHÔNG sửa gì thì
// không được khai gì.
{
  const st = initState()
  const made = cmd('mkdir -p').run('v2/handlers', st)
  assert.equal(made.kind, 'tree')
  if (made.kind !== 'tree') throw new Error('unreachable')
  assert.deepEqual(made.changed, [
    '/home/dev/project/v2',
    '/home/dev/project/v2/handlers',
  ])
  for (const p of made.changed ?? []) {
    assert.ok(lookup(st.root, p), `${p} phải có thật trong cây`)
  }
  // Chạy lại: không tạo gì thì không tô gì.
  const again = cmd('mkdir -p').run('v2/handlers', st)
  assert.deepEqual(again.kind === 'tree' && again.changed, [])

  const perm = cmd('chmod').run('640 ~/project/.env', st)
  assert.equal(perm.kind, 'perms')
  if (perm.kind !== 'perms') throw new Error('unreachable')
  assert.deepEqual(perm.changed, ['/home/dev/project/.env'])
  assert.ok(lookup(st.root, perm.changed[0]))

  // `find` cũng trả về `tree` nhưng không đụng vào cây — khai `changed` ở đây là
  // tô sáng kết quả tìm kiếm y như thứ vừa được tạo ra.
  const found = cmd('find . -name').run('*.ts', st)
  assert.equal(found.kind === 'tree' && (found.changed?.length ?? 0), 0)
}

assert.equal(SECTIONS.length, 5)

console.log('linux.check: ok')
