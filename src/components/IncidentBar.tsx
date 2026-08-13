import { useEffect, useState } from 'react'

import { clockLabel } from '@/lib/clock'
import { locale, useT } from '@/lib/i18n'

/** Dải trạng thái của một ca trực: đồng hồ chạy từ lúc phiên bắt đầu, và số
 *  request hỏng tăng theo từng giây.
 *
 *  Nó không phải trang trí. Lab bình thường không có gì thúc, nên người học đọc
 *  hết tài liệu rồi mới gõ dòng đầu tiên. Ở đây có thứ đang hỏng và đang đắt dần,
 *  và cách làm việc đúng khi trực là đoán rồi thử — dải này là thứ duy nhất trên
 *  màn hình nói ra điều đó.
 *
 *  Con số **suy ra, không đo**: `rps` do tác giả kịch bản gõ. Chữ "ước lượng" nằm
 *  ngay cạnh nó chứ không giấu trong tooltip — cùng lý do mô phỏng CI/CD ghi rõ
 *  số giây của nó là số mô phỏng. */
export function IncidentBar({
  startedAt,
  rps,
  live,
}: {
  startedAt: string
  rps: number
  /** false khi mọi nhiệm vụ đã xanh: dịch vụ sống lại rồi, đồng hồ phải dừng.
   *  Mốc chính xác do server chốt ở báo cáo — cái ở đây chỉ để người đang nhìn
   *  màn hình thấy nó dừng. */
  live: boolean
}) {
  const t = useT()
  const [now, setNow] = useState(() => Date.now())
  // Giây lúc dịch vụ sống lại, chốt đúng một lần. Nếu để đồng hồ chạy tiếp thì
  // dải này vẫn tính tiền một sự cố đã xong; nếu tính lại từ `Date.now()` mỗi
  // lần vẽ thì con số nhảy lùi mỗi khi React vẽ lại.
  const [frozen, setFrozen] = useState<number | null>(null)

  const elapsed = Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000))

  useEffect(() => {
    if (!live) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [live])

  useEffect(() => {
    if (!live) setFrozen((f) => f ?? elapsed)
    // `elapsed` cố tình không nằm trong deps: hàm này chỉ được chạy đúng lúc
    // `live` đổi, còn đọc `elapsed` của giây đó. Thêm nó vào là chốt lại mỗi
    // giây, tức là không chốt gì cả.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live])

  const seconds = frozen ?? elapsed
  const failed = seconds * rps

  return (
    <div
      className={
        'flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b px-4 py-2 text-sm ' +
        (live
          ? 'border-danger/30 bg-danger/10 text-danger'
          : 'border-success/30 bg-success-soft text-success')
      }
    >
      <span className="font-semibold">
        {live ? t('incident.live') : t('incident.recovered')}
      </span>

      <span className="font-mono tabular-nums" aria-label={t('incident.clockLabel')}>
        {clockLabel(seconds)}
      </span>

      <span className="text-fg-muted">
        <span className="font-mono tabular-nums">
          ~{failed.toLocaleString(locale())}
        </span>{' '}
        {t('incident.failedRequests')}
      </span>

      <span className="ml-auto text-xs text-fg-subtle">
        {t('incident.estimate', { rps })}
      </span>
    </div>
  )
}
