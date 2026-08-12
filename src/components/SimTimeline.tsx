import { useEffect, useRef, useState } from 'react'

import type { SimRunJob, SimRunResult, SimRunStep } from '@/lib/types'
import { useT } from '@/lib/i18n'

/** Cả lượt chạy được phát lại trong chừng này, dù pipeline dài 40 giây hay 40
 *  phút. Thời lượng thật đã có trên nhãn; cái đáng xem là hình dạng — hai thanh
 *  chồng lên nhau là song song, xếp nối nhau là nối tiếp. */
const PLAY_MS = 2200

/** Chạy đồng hồ ảo từ 0 tới `total`, một lần, mỗi khi `key` đổi. Trả về giây mô
 *  phỏng hiện tại và cách nhảy thẳng tới cuối.
 *
 *  requestAnimationFrame chứ không phải setInterval: đồng hồ đọc từ mốc thời
 *  gian thật nên tab bị đẩy xuống nền rồi quay lại vẫn ra đúng chỗ, thay vì trôi
 *  đi một khoảng bằng số frame đã lỡ. */
function usePlayback(total: number, key: unknown): [number, boolean, () => void] {
  const [clock, setClock] = useState(0)
  const [done, setDone] = useState(false)
  const frame = useRef(0)

  useEffect(() => {
    // Một lượt rỗng không có gì để phát, và chia cho 0 ở dưới.
    if (total <= 0) {
      setClock(0)
      setDone(true)
      return
    }
    setClock(0)
    setDone(false)
    const started = performance.now()
    const tick = (now: number) => {
      const ratio = Math.min(1, (now - started) / PLAY_MS)
      setClock(ratio * total)
      if (ratio < 1) frame.current = requestAnimationFrame(tick)
      else setDone(true)
    }
    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
  }, [total, key])

  const skip = () => {
    cancelAnimationFrame(frame.current)
    setClock(total)
    setDone(true)
  }
  return [clock, done, skip]
}

/** Biểu đồ Gantt của một lượt chạy: mỗi job một hàng, thanh đặt theo thời gian
 *  thật của nó. Bài học nằm ở hình dạng nên không có thư viện chart nào ở đây —
 *  vài div định vị tuyệt đối đã nói đúng điều cần nói. */
