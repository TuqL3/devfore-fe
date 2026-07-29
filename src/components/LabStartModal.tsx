import { useEffect, useRef } from 'react'
import type { Lab } from '@/lib/types'
import { ClockIcon, TerminalIcon } from '@/components/icons'

/** idle → creating → (the caller navigates). `blocked` and `failed` are dead
 *  ends the student has to act on. */
export type StartPhase = 'idle' | 'creating' | 'blocked' | 'failed'

type Props = {
  phase: StartPhase
  lab: Lab
  error?: string
  onStart: () => void
  onClose: () => void
}

export function LabStartModal({ phase, lab, error, onStart, onClose }: Props) {
  const startRef = useRef<HTMLButtonElement>(null)
  const busy = phase === 'creating'

  useEffect(() => {
    if (phase === 'idle') startRef.current?.focus()
  }, [phase])

  // Escape closes it, but not while a container is being built: the request is
  // already in flight and dismissing the dialog would hide a session that now
  // exists and is holding the student's one slot.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={() => !busy && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lab-start-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-2xl"
      >
        <p className="font-mono text-xs uppercase tracking-wide text-fg-subtle">
          Bài thực hành
        </p>
        <h2 id="lab-start-title" className="mt-1 text-lg font-bold text-fg-strong">
          {lab.title}
        </h2>

        {phase === 'blocked' ? (
          <p className="mt-4 text-sm leading-relaxed text-fg-muted">
            Bạn đang có một phiên lab khác chạy dở. Mỗi lúc chỉ được mở một
            container — hãy quay lại phiên đó và kết thúc trước khi bắt đầu bài
            này.
          </p>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap gap-2 font-mono text-xs">
              <Chip>{lab.task_count} nhiệm vụ</Chip>
              <Chip>{lab.duration_minutes} phút</Chip>
              <Chip accent>{lab.points} điểm</Chip>
            </div>

            {busy ? (
              <p className="mt-5 flex items-center gap-2.5 text-sm text-fg-strong">
                <Spinner />
                Đang tạo container riêng cho bạn…
              </p>
            ) : (
              <p className="mt-4 flex items-start gap-2 text-sm leading-relaxed text-fg-muted">
                <ClockIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Một container Linux riêng sẽ được tạo cho bạn và{' '}
                  <strong className="text-fg">tự xoá sau 60 phút</strong>. Mọi thứ
                  bên trong mất theo nó, nên đừng để gì quan trọng ở đấy.
                </span>
              </p>
            )}

            {error && phase === 'failed' && (
              <p className="mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}
          </>
        )}

        <div className="mt-6 flex items-center gap-3">
          {phase !== 'blocked' && (
            <button
              ref={startRef}
              onClick={onStart}
              disabled={busy}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 font-medium text-accent-fg transition hover:bg-accent-hover disabled:cursor-wait disabled:opacity-70"
            >
              {busy ? <Spinner /> : <TerminalIcon className="h-4 w-4" />}
              {busy
                ? 'Đang chuẩn bị…'
                : phase === 'failed'
                  ? 'Thử lại'
                  : 'Bắt đầu làm bài'}
            </button>
          )}
          {!busy && (
            <button
              onClick={onClose}
              className={
                'rounded-md px-3 py-2.5 text-sm text-fg-muted transition hover:text-fg-strong ' +
                (phase === 'blocked'
                  ? 'flex-1 border border-border-strong text-center'
                  : '')
              }
            >
              {phase === 'blocked' ? 'Đã hiểu' : 'Để sau'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Chip({
  children,
  accent = false,
}: {
  children: React.ReactNode
  accent?: boolean
}) {
  return (
    <span
      className={
        'rounded bg-muted px-2 py-0.5 ' +
        (accent ? 'text-accent-soft' : 'text-fg-muted')
      }
    >
      {children}
    </span>
  )
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  )
}
