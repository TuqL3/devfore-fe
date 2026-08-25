// Run: npm run check
//
// All four algorithms must produce **the same answer** — the whole simulation
// rests on exactly that: if their results differed, the comparison-count table
// would be meaningless, because they would be doing two different jobs rather
// than one job two ways. An off-by-one in binary or interpolation search is the
// kind of bug you cannot see: it still returns a number, it still draws a pretty
// picture.
//
// Since the code panel runs alongside, there is a second group of invariants:
// a line number must point at a line that exists, and a frame that declares
// "comparing" must really be comparing. Getting that wrong lights up the wrong
// line — still runs, still pretty, teaches the wrong thing.
//
// ponytail: node asserts, no framework — same reason as sim.check.ts.
import assert from 'node:assert/strict'

import {
  ALGOS,
  DEFAULT_TARGET_INDEX,
  missingValue,
  scoreboard,
  seedData,
} from './algos.ts'

const data = seedData()
const n = data.length

// ── The array ──────────────────────────────────────────────────────────────

assert.equal(n, 64)
for (let i = 1; i < n; i++) {
  assert.ok(data[i] > data[i - 1], `the array must be strictly increasing, broken at ${i}`)
}
// The gaps must be uneven — if they were even, interpolation would hit on the
// first probe for every target and its lesson would disappear.
const gaps = new Set(data.slice(1).map((v, i) => v - data[i]))
assert.ok(gaps.size > 1, 'the gaps must be uneven')

assert.ok(DEFAULT_TARGET_INDEX > n / 2, 'the default target must sit in the second half')

const missing = missingValue(data)
assert.equal(data.indexOf(missing), -1, 'the "absent" value must really be absent')
assert.ok(
  missing > data[0] && missing < data[n - 1],
  'it must fall inside the array range, not past an edge — past an edge, interpolation ' +
    'exits at the loop condition and demonstrates nothing',
)

// ── All four must agree, on EVERY target ───────────────────────────────────

const targets = [
  ...data, // every real element
  missing, // a gap in the middle
  data[0] - 1, // before the front of the array
  data[n - 1] + 1, // past the end of the array
]

/** A target outside `[data[0], data[n-1]]`. Interpolation rules this case out
 *  at the loop condition, **without a single comparison** — it knows up front
 *  it is hopeless. The other three still have to open at least one slot. */
const outOfRange = (t: number) => t < data[0] || t > data[n - 1]

for (const target of targets) {
  const want = data.indexOf(target)
  for (const a of ALGOS) {
    const t = a.run(data, target)
    const where = `${a.cmd} with ${target}`
    assert.equal(t.found, want, `${where}: returned ${t.found}, expected ${want}`)

    // It must never compare more than one full sweep of the array. An infinite
    // loop in interpolation would hang the check; this ceiling turns it into a
    // readable error line instead.
    assert.ok(t.comparisons <= n, `${where}: ${t.comparisons} comparisons, far too many`)
    assert.ok(t.frames.length <= n * 4, `${where}: ${t.frames.length} frames, far too many`)
    if (!outOfRange(target)) {
      assert.ok(t.comparisons > 0, `${where}: must make at least one comparison`)
    }

    // `comparisons` must equal the number of frames that compare. Two separate
    // counters are two counters that drift apart: the scoreboard says one
    // number while the code panel counts another.
    assert.equal(
      t.comparisons,
      t.frames.filter((f) => f.cmp !== null).length,
      `${where}: comparison counter disagrees with the number of comparing frames`,
    )

    for (const f of t.frames) {
      assert.ok(
        f.line >= 1 && f.line <= a.code.length,
        `${where}: line ${f.line} does not exist in ${a.file} (${a.code.length} lines)`,
      )
      // An EMPTY range is allowed — `lo = hi + 1` is the real state after the
      // final cut, meaning no slot is left unruled-out, and the renderer dims
      // the whole grid. Clamping it to look "nicer" would lie about the exact
      // moment the algorithm ends. But emptier than one slot is an arithmetic
      // bug, not a state.
      assert.ok(
        f.lo <= f.hi + 1,
        `${where}: range [${f.lo}..${f.hi}] is more than one slot empty — arithmetic bug, not a state`,
      )
      assert.ok(
        f.lo >= 0 && f.lo <= n && f.hi >= -1 && f.hi < n,
        `${where}: range [${f.lo}..${f.hi}] runs outside the array`,
      )

      if (f.probe === null) {
        // A line that reads no element must not declare a comparison result.
        assert.equal(f.cmp, null, `${where}: line ${f.line} has no probe yet carries a compare flag`)
        continue
      }
      assert.ok(
        f.probe >= f.lo && f.probe <= f.hi,
        `${where}: probed slot (${f.probe}) sits outside the range [${f.lo}..${f.hi}] — ` +
          'the renderer would paint it outside the lit region, a visible drawing bug',
      )
      if (f.cmp !== null) {
        // The compare flag must match the real data: the renderer colours from
        // it rather than recomputing.
        const want_cmp =
          data[f.probe] === target ? 'eq' : data[f.probe] < target ? 'lt' : 'gt'
        assert.equal(f.cmp, want_cmp, `${where}: compare flag at slot ${f.probe} is wrong`)
      }
    }

    // On a hit, the last frame must be the `return` line, and the slot it points
    // at must be the one found — not found here, then pointing somewhere else.
    if (t.found !== -1) {
      const last = t.frames[t.frames.length - 1]
      assert.equal(last.probe, t.found, `${where}: the last frame does not point at the found slot`)
      assert.ok(
        a.code[last.line - 1].includes('return'),
        `${where}: the last frame must stop on a return line, currently "${a.code[last.line - 1].trim()}"`,
      )
      assert.ok(
        t.frames.some((f) => f.cmp === 'eq' && f.probe === t.found),
        `${where}: there must be an equality comparison at slot ${t.found}`,
      )
    }
  }
}

