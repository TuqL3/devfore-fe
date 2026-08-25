// Run: npm run check
//
// Several things in this simulation break silently — the screen still looks
// fine: `grep` line numbers off by one, `..` at the root falling out of the
// tree, `mkdir -p` recreating a directory that already exists. Each one teaches
// the learner something false that nobody notices.
//
// ponytail: node asserts, no framework — same reason as sim.check.ts.
import assert from 'node:assert/strict'

import { HOME, START, lookup, mkdirp, modeString, resolve, seedFs } from './fs.ts'
import { ALL_CMDS, SECTIONS, globToRe, initState } from './commands.ts'
import type { LinuxCmd } from './commands.ts'

// `throw` rather than `assert.ok`: the app's tsconfig does not load
// `@types/node`, so TypeScript does not know `assert.ok` is an assertion
// function and everything after it stays `| undefined`. An `if` it understands.
const need = <T,>(v: T | null | undefined, what: string): T => {
  if (v === null || v === undefined) throw new Error(`missing ${what}`)
  return v
}

const cmd = (name: string): LinuxCmd =>
  need(
    ALL_CMDS.find((c) => c.cmd === name),
    `command ${name}`,
  )

// ── resolve ────────────────────────────────────────────────────────────────

assert.equal(resolve(START, 'src'), '/home/dev/project/src')
assert.equal(resolve(START, './src/'), '/home/dev/project/src')
assert.equal(resolve(START, '..'), '/home/dev')
assert.equal(resolve(START, '../..'), '/home')
assert.equal(resolve(START, '~'), HOME)
assert.equal(resolve(START, '~/project/src'), '/home/dev/project/src')
assert.equal(resolve(START, '/etc'), '/etc')
assert.equal(resolve(START, ''), START, 'an empty argument stays put, it does not go to the root')
// `..` at the root must stay at the root. Without that guard, `out.pop()` eats
// into an empty array and the next path is joined onto a root that does not exist.
assert.equal(resolve('/', '../../..'), '/')

// ── lookup ─────────────────────────────────────────────────────────────────

{
  const root = seedFs()
  assert.ok(lookup(root, START), 'the starting directory must exist')
  assert.equal(lookup(root, '/home/dev/project/README.md')?.name, 'README.md')
  assert.equal(lookup(root, '/home/dev/project/does-not-exist'), null)
  // Walking through a file yields nothing, rather than returning that file.
  assert.equal(lookup(root, '/home/dev/project/README.md/x'), null)
}

// ── mkdir -p ───────────────────────────────────────────────────────────────

{
  const root = seedFs()
  const first = mkdirp(root, '/home/dev/project/src/api/v2/handlers')
  assert.deepEqual(
    first.created,
    ['/home/dev/project/src/api/v2', '/home/dev/project/src/api/v2/handlers'],
    'reports only what was NEWLY created — `src` and `src/api` already existed',
  )
  // Second run: creates nothing, and no error either. This is exactly why `-p`
  // appears in every setup script.
  const again = mkdirp(root, '/home/dev/project/src/api/v2/handlers')
  assert.deepEqual(again.created, [])
  assert.equal(again.error, undefined)
  // Overwriting a file must be an error, not a silent swallow of that file.
  const clash = mkdirp(root, '/home/dev/project/README.md/x')
  assert.match(clash.error ?? '', /already exists/)
}

// ── grep -R ────────────────────────────────────────────────────────────────

{
  const st = initState()
  const got = cmd('grep -R').run('health', st)
  assert.equal(got.kind, 'matches')
  if (got.kind !== 'matches') throw new Error('unreachable')

  // Line numbers count from 1, like every editor and like real grep. Counting
  // from 0 means pasting the number into an editor lands one line off — the kind
  // of bug where the user blames themselves.
  const yaml = need(
    got.hits.find((h) => h.path === 'config/app.yaml'),
    'a match in config/app.yaml',
  )
  assert.equal(yaml.line, 3)
  assert.equal(yaml.text.slice(yaml.from, yaml.to), 'health')

  const route = need(
    got.hits.find((h) => h.path === 'src/api/v1/route.ts'),
    'a match in src/api/v1/route.ts',
  )
  assert.equal(route.line, 12)

  // Paths are relative to the current directory, exactly like `grep -R .`
  assert.ok(
    got.hits.every((h) => !h.path.startsWith('/')),
    'must not print absolute paths',
  )
  assert.ok(got.scanned > 0)

  // Case-sensitive: `HEALTH` does not match `health`.
  const upper = cmd('grep -R').run('HEALTH', st)
  assert.equal(upper.kind === 'matches' && upper.hits.length, 0)
}

// ── find ───────────────────────────────────────────────────────────────────

assert.ok(globToRe('*.ts').test('app.ts'))
assert.ok(!globToRe('*.ts').test('app.tsx'), 'the pattern is anchored at both ends, no partial match')
assert.ok(!globToRe('*.ts').test('appXts'), 'a dot in the pattern is a literal dot')
assert.ok(globToRe('app.?s').test('app.ts'))

