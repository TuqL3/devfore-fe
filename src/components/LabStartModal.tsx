import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import type { Lab } from '@/lib/types'
import { ClockIcon, TerminalIcon } from '@/components/icons'

/** idle → creating → (the caller navigates). `blocked` and `failed` are dead
 *  ends the student has to act on. */
export type StartPhase = 'idle' | 'creating' | 'blocked' | 'failed'

type Props = {
  phase: StartPhase
  lab: Lab
  error?: string
  /** Route of the session that is in the way, when there is one to go back to. */
  runningHref?: string
  /** Ends that session from here. The rule is one container at a time, so being
   *  told about it without being able to act on it is a dead end. */
  onStopRunning?: () => void
  stopping?: boolean
  onStart: () => void
  onClose: () => void
}

export function LabStartModal({
  phase,
  lab,
  error,
  runningHref,
  onStopRunning,
  stopping = false,
  onStart,
  onClose,
}: Props) {
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

  // Restores whatever was there rather than clearing it, so this stays correct
  // if anything else ever sets overflow on the body.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  // Rendered into body, not where it is written. The tab content it sits under
  // carries .page-enter, whose keyframes animate a transform, and a transformed
  // ancestor becomes the containing block for position:fixed — the backdrop then
  // covers that column instead of the viewport.
  return createPortal(
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
          Lab
        </p>
        <h2 id="lab-start-title" className="mt-1 text-lg font-bold text-fg-strong">
          {lab.title}
        </h2>

        {phase === 'blocked' ? (
          <>
            <p className="mt-4 text-sm leading-relaxed text-fg-muted">
              You already have another lab session open. Only one container at a time — end that session before starting this lab.
            </p>
            {onStopRunning && (
              <button
                onClick={onStopRunning}
                disabled={stopping}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 font-medium text-accent-fg transition hover:bg-accent-hover disabled:cursor-wait disabled:opacity-70"
              >
                {stopping && <Spinner />}
                {stopping ? 'Closing…' : 'End the running session'}
              </button>
            )}
            {/* Only offered when the session still resolves to a route. A lab or
                course removed under a running session leaves the button above as
                the only way out, which is why it does not depend on this. */}
            {runningHref && (
              <Link
                to={runningHref}
                className="mt-2 block text-center text-sm text-accent-soft hover:underline"
              >
                Or reopen the running session →
              </Link>
            )}
          </>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap gap-2 font-mono text-xs">
              <Chip>{`${lab.task_count} tasks`}</Chip>
              <Chip>{`${lab.duration_minutes} minutes`}</Chip>
              <Chip accent>{`${lab.points} points`}</Chip>
            </div>

            {busy ? (
              <p className="mt-5 flex items-center gap-2.5 text-sm text-fg-strong">
                <Spinner />
                {lab.is_sim ? 'Opening the lab…' : 'Creating your own container…'}
              </p>
            ) : (
              <p className="mt-4 flex items-start gap-2 text-sm leading-relaxed text-fg-muted">
                <ClockIcon className="mt-0.5 h-4 w-4 shrink-0" />
                {/* Bài mô phỏng không tạo container nào. Hứa một cái rồi không
                    đưa ra là câu nói dối cuối cùng học viên đọc trước khi bắt
                    đầu — và cũng khiến cảnh báo "mọi thứ bên trong mất theo"
                    thành vô nghĩa. */}
                {lab.is_sim ? (
                  <span>
                    This lab has no container: you write the pipeline and the server simulates the schedule. The session{' '}
                    <strong className="text-fg">closes itself after 60 minutes</strong>
                    , and the runs you made stay readable.
                  </span>
                ) : (
                  <span>
                    Your own Linux container will be created and{' '}
                    <strong className="text-fg">deleted after 60 minutes</strong>
                    . Everything inside goes with it, so do not leave anything important there.
                  </span>
                )}
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
                ? 'Preparing…'
                : phase === 'failed'
                  ? 'Try again'
                  : 'Start the lab'}
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
              {phase === 'blocked' ? 'Got it' : 'Later'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
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
