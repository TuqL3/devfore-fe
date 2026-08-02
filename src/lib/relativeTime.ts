const MINUTE = 60
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** "3 giờ trước". Falls back to a date once it stops being useful. */
export function timeAgo(iso: string): string {
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000
  if (seconds < MINUTE) return 'vừa xong'
  if (seconds < HOUR) return `${Math.floor(seconds / MINUTE)} phút trước`
  if (seconds < DAY) return `${Math.floor(seconds / HOUR)} giờ trước`
  if (seconds < 30 * DAY) return `${Math.floor(seconds / DAY)} ngày trước`
  return new Date(iso).toLocaleDateString('vi-VN')
}

/** Absolute, not "3 ngày trước": two attempts at the same lab are told apart by
 *  when they were, and a relative label makes them read as the same row twice. */
export function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
