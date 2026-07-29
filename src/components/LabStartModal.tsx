import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import type { LabDetail } from '@/lib/types'
import { ClockIcon, TerminalIcon } from '@/components/icons'

/** idle → creating → connecting → (gone). `blocked` and `failed` are dead ends
 *  the student has to act on. */
export type StartPhase = 'idle' | 'creating' | 'connecting' | 'blocked' | 'failed'

type Props = {
  phase: StartPhase
  lab?: LabDetail
  courseSlug: string
  error?: string
  onStart: () => void
}

const STEPS: { key: StartPhase; label: string }[] = [
  { key: 'creating', label: 'Tạo container riêng cho bạn' },
  { key: 'connecting', label: 'Mở terminal' },
]

export function LabStartModal({ phase, lab, courseSlug, error, onStart }: Props) {
  const startRef = useRef<HTMLButtonElement>(null)

  // Enter should start the lab without reaching for the mouse; focus also has to
  // land inside the dialog or a screen reader keeps reading the page behind it.
  useEffect(() => {
    if (phase === 'idle') startRef.current?.focus()
  }, [phase])

  const busy = phase === 'creating' || phase === 'connecting'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lab-start-title"
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-2xl">
        <h2 id="lab-start-title" className="text-lg font-bold text-fg-strong">
          {lab?.title ?? 'Đang tải bài lab…'}
        </h2>

        {phase === 'blocked' ? (
          <Blocked courseSlug={courseSlug} />
        ) : (
          <>
            <dl className="mt-4 flex flex-wrap gap-2 font-mono text-xs">
              <Chip>{lab?.tasks.length ?? 0} nhiệm vụ</Chip>
              <Chip>{lab?.duration_minutes ?? 0} phút</Chip>
              <Chip accent>{lab?.points ?? 0} điểm</Chip>
            </dl>

            {busy ? (
              <Steps phase={phase} />
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

            <div className="mt-6 flex items-center gap-3">
              <button
                ref={startRef}
                onClick={onStart}
                disabled={busy || !lab}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 font-medium text-accent-fg transition hover:bg-accent-hover disabled:cursor-wait disabled:opacity-70"
              >
                {busy ? (
                  <Spinner />
                ) : (
                  <TerminalIcon className="h-4 w-4" />
                )}
                {busy
                  ? 'Đang chuẩn bị…'
                  : phase === 'failed'
                    ? 'Thử lại'
                    : 'Bắt đầu làm bài'}
              </button>
              {!busy && (
                <Link
                  to={`/courses/${courseSlug}`}
                  className="rounded-md px-3 py-2.5 text-sm text-fg-muted transition hover:text-fg-strong"
                >
                  Để sau
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/** The two steps are the two real waits — the POST that creates the container,
    then the websocket attaching a shell to it. Neither is padded. */
function Steps({ phase }: { phase: StartPhase }) {
  const at = STEPS.findIndex((s) => s.key === phase)
  return (
    <ol className="mt-5 space-y-2.5">
      {STEPS.map((s, i) => {
        const done = i < at
        const now = i === at
        return (
          <li
            key={s.key}
            className={
              'flex items-center gap-2.5 text-sm ' +
              (now ? 'text-fg-strong' : done ? 'text-fg-muted' : 'text-fg-subtle')
            }
          >
            <span className="flex h-4 w-4 shrink-0 items-center justify-center">
              {done ? (
                <span className="text-success">✓</span>
              ) : now ? (
                <Spinner />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-border-strong" />
              )}
            </span>
            {s.label}
          </li>
        )
      })}
    </ol>
  )
}

function Blocked({ courseSlug }: { courseSlug: string }) {
  return (
    <>
      <p className="mt-4 text-sm leading-relaxed text-fg-muted">
        Bạn đang có một phiên lab khác chạy dở. Mỗi lúc chỉ được mở một container
        — hãy quay lại phiên đó và kết thúc trước khi bắt đầu bài này.
      </p>
      <Link
        to={`/courses/${courseSlug}`}
        className="mt-6 inline-flex w-full items-center justify-center rounded-md border border-border-strong px-4 py-2.5 text-sm text-fg transition hover:border-accent hover:text-accent-soft"
      >
        Về khoá học
      </Link>
    </>
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
        'rounded bg-muted px-2 py-0.5 ' + (accent ? 'text-accent-soft' : 'text-fg-muted')
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
      className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  )
}