{
  const st = initState()
  const got = cmd('find . -name').run('*.ts', st)
  assert.equal(got.kind, 'tree')
  if (got.kind !== 'tree') throw new Error('unreachable')
  const hits = got.lines.filter((l) => l.hit).map((l) => l.name)
  assert.deepEqual(hits.sort(), ['app.ts', 'route.ts'])
  // The tree must include the branch leading to each result, not just loose leaves.
  assert.ok(got.lines.some((l) => l.name === 'api' && !l.hit))
}

// ── cd, and the shared state ───────────────────────────────────────────────

{
  const st = initState()
  assert.equal(st.cwd, START)
  cmd('cd').run('src/api', st)
  assert.equal(st.cwd, '/home/dev/project/src/api')

  // The other commands must see the new place. If every card kept its own state
  // this would be ten illustrations, not one simulation.
  const listed = cmd('ls -la').run('.', st)
  assert.equal(listed.kind === 'list' && listed.rows[0].name, 'v1')

  cmd('cd').run('..', st)
  assert.equal(st.cwd, '/home/dev/project/src')

  // `cd` into a file is an error, and the current directory must NOT change.
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
  assert.ok(names.includes('.env'), '-a must show hidden files too')
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
  // It really changes the tree, not just the drawing.
  const node = need(lookup(st.root, '/home/dev/project/README.md'), 'README.md')
  assert.equal(modeString(node), '-rw-------')

  assert.equal(cmd('chmod').run('999 README.md', st).kind, 'error')
  assert.equal(cmd('chmod').run('644', st).kind, 'error', 'a missing file name is an error')
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

  const missing = cmd('curl').run('http://localhost:3000/no-such-route', st)
  assert.equal(missing.kind === 'hops' && missing.note.includes('404'), true)
  assert.equal(
    missing.kind === 'hops' && missing.hops.at(-1)?.state,
    'fail',
    'the last hop must be red on a 404 — otherwise broken and working look the same',
  )

  // A 500 is a broken server, and must still be red.
  const boom = cmd('curl').run('http://localhost:3000/api/orders', st)
  assert.equal(boom.kind === 'hops' && boom.hops.at(-1)?.state, 'fail')

  assert.equal(cmd('ssh').run('dev@server', st).kind, 'hops')
  assert.equal(cmd('ssh').run('server', st).kind, 'error', 'missing user@')
}

// ── the command set ────────────────────────────────────────────────────────

assert.equal(ALL_CMDS.length, 10, 'the title says ten commands')
assert.deepEqual(
  ALL_CMDS.map((c) => c.no),
  ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'],
  'the numbers must be contiguous and in display order',
)
// Every fixed argument must work from the starting directory.
for (const c of ALL_CMDS) {
  const st = initState()
  const got = c.run(c.arg ?? '', st)
  assert.notEqual(got.kind, 'error', `${c.cmd} ${c.arg ?? ''} → error`)
}

// ...and must work AFTER a `cd` too. Since nothing is typeable, the user cannot
// fix the argument: a card turning red merely because they pressed card 03 is a
// broken card, not a lesson. Commands pointing at one specific file therefore use
// absolute paths; the exceptions are `cd`, `mkdir -p` and `ls` — relative paths
// ARE what they teach, and they stay valid in every directory.
for (const to of ['src/api', '/', '~']) {
  for (const c of ALL_CMDS) {
    const st = initState()
    cmd('cd').run(to, st)
    const got = c.run(c.arg ?? '', st)
    assert.notEqual(got.kind, 'error', `after \`cd ${to}\`: ${c.cmd} ${c.arg ?? ''} → error`)
  }
}

// ── `changed`: what the live tree panel paints from ─────────────────────────
//
// Getting this wrong highlights the wrong node — the kind of break that still
// looks like it works. Three rules: correct absolute path, the node must really
// exist, and a command that changes NOTHING must declare nothing.
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
    assert.ok(lookup(st.root, p), `${p} must really exist in the tree`)
  }
  // Second run: nothing created, so nothing painted.
  const again = cmd('mkdir -p').run('v2/handlers', st)
  assert.deepEqual(again.kind === 'tree' && again.changed, [])

  const perm = cmd('chmod').run('640 ~/project/.env', st)
  assert.equal(perm.kind, 'perms')
  if (perm.kind !== 'perms') throw new Error('unreachable')
  assert.deepEqual(perm.changed, ['/home/dev/project/.env'])
  assert.ok(lookup(st.root, perm.changed[0]))

  // `find` also returns a `tree` but touches nothing — declaring `changed` here
  // would paint search results exactly like something just created.
  const found = cmd('find . -name').run('*.ts', st)
  assert.equal(found.kind === 'tree' && (found.changed?.length ?? 0), 0)
}

assert.equal(SECTIONS.length, 5)

console.log('linux.check: ok')
