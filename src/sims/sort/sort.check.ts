// Run: npm run check
//
// All four algorithms must produce **the same sorted array**, from all four
// starting arrangements. The whole simulation rests on exactly that: if they
// returned different results, the two-column scoreboard would be comparing two
// different jobs rather than one job done four ways. An off-by-one in quicksort
// is the kind of bug you cannot see — it still returns an array, it still draws
// a pretty picture, only two slots sit in the wrong place.
//
// The second group of invariants belongs to the renderer: a frame that declares
// "these two slots are being compared" must have both inside the active range,
// and a slot declared "settled" must already hold its final value. Getting that
// wrong means the simulation paints a slot green that will still be moved —
// still runs, still pretty, teaches the wrong thing.
//
// ponytail: node asserts, no framework — same reason as search.check.ts.
import assert from 'node:assert/strict'

import { ALGOS, DEFAULT_LAYOUT, LAYOUTS, N, layoutOf, scoreboard } from './algos.ts'

// ── The four starting arrangements ─────────────────────────────────────────

const inversions = (a: number[]) => {
  let k = 0
  for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (a[i] > a[j]) k++
  return k
}
const MAX_INV = (N * (N - 1)) / 2

for (const l of LAYOUTS) {
  const a = l.make()
  assert.equal(a.length, N, `${l.id}: must have ${N} slots`)
  assert.deepEqual(
    [...a].sort((x, y) => x - y),
    Array.from({ length: N }, (_, i) => i + 1),
    `${l.id}: must be a permutation of 1..${N} — equal-height bars make it impossible to see which slot went where`,
  )
  // Two calls must return the same array. Let `Math.random` in here and the
  // scoreboard printed in the guide is wrong on the very next page load.
  assert.deepEqual(l.make(), a, `${l.id}: not deterministic`)
}

assert.equal(inversions(layoutOf('sorted').make()), 0)
assert.equal(inversions(layoutOf('reversed').make()), MAX_INV)
assert.equal(
  inversions(layoutOf('nearly-sorted').make()),
  3,
  'nearly sorted must have exactly three broken spots — more than that and insertion stops "barely working"',
)
{
  // The random arrangement has to be genuinely shuffled. A shuffle that lands
  // near-sorted loses the average case, and all four scoreboard rows converge.
  const inv = inversions(layoutOf('random').make())
  assert.ok(
    inv > MAX_INV * 0.3 && inv < MAX_INV * 0.7,
    `the random arrangement has ${inv}/${MAX_INV} inversions — too close to one end, shuffle again`,
  )
}

assert.ok(LAYOUTS.some((l) => l.id === DEFAULT_LAYOUT))

// ── All four must sort correctly, from all four arrangements ───────────────

const want = Array.from({ length: N }, (_, i) => i + 1)

for (const layout of LAYOUTS) {
  const input = layout.make()
  for (const a of ALGOS) {
    const where = `${a.cmd} from the "${layout.name}" arrangement`
    const t = a.run(input)
    const last = t.frames[t.frames.length - 1]

    assert.ok(t.frames.length > 0, `${where}: no frames at all`)
    assert.deepEqual(last.a, want, `${where}: the final array is not sorted`)
    assert.deepEqual(input, layout.make(), `${where}: mutated the caller's original array`)
    assert.equal(last.done.length, N, `${where}: finished with slots still unsettled`)

    // Infinite-loop ceiling: O(n²) comparisons is the real upper bound for all
    // four, and each comparison drags along at most a few lines of code.
    assert.ok(t.comparisons <= N * N, `${where}: ${t.comparisons} comparisons, far too many`)
    assert.ok(t.frames.length <= N * N * 6, `${where}: ${t.frames.length} frames, far too many`)
    assert.equal(t.comparisons, last.cmpSoFar, `${where}: comparison counter disagrees with the last frame`)
    assert.equal(t.writes, last.writeSoFar, `${where}: write counter disagrees with the last frame`)

    let cmpSeen = 0
    let writeSeen = 0
    for (const f of t.frames) {
      cmpSeen += f.cmp ? 1 : 0
      writeSeen += f.wrote.length
      const at = `${where}, frame on line ${f.line}`

      assert.ok(
        f.line >= 1 && f.line <= a.code.length,
        `${at}: no such line in ${a.file} (${a.code.length} lines)`,
      )
      assert.equal(f.a.length, N, `${at}: array snapshot has the wrong size`)
      assert.equal(f.cmpSoFar, cmpSeen, `${at}: running comparison count is off`)
      assert.equal(f.writeSoFar, writeSeen, `${at}: running write count is off`)

      // An EMPTY range is allowed — `lo = hi + 1` is a real state when there is
      // nothing left to examine. Emptier than one slot is an arithmetic bug,
      // not a state.
      assert.ok(f.lo <= f.hi + 1, `${at}: range [${f.lo}..${f.hi}] is more than one slot empty`)
      assert.ok(
        f.lo >= 0 && f.lo <= N && f.hi >= -1 && f.hi < N,
        `${at}: range [${f.lo}..${f.hi}] runs outside the array`,
      )

      for (const i of f.cmp ?? []) {
        assert.ok(
          i >= f.lo && i <= f.hi,
          `${at}: compared slot (${i}) sits outside the range [${f.lo}..${f.hi}] — the renderer ` +
            'would light up a slot inside the dimmed region, an instantly visible bug',
        )
      }
      for (const i of f.wrote) {
        assert.ok(i >= f.lo && i <= f.hi, `${at}: wrote to slot ${i} outside the active range`)
      }
      if (f.pivot !== null) {
        assert.ok(f.pivot >= f.lo && f.pivot <= f.hi, `${at}: pivot ${f.pivot} outside the range`)
      }

      // A settled slot must already hold its final value. This is the strictest
      // guard in the file: `done` is what gets painted green, and painting a
      // slot green that will still be moved teaches the wrong thing — and the
      // eye cannot catch it, because the array still ends up correctly sorted.
      for (const i of f.done) {
        assert.equal(f.a[i], want[i], `${at}: slot ${i} claims to be settled but holds the wrong value`)
      }
      // And a settled slot must never be written again.
      for (const i of f.wrote) {
        assert.ok(!f.done.includes(i), `${at}: wrote to slot ${i}, which was declared settled`)
      }
    }
  }
}