// ── Upper bound for each algorithm ─────────────────────────────────────────
//
// The numbers in "Why it is worth learning" have to be true, not just well
// phrased.
{
  let worst = { linear: 0, binary: 0, jump: 0, interp: 0 }
  for (const target of targets) {
    const [li, bi, ju, ip] = ALGOS.map((a) => a.run(data, target).comparisons)
    worst = {
      linear: Math.max(worst.linear, li),
      binary: Math.max(worst.binary, bi),
      jump: Math.max(worst.jump, ju),
      interp: Math.max(worst.interp, ip),
    }
  }
  // 64 elements: binary at most ⌈log₂(65)⌉ = 7.
  assert.ok(worst.binary <= 7, `binary worst case ${worst.binary}, must be ≤ 7`)
  // Jump: ⌈64/8⌉ jumps + 8 sweep steps, plus one repeated compare at the block end.
  assert.ok(worst.jump <= 17, `jump worst case ${worst.jump}, must be ≤ 17`)
  assert.ok(worst.linear <= n, `linear worst case ${worst.linear}, must be ≤ ${n}`)
  // Interpolation must NOT be faster in the worst case — that is its lesson, and
  // an array on which it always wins is an array that lies.
  assert.ok(
    worst.interp > worst.binary,
    `interpolation worst case ${worst.interp} against binary ${worst.binary}: this array is too ` +
      'even to show interpolation at its worst',
  )
}

// Interpolation rules out an out-of-range target without a single comparison;
// the other three have to compare.
{
  const above = data[n - 1] + 1
  const [linear, binary, jump, interp] = ALGOS.map((a) => a.run(data, above).comparisons)
  assert.equal(interp, 0, 'interpolation must exit immediately, with no comparison')
  assert.ok(linear > 0 && binary > 0 && jump > 0)
}

// ── The default target must show the gap ───────────────────────────────────

{
  const rows = scoreboard(data, data[DEFAULT_TARGET_INDEX])
  assert.equal(rows.length, 4)
  const [linear, binary] = rows
  assert.equal(linear.found, DEFAULT_TARGET_INDEX)
  assert.equal(binary.found, DEFAULT_TARGET_INDEX)
  // The first run has to state the lesson by itself. Under a 5× gap the
  // scoreboard reads like measurement noise rather than a difference in kind.
  assert.ok(
    linear.comparisons >= binary.comparisons * 5,
    `default target: linear ${linear.comparisons} vs binary ${binary.comparisons}, the gap is too small`,
  )
}

// ── The code panel ─────────────────────────────────────────────────────────
//
// Every line of code must be highlighted at some point. A line no frame ever
// points at is a line the learner sees without ever understanding when it runs —
// or worse, a sign that the code on screen has drifted from the function that
// actually runs.
for (const a of ALGOS) {
  assert.ok(a.code.length > 0, `${a.file}: empty`)
  assert.ok(a.code[0].startsWith('def '), `${a.file}: line 1 must be the function signature`)

  const seen = new Set<number>()
  for (const target of targets) {
    for (const f of a.run(data, target).frames) seen.add(f.line)
  }
  for (let ln = 2; ln <= a.code.length; ln++) {
    // An `else:` line has nothing to execute — its body is the next line.
    if (a.code[ln - 1].trim() === 'else:') continue
    assert.ok(
      seen.has(ln),
      `${a.file} line ${ln} (${a.code[ln - 1].trim()}) is never highlighted`,
    )
  }
}

assert.equal(ALGOS.length, 4)
assert.deepEqual(
  ALGOS.map((a) => a.no),
  ['01', '02', '03', '04'],
)

console.log('search.check: ok')
