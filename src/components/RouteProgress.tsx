import { useIsFetching, useIsMutating } from '@tanstack/react-query'
import { useT } from '@/lib/i18n'

/**
 * Thin sweeping bar while any query or mutation is in flight. Driven by the
 * react-query counters, so nothing has to report progress by hand.
 */
export function RouteProgress() {
  const t = useT()
  const busy = useIsFetching() + useIsMutating()
  if (!busy) return null
  return <span className="route-progress" role="status" aria-label={t('common.loading')} />
}
