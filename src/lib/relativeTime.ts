import { locale, t } from '@/lib/i18n'

const MINUTE = 60
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** "3 giờ trước". Falls back to a date once it stops being useful. */
export function timeAgo(iso: string): string {
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000
  if (seconds < MINUTE) return t('time.justNow')
  if (seconds < HOUR)
    return t('time.minutesAgo', { n: Math.floor(seconds / MINUTE) })
  if (seconds < DAY) return t('time.hoursAgo', { n: Math.floor(seconds / HOUR) })
  if (seconds < 30 * DAY)
    return t('time.daysAgo', { n: Math.floor(seconds / DAY) })
  return new Date(iso).toLocaleDateString(locale())
}

/** Absolute, not "3 ngày trước": two attempts at the same lab are told apart by
 *  when they were, and a relative label makes them read as the same row twice. */
export function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(locale(), {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