// ── Each algorithm must keep its own promise ───────────────────────────────
//
// The numbers quoted in the lesson text have to be true, not just well phrased.

const runOn = (layoutId: string) => {
  const data = layoutOf(layoutId).make()
  const rows = scoreboard(data)
  const by = (no: string) => rows.find((r) => r.no === no)!
  return { bubble: by('01'), insert: by('02'), select: by('03'), quick: by('04') }
}

const ALL_PAIRS = (N * (N - 1)) / 2

{
  // Selection: the comparison count is constant, on EVERY arrangement. That is
  // its entire lesson, and the one scoreboard row that never moves.
  const counts = new Set(LAYOUTS.map((l) => runOn(l.id).select.comparisons))
  assert.equal(counts.size, 1, `selection must always cost the same, currently ${[...counts]}`)
  assert.equal([...counts][0], ALL_PAIRS, `selection must compare exactly ${ALL_PAIRS} pairs`)
  // ...and write the least, on every arrangement. That number is why it is
  // still used.
  for (const l of LAYOUTS) {
    const r = runOn(l.id)
    assert.ok(
      r.select.writes <= Math.min(r.bubble.writes, r.insert.writes, r.quick.writes),
      `"${l.name}" arrangement: selection writes ${r.select.writes}, no longer the fewest`,
    )
    assert.ok(r.select.writes <= 2 * (N - 1), `"${l.name}" arrangement: selection writes more than ${2 * (N - 1)}`)
  }
}

{
  // Bubble on a sorted array: stops after exactly one pass, writes nothing.
  // Without the `swapped` flag it would still sweep all 276 pairs — and the
  // `return` line would never light up.
  const r = runOn('sorted')
  assert.equal(r.bubble.comparisons, N - 1, 'bubble must stop after a single pass')
  assert.equal(r.bubble.writes, 0, 'bubble must not write anything on a sorted array')
}

{
  // Insertion on a nearly-sorted array: close to linear. If this number drifts
  // up toward n², the "nearly sorted" arrangement has been broken in too many
  // places and the lesson disappears.
  const r = runOn('nearly-sorted')
  assert.ok(
    r.insert.comparisons < N * 2,
    `insertion on a nearly-sorted array costs ${r.insert.comparisons} comparisons, must stay under ${N * 2}`,
  )
  assert.ok(
    r.insert.comparisons * 5 < r.select.comparisons,
    'insertion must leave selection far behind on a nearly-sorted array, otherwise this arrangement teaches nothing',
  )
}

{
  // Reversed is the worst case for both insertion and bubble: every pair is an
  // inversion.
  const r = runOn('reversed')
  assert.equal(r.insert.comparisons, ALL_PAIRS, 'insertion must compare every pair')
  assert.equal(r.insert.writes, 2 * ALL_PAIRS, 'every inversion is one swap')
}

{
  // Quicksort: wins decisively on the random arrangement...
  const rand = runOn('random')
  assert.ok(
    rand.quick.comparisons * 2 < rand.select.comparisons,
    `random: quick ${rand.quick.comparisons} vs selection ${rand.select.comparisons}, ` +
      'the gap is too small for the first run to state the lesson by itself',
  )
  // ...and is the worst on the board for the already-sorted arrangement, because
  // the pivot is the last slot. This is the most valuable trap in the whole
  // simulation: the most everyday shape of data is the worst case. Lose this
  // property (by switching to a median pivot) and the lesson goes with it.
  const sorted = runOn('sorted')
  assert.equal(sorted.quick.comparisons, ALL_PAIRS, 'quick must degrade to O(n²)')
  assert.ok(
    sorted.quick.comparisons > sorted.bubble.comparisons * 5,
    'on a sorted array, quick must lose to bubble by a wide margin',
  )
}

// ── The code panel ─────────────────────────────────────────────────────────
//
// Every line must be highlighted at some point. A line no frame ever points at
// is a line the learner sees without ever finding out when it runs — or worse,
// a sign that the text on screen has drifted from the function actually running.

for (const a of ALGOS) {
  assert.ok(a.code.length > 0, `${a.file}: empty`)
  assert.ok(a.code[0].startsWith('def '), `${a.file}: line 1 must be the function signature`)

  const seen = new Set<number>()
  for (const l of LAYOUTS) for (const f of a.run(l.make()).frames) seen.add(f.line)

  for (let ln = 1; ln <= a.code.length; ln++) {
    const src = a.code[ln - 1].trim()
    // Blank lines and `def` lines are not executable statements — quicksort has
    // two functions in one code panel.
    if (src === '' || src.startsWith('def ')) continue
    assert.ok(seen.has(ln), `${a.file} line ${ln} (${src}) is never highlighted`)
  }
}

assert.equal(ALGOS.length, 4)
assert.deepEqual(
  ALGOS.map((a) => a.no),
  ['01', '02', '03', '04'],
)
assert.equal(new Set(ALGOS.map((a) => a.file)).size, 4)

console.log('sort.check: ok')
