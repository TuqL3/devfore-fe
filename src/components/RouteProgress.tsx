import { useIsFetching, useIsMutating } from '@tanstack/react-query'

/**
 * Thin sweeping bar while any query or mutation is in flight. Driven by the
 * react-query counters, so nothing has to report progress by hand.
 */
export function RouteProgress() {
  const busy = useIsFetching() + useIsMutating()
  if (!busy) return null
  return <span className="route-progress" role="status" aria-label="Loading…" />
}
