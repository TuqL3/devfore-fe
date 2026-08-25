// Run: npm run check
//
// A caret landing one character off after Tab is the kind of break nobody sees:
// you only find out once you keep typing, and by then the cause is gone. So the
// arithmetic lives outside the component and has its own check.
//
// ponytail: node asserts, no framework — same reason as json.check.ts.
import assert from 'node:assert/strict'

import { addStep, indent, starterPipeline } from './sim.ts'
import type { StepAdded } from './sim.ts'

// Plain caret: insert two spaces in place, the caret follows.
assert.deepEqual(indent('jobs:', 5, 5), { text: 'jobs:  ', start: 7, end: 7 })
assert.deepEqual(indent('ab', 1, 1), { text: 'a  b', start: 3, end: 3 })

// Multi-line selection: indent BOTH lines, rather than replacing the selection
// with spaces. This is the easiest place to get wrong.
{
  const src = 'a\nb\nc'
  const got = indent(src, 0, 3) // touches lines "a" and "b"
  assert.equal(got.text, '  a\n  b\nc')
  assert.equal(got.end, 7, 'the end caret must shift by the total number of spaces inserted')
}

// A selection inside ONE line still indents the whole line — without swallowing
// the highlighted text.
assert.equal(indent('abc', 1, 2).text, '  abc')

// Blank lines must not be indented: two spaces dangling at the end of a line.
assert.equal(indent('a\n\nb', 0, 3).text, '  a\n\n  b')

// Outdent: remove exactly one level, and never eat past it.
assert.equal(indent('    a', 0, 5, true).text, '  a')
assert.equal(indent('  a', 0, 3, true).text, 'a')
assert.equal(indent('a', 0, 1, true).text, 'a')
assert.equal(indent(' a', 0, 2, true).text, 'a', 'a single stray space can still be removed')

// The caret must never run before the start of the line when outdenting.
{
  const got = indent('  a', 2, 2, true)
  assert.equal(got.text, 'a')
  assert.ok(got.start >= 0 && got.start <= got.text.length)
}

// --- addStep: clicking a step in the catalog table puts it in the pipeline ---
//
// Same class of break as indent: inserting on the wrong line is visible at once,
// but inserting on the right line with the caret off only shows up as you type.

const TWO = ['jobs:', '  build:', '    steps: [checkout]', '  test:', '    steps: [npm-ci]', ''].join('\n')

/** `assert.ok` does not narrow the type here — @types/node is not in this
 *  project — so "it inserted" and "what it inserted" are two separate checks. */
function added(text: string, caret: number, step: string): StepAdded {
  const got = addStep(text, caret, step)
  if (got === null) throw new Error(`addStep must be able to insert ${step}`)
  return got
}

// Caret on the "test" job name line → insert into "test"'s steps, not
// "build"'s. The previous job's steps line sits directly ABOVE the caret and
// this job's directly BELOW, so this is where the ties-go-below rule has to hold.
{
  const got = added(TWO, TWO.indexOf('  test:') + 3, 'npm-test')
  assert.match(got.text, /steps: \[checkout\]/, 'the build job must not be touched')
  assert.match(got.text, /steps: \[npm-ci, npm-test\]/)
  assert.equal(
    got.text.slice(got.caret, got.caret + 1),
    ']',
    'the caret must sit right before the closing bracket of the list just edited',
  )
}

// Caret already on a `steps:` line inserts into that very line.
assert.match(
  added(TWO, TWO.indexOf('    steps: [npm-ci]') + 5, 'lint').text,
  /steps: \[npm-ci, lint\]/,
)

// Never clicked into the editor: caret at 0, no steps line above it. Take the
// first steps line rather than silently dropping the click.
assert.match(added(TWO, 0, 'lint').text, /steps: \[checkout, lint\]/)

// Empty list: must not produce a dangling comma.
assert.equal(
  added('jobs:\n  a:\n    steps: []\n', 99, 'checkout').text,
  'jobs:\n  a:\n    steps: [checkout]\n',
)

// A duplicate step still gets inserted — running something twice is a real thing,
// and the button must not decide to skip it.
assert.match(added('    steps: [checkout]', 0, 'checkout').text, /\[checkout, checkout\]/)

// No steps line at all (block form, or an editor wiped clean): return null rather
// than guessing where to insert.
assert.equal(addStep('jobs:\n  a:\n    steps:\n      - checkout\n', 0, 'lint'), null)
assert.equal(addStep('', 0, 'lint'), null)

// A caret past the end of the text must not break the line arithmetic.
assert.ok(addStep(TWO, 10_000, 'lint') !== null)

// --- starterPipeline: open with the step the author chose, not the alphabet ---

// A catalog with `build` and `checkout`: alphabetically that gives "build" —
// building before fetching the code. The author's first example says the opening
// step is checkout.
{
  const sc = {
    version: 1,
    runner_count: 2,
    catalog: { build: { seconds: 60 }, checkout: { seconds: 5 } },
    examples: [{ title: '①', pipeline: 'jobs:\n  ci:\n    steps: [checkout, build]\n' }],
  }
  assert.equal(starterPipeline(sc), 'jobs:\n  build:\n    steps: [checkout]\n')
}

// No examples at all: fall back to alphabetical order, and still produce a
// pipeline that runs.
assert.equal(
  starterPipeline({
    version: 1,
    runner_count: 1,
    catalog: { build: { seconds: 60 }, checkout: { seconds: 5 } },
  }),
  'jobs:\n  build:\n    steps: [build]\n',
)

// An example pointing at a step that was deleted from the catalog — a self-built
// scenario can edit both halves. It must fall back to a step that exists, not
// emit a pipeline that cannot be parsed.
assert.equal(
  starterPipeline({
    version: 1,
    runner_count: 1,
    catalog: { checkout: { seconds: 5 } },
    examples: [{ title: '①', pipeline: 'jobs:\n  ci:\n    steps: [deleted]\n' }],
  }),
  'jobs:\n  build:\n    steps: [checkout]\n',
)

console.log('sim.check: ok')
