/** When a lab terminal socket drops, this decides whether reopening it is the
 *  right answer, and how long to wait first.
 *
 *  It lives in `lib` rather than inside LabTerminal because the rule it encodes
 *  is a protocol fact, not a UI detail, and it is the kind of branch that fails
 *  silently: retry a close the server meant, and a finished session never
 *  reports; refuse to retry an abnormal one, and every deploy throws the whole
 *  class out of their terminals. */

/** Six attempts, ~31s in total. Long enough to cover an api container restart
 *  during a deploy, short enough that a student whose session is genuinely gone
 *  is told so instead of watching a spinner. */
export const RETRY_BACKOFF_MS = [1000, 2000, 4000, 8000, 8000, 8000]

/** `attempts` counts reconnects already made, so the first drop passes 0.
 *
 *  A clean close is the server's own close frame: the shell exited or the
 *  deadline passed, and `internal/labs/adapter/rest/terminal.go` sends
 *  CloseNormalClosure for both. That session is over and reopening the socket
 *  would only find it gone.
 *
 *  An abnormal close carries no frame at all — code 1006 — which is the
 *  transport dying under a session that is still alive. An api restart looks
 *  exactly like that from the browser, and the lab container outlives it: the
 *  reaper works off `expires_at` in the database, not off the websocket. */
export function shouldRetry(wasClean: boolean, attempts: number): boolean {
  return !wasClean && attempts < RETRY_BACKOFF_MS.length
}

export function retryDelay(attempts: number): number {
  return RETRY_BACKOFF_MS[Math.min(attempts, RETRY_BACKOFF_MS.length - 1)]
}