export function SimTimeline({ result }: { result: SimRunResult }) {
  const t = useT()
  const total = result.total_seconds
  const [clock, done, skip] = usePlayback(total, result.run_index)

  // Xếp theo lúc bắt đầu chứ không theo tên: đọc từ trên xuống là đọc theo thứ
  // tự xảy ra. Job không bao giờ chạy (`runner === -1`) rơi xuống cuối.
  const jobs = [...result.jobs].sort((a, b) => {
    if (a.runner < 0 !== b.runner < 0) return a.runner < 0 ? 1 : -1
    return a.start - b.start || a.name.localeCompare(b.name)
  })
  const critical = new Set(result.critical_path)

  return (
    <div className="rounded-xl border border-border bg-bg">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-3 py-2">
        <span
          className={
            'rounded-full px-2 py-0.5 text-xs font-medium ' +
            (result.status === 'success'
              ? 'bg-success-soft text-success'
              : 'bg-danger/10 text-danger')
          }
        >
          {result.status === 'success' ? t('timeline.green') : t('timeline.red')}
        </span>
        <span className="font-mono text-sm text-fg-strong">{clockLabel(total)}</span>
        <span className="text-xs text-fg-subtle">
          {t('timeline.run', { n: result.run_index })}
        </span>
        {!done && (
          <button
            onClick={skip}
            className="ml-auto rounded border border-border-strong px-2 py-0.5 text-xs text-fg-muted transition hover:text-fg-strong"
          >
            {t('timeline.skip')}
          </button>
        )}
      </header>

      <div className="space-y-1.5 p-3">
        {jobs.map((job) => (
          <JobRow
            key={job.name}
            job={job}
            total={total}
            clock={clock}
            onCriticalPath={critical.has(job.name)}
          />
        ))}
        <Axis total={total} clock={clock} />
      </div>

      {/* Ba màu và một biểu tượng, không có chỗ nào khác nói chúng nghĩa là gì.
          Không có hàng này thì một ô hổ phách chỉ là một ô hổ phách. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-3 py-2 text-[11px] text-fg-subtle">
        <Key className="bg-success/70">xong</Key>
        <Key className="bg-danger/70">{t('timeline.failed')}</Key>
        <Key className="bg-accent/30">{t('timeline.cached')}</Key>
        <span>{t('timeline.overlap')}</span>
      </div>

      {result.critical_path.length > 0 && (
        <p className="border-t border-border px-3 py-2 text-xs text-fg-subtle">
          {t('timeline.critPath')}{' '}
          <span className="font-mono text-fg-muted">
            {result.critical_path.join(' → ')}
          </span>{' '}
          {t('timeline.critPathAfter')}
        </p>
      )}
      {result.warm_caches.length > 0 && (
        <p className="border-t border-border px-3 py-2 text-xs text-fg-subtle">
          {t('timeline.warmCaches')}{' '}
          <span className="font-mono text-fg-muted">
            {result.warm_caches.join(', ')}
          </span>
        </p>
      )}
    </div>
  )
}

function Key({
  className,
  children,
}: {
  className: string
  children: React.ReactNode
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={'h-2.5 w-4 rounded-sm ' + className} aria-hidden="true" />
      {children}
    </span>
  )
}

function JobRow({
  job,
  total,
  clock,
  onCriticalPath,
}: {
  job: SimRunJob
  total: number
  clock: number
  onCriticalPath: boolean
}) {
  const t = useT()
  const skipped = job.runner < 0 || job.status === 'skipped'

  return (
    <div className="flex items-center gap-2">
      <span
        className="w-28 shrink-0 truncate text-right font-mono text-xs"
        title={job.reason || job.name}
      >
        <span className={onCriticalPath ? 'text-accent-soft' : 'text-fg-muted'}>
          {job.name}
        </span>
      </span>

      <div className="relative h-7 min-w-0 flex-1 rounded bg-muted/60">
        {skipped ? (
          // Không có thanh: job này chưa từng chạy, và vẽ cho nó một khoảng thời
          // gian là bịa ra một khoảng chưa bao giờ tồn tại.
          <span className="absolute inset-y-0 left-2 flex items-center text-xs text-fg-subtle">
            {t('timeline.skipped')}
            {job.reason ? ` — ${job.reason}` : ''}
          </span>
        ) : (
          <div
            className="absolute inset-y-0 flex overflow-hidden rounded"
            style={{
              left: pct(job.start, total),
              width: pct(visible(job.start, job.end, clock), total),
            }}
          >
            {job.steps.map((step, i) => (
              <StepBar key={i} step={step} clock={clock} />
            ))}
          </div>
        )}
      </div>

      <span className="w-14 shrink-0 text-right font-mono text-[11px] text-fg-subtle">
        {skipped ? '—' : `#${job.runner} ${job.end - job.start}s`}
      </span>
    </div>
  )
}

/** Một step bên trong thanh của job. Chiều rộng theo giây của chính nó, nên một
 *  bước 90 giây trông đúng như một bước 90 giây bên cạnh bước 5 giây — đó là
 *  toàn bộ lý do vẽ ra thay vì liệt kê. */
function StepBar({ step, clock }: { step: SimRunStep; clock: number }) {
  const t = useT()
  const seconds = step.end - step.start
  const shown = visible(step.start, step.end, clock)
  if (shown <= 0) return null

  return (
    <div
      className={
        'relative flex h-full items-center justify-center overflow-hidden border-r border-black/10 px-1 last:border-r-0 ' +
        (step.status === 'failed'
          ? 'bg-danger/70 text-white'
          : step.cached
            ? 'bg-accent/30 text-fg-strong'
            : 'bg-success/70 text-white')
      }
      style={{ flexGrow: shown, flexBasis: 0 }}
      title={
        `${step.uses} · ${seconds}s` +
        (step.cached
          ? t('timeline.cacheReused', { key: step.cache_key ?? '' })
          : '') +
        (step.flaky ? ' · step flaky' : '') +
        (step.reason ? ` · ${step.reason}` : '')
      }
    >
      <span className="truncate font-mono text-[10px] leading-none">
        {step.cached && '⚡'}
        {step.uses}
      </span>
    </div>
  )
}

/** Trục thời gian, kèm vạch đang chạy. Bốn mốc là đủ để đọc độ dài mà không
 *  biến hàng dưới cùng thành một dãy số. */
function Axis({ total, clock }: { total: number; clock: number }) {
  const marks = [0, 0.25, 0.5, 0.75, 1].map((r) => Math.round(r * total))
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="w-28 shrink-0" />
      <div className="relative min-w-0 flex-1 border-t border-border pt-1">
        {clock < total && (
          <span
            className="absolute -top-8 bottom-0 w-px bg-accent"
            style={{ left: pct(clock, total) }}
          />
        )}
        <div className="flex justify-between font-mono text-[10px] text-fg-subtle">
          {marks.map((m, i) => (
            <span key={i}>{clockLabel(m)}</span>
          ))}
        </div>
      </div>
      <span className="w-14 shrink-0" />
    </div>
  )
}

/** Phần của khoảng [start, end] mà đồng hồ đã đi qua. */
function visible(start: number, end: number, clock: number): number {
  return Math.max(0, Math.min(end, clock) - start)
}

function pct(value: number, total: number): string {
  return total > 0 ? `${(value / total) * 100}%` : '0%'
}

/** mm:ss dưới một giờ, h:mm:ss trên đó. Giây trần là con số duy nhất người ta
 *  không tự quy đổi trong đầu khi so hai lượt chạy. */
function clockLabel(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return s >= 3600 ? `${Math.floor(s / 3600)}:${mm}:${ss}` : `${mm}:${ss}`
}
