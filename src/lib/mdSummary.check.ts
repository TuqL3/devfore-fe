// Run: npm run check
//
// A break here turns nothing red — it only makes the card in the list show one
// line of garbage: half a code block, or the very heading printed right above it,
// or a sentence cut off mid-word.
//
// ponytail: node asserts, no framework — same reason as json.check.ts.
import assert from 'node:assert/strict'
import { mdSummary } from './mdSummary.ts'

// The heading is skipped, the first paragraph is taken.
assert.equal(
  mdSummary('# First shift\n\n**23:41.** The phone buzzes.\n'),
  '23:41. The phone buzzes.',
)

// Consecutive lines are one paragraph; the second paragraph is not taken.
assert.equal(
  mdSummary('Line one\nline two\n\nThe next paragraph is not taken.'),
  'Line one line two',
)

// A code block must never reach the summary, even when it precedes the paragraph.
assert.equal(
  mdSummary('```sh\nhttpd -p 8080\n```\n\nThe web service runs on port 8080.'),
  'The web service runs on port 8080.',
)

// Inline markers are stripped, the text stays.
assert.equal(
  mdSummary('Read `curl -i` and the [docs](https://x.dev) then **fix it**.'),
  'Read curl -i and the docs then fix it.',
)

// Block quotes and horizontal rules are not the opening sentence.
assert.equal(mdSummary('> a note\n\n---\n\nThe real sentence.'), 'The real sentence.')

// Truncation happens at a word boundary, with an ellipsis.
const long = mdSummary('one two three four five six seven eight nine ten', 20)
assert.ok(long.endsWith('…'), `must end with an ellipsis: ${long}`)
assert.ok(long.length <= 21, `too long: ${long}`)
assert.ok(!long.includes('sev'), `cut mid-word: ${long}`)

// Nothing to summarise returns an empty string, not "undefined".
assert.equal(mdSummary(''), '')
assert.equal(mdSummary('# Heading only'), '')

console.log('mdSummary.check: ok')
