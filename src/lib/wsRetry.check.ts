// Run: npm run check
//
// Two ways this goes wrong and neither turns anything red on its own. Retry a
// close the server sent on purpose and a finished lab never reports finished —
// the student sits in a dead terminal. Stop retrying one attempt too early and
// an ordinary deploy ends every open session on the box.
//
// ponytail: node's assert, no framework — same reason as json.check.ts.
import assert from 'node:assert/strict'
import { RETRY_BACKOFF_MS, retryDelay, shouldRetry } from './wsRetry.ts'

// A close frame from the server is the session ending. Never reconnect to it,
// not even on the very first drop.
assert.equal(shouldRetry(true, 0), false)
assert.equal(shouldRetry(true, 3), false)

// No frame at all (code 1006) is the transport dropping under a live session.
assert.equal(shouldRetry(false, 0), true)
// The last attempt the budget allows, and the first one past it. Off by one
// here is either a deploy that still kills sessions or a retry loop with no end.
assert.equal(shouldRetry(false, RETRY_BACKOFF_MS.length - 1), true)
assert.equal(shouldRetry(false, RETRY_BACKOFF_MS.length), false)

// Backoff climbs, then holds — it must never fall back to a tight loop.
assert.equal(retryDelay(0), 1000)
assert.equal(retryDelay(1), 2000)
assert.deepEqual(
  RETRY_BACKOFF_MS.map((_, i) => retryDelay(i)),
  RETRY_BACKOFF_MS,
)
// Clamped rather than undefined: an index past the table must still be a number,
// or setTimeout silently becomes setTimeout(fn, 0).
assert.equal(retryDelay(99), RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1])

// The whole budget has to outlast a container restart. Under ~20s and a normal
// deploy still drops sessions, which is the entire point of the retry.
const total = RETRY_BACKOFF_MS.reduce((a, b) => a + b, 0)
assert.ok(total >= 20_000, `retry budget ${total}ms is shorter than a deploy`)

console.log('wsRetry.check: ok')
