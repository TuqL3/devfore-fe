// Run: npm run check
//
// The admin screen's JSON box is where simulation scenarios and grading
// conditions are entered. Accepting an array by mistake, or keeping the previous
// value once the text is broken, both end the same way: the author presses Save,
// the screen says done, and what got saved is not what is on screen. That is why
// this branch has its own check.
//
// ponytail: node asserts, no framework — this project has no test runner, and
// adding one for a pure function costs more than the thing it protects.
import assert from 'node:assert/strict'

import { parseJsonObject } from './json.ts'

// An empty box is a valid intention: a lab with no scenario, a task with no goal
// written yet.
assert.deepEqual(parseJsonObject(''), { value: null, error: '' })
assert.deepEqual(parseJsonObject('   \n  '), { value: null, error: '' })

// A valid object passes through untouched.
assert.deepEqual(parseJsonObject('{"version":1,"catalog":{"checkout":{"seconds":5}}}'), {
  value: { version: 1, catalog: { checkout: { seconds: 5 } } },
  error: '',
})

// Three things the server will reject, which must be stopped right at the box —
// and more importantly: they must return `value: null`, not keep the last valid
// value around.
for (const bad of ['[1,2,3]', '"a string"', '42', 'null', '{"a":', 'not-json']) {
  const got = parseJsonObject(bad)
  assert.equal(got.value, null, `must reject: ${bad}`)
  assert.notEqual(got.error, '', `must report an error: ${bad}`)
}

console.log('json.check: ok')
