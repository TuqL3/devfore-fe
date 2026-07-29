import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { labsApi } from '@/api/labs'
import { coursesApi } from '@/api/courses'
import type { Lab, LabDetail, LabSession, LabTask } from '@/lib/types'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/Avatar'
import { LabTerminal } from '@/components/LabTerminal'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  StopIcon,
} from '@/components/icons'

const TABS = ['Nhiệm vụ', 'Gợi ý', 'Hướng dẫn'] as const
type Tab = (typeof TABS)[number]

export default function LabRunner() {
  const { slug = '', labSlug = '' } = useParams()
  const qc = useQueryClient()
  const [step, setStep] = useState(0)
  const [tab, setTab] = useState<Tab>('Nhiệm vụ')
  // Set by the terminal itself once the shell is attached. Nothing earlier is a
  // truthful signal that the lab is usable.
  const [attached, setAttached] = useState(false)
  // Why the session ended on its own — an hour elapsed, or the student typed
  // exit. Held so the screen can say so instead of bouncing them back to the
  // course page with no explanation.
  const [ended, setEnded] = useState('')

  const lab = useQuery({
    queryKey: ['lab', slug, labSlug],
    queryFn: () => labsApi.detail(slug, labSlug),
  })
  const current = useQuery({ queryKey: ['lab-session'], queryFn: labsApi.current })

  // Same query key the course page uses, so arriving from there costs nothing.
  // The labs come back in order_idx order, which is what makes prev/next here
  // a lookup rather than a second endpoint to keep in step with the first.
  const course = useQuery({
    queryKey: ['course', slug],
    queryFn: () => coursesApi.detail(slug),
  })
  const siblings = course.data?.labs ?? []
  const at = siblings.findIndex((l) => l.slug === labSlug)
  const prevLab: Lab | undefined = at > 0 ? siblings[at - 1] : undefined
  const nextLab: Lab | undefined =
    at >= 0 && at < siblings.length - 1 ? siblings[at + 1] : undefined

  // The component stays mounted when only the slug changes, so the step counter
  // would otherwise carry over and open the next lab on question four.
  useEffect(() => {
    setStep(0)
    setTab('Nhiệm vụ')
    setEnded('')
    setAttached(false)
  }, [labSlug])

  const stop = useMutation({
    mutationFn: (id: string) => labsApi.stop(id),
    onSettled: () => {
      qc.setQueryData(['lab-session'], null)
      // Unmounting the terminal detaches its close handler on purpose, so
      // onClosed never fires on this path and attached has to be cleared here
      // or the modal never comes back and the pane just sits empty.
      setAttached(false)
    },
  })

  const session = current.data ?? null
  const mine = session && lab.data ? session.lab_id === lab.data.id : false
  const tasks = lab.data?.tasks ?? []
  const task: LabTask | undefined = tasks[step]

  // Starting a lab belongs to the course page, so this screen is only ever
  // reached with a container already running. Anyone who typed the URL, or came
  // back to a stale tab, goes there to start one rather than being shown a
  // terminal with nothing behind it.
  if (!current.isLoading && !mine && !stop.isPending && !ended) {
    return <Navigate to={`/courses/${slug}`} replace />
  }

  if (lab.isError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <p className="text-danger">Không tìm thấy bài lab này.</p>
        <Link to={`/courses/${slug}`} className="text-sm text-accent-soft hover:underline">
          ← Về khoá học
        </Link>
      </div>
    )
  }

  return (
    // h-dvh, not h-screen: on mobile the browser chrome eats part of 100vh and
    // the terminal ends up scrolled under it.
    <div className="flex h-dvh flex-col overflow-hidden bg-bg">
      <TopBar
        courseSlug={slug}
        lab={lab.data}
        session={mine ? session : null}
        onStop={() => session && stop.mutate(session.id)}
        stopping={stop.isPending}
        prevLab={prevLab}
        nextLab={nextLab}
        position={at >= 0 ? `${at + 1}/${siblings.length}` : ''}
      />

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[340px] shrink-0 flex-col border-r border-border bg-surface">
          <StepNav
            step={step}
            total={tasks.length}
            onPrev={() => setStep((s) => Math.max(0, s - 1))}
            onNext={() => setStep((s) => Math.min(tasks.length - 1, s + 1))}
          />

          <nav className="flex gap-1 border-b border-border px-3">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={
                  'relative px-3 py-2.5 text-sm font-medium transition ' +
                  (tab === t
                    ? 'text-fg-strong after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-accent'
                    : 'text-fg-muted hover:text-fg-strong')
                }
              >
                {t}
              </button>
            ))}
          </nav>

          <div key={tab + step} className="page-enter min-h-0 flex-1 overflow-y-auto p-4">
            <TabBody tab={tab} task={task} lab={lab.data} />
          </div>

        </aside>

        <main className="flex min-w-0 flex-1 flex-col bg-[#12141c]">
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-white/10 px-4">
            <span className="font-mono text-sm text-zinc-300">Terminal</span>
            {session && mine && (
              <button
                onClick={() => stop.mutate(session.id)}
                disabled={stop.isPending}
                className="inline-flex items-center gap-1.5 text-xs text-zinc-400 transition hover:text-danger disabled:opacity-50"
              >
                <StopIcon className="h-3 w-3" />
                {stop.isPending ? 'Đang đóng…' : 'Kết thúc bài thực hành'}
              </button>
            )}
          </div>

          <div className="relative min-h-0 flex-1 p-2">
            {session && mine && (
              <LabTerminal
                terminalPath={session.terminal_path}
                onReady={() => setAttached(true)}
                onClosed={(reason) => {
                  setEnded(reason)
                  setAttached(false)
                  qc.setQueryData(['lab-session'], null)
                }}
              />
            )}

            {ended && <EndedPanel reason={ended} courseSlug={slug} />}

            {/* The container exists by the time this screen renders; what is
                left is the websocket attaching a shell to it. A spinner over
                the pane beats an empty black box that fills in later. */}
            {!attached && !ended && (
              <div className="absolute inset-0 z-10 flex items-center justify-center gap-2.5 bg-[#12141c] text-sm text-zinc-400">
                <span
                  aria-hidden="true"
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
                />
                Đang mở terminal…
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

/** Covers the terminal once the session is gone. The container has already been
    removed at this point, so there is nothing to go back to — only the reason
    and a way out. */
function EndedPanel({
  reason,
  courseSlug,
}: {
  reason: string
  courseSlug: string
}) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[#12141c] p-6 text-center">
      <p className="text-sm text-zinc-300">Phiên thực hành đã kết thúc</p>
      <p className="max-w-sm text-sm text-zinc-500">{reason}</p>
      <Link
        to={`/courses/${courseSlug}`}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition hover:bg-accent-hover"
      >
        Về khoá học để bắt đầu lại
      </Link>
    </div>
  )
}

function TopBar({
  courseSlug,
  lab,
  session,
  onStop,
  stopping,
  prevLab,
  nextLab,
  position,
}: {
  courseSlug: string
  lab?: LabDetail
  session: LabSession | null
  onStop: () => void
  stopping: boolean
  prevLab?: Lab
  nextLab?: Lab
  position: string
}) {
  const { user } = useAuth()
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-surface px-4">
      <Link to="/" className="font-bold text-fg-strong">
        DevForge
      </Link>

      {session ? (
        <>
          <Countdown expiresAt={session.expires_at} />
          <span className="rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success">
            Đang chạy
          </span>
        </>
      ) : (
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-fg-muted">
          Chưa bắt đầu
        </span>
      )}

      <span className="truncate text-sm text-fg-muted">
        {lab ? `Lab: ${lab.title}` : 'Đang tải…'}
        {position && (
          <span className="ml-2 font-mono text-xs text-fg-subtle">{position}</span>
        )}
      </span>

      <div className="ml-auto flex items-center gap-3">
        <button
          disabled
          title="Chấm điểm và nộp bài thuộc P4, chưa có ở bản này"
          className="cursor-not-allowed rounded-md bg-accent px-4 py-1.5 text-sm font-semibold text-accent-fg opacity-40"
        >
          Nộp bài
        </button>

        <div className="flex items-center gap-1">
          <LabArrow to={courseSlug} lab={prevLab} dir="prev" />
          <LabArrow to={courseSlug} lab={nextLab} dir="next" />
        </div>
        {session && (
          <button
            onClick={onStop}
            disabled={stopping}
            className="rounded-md border border-border-strong px-3 py-1.5 text-sm text-fg-muted transition hover:border-danger hover:text-danger disabled:opacity-50"
          >
            Kết thúc
          </button>
        )}
        <Link
          to={`/courses/${courseSlug}`}
          className="text-sm text-fg-muted transition hover:text-accent-soft"
        >
          Thoát
        </Link>
        {user && <Avatar user={user} className="h-8 w-8 text-xs" />}
      </div>
    </header>
  )
}

/** A span rather than a disabled Link at the ends of the course: react-router
    has no disabled state, and a link that navigates nowhere still looks
    clickable and still takes focus. */
function LabArrow({
  to,
  lab,
  dir,
}: {
  to: string
  lab?: Lab
  dir: 'prev' | 'next'
}) {
  const Chevron = dir === 'prev' ? ChevronLeftIcon : ChevronRightIcon
  const box =
    'flex h-8 w-8 items-center justify-center rounded-md border border-border-strong '

  if (!lab)
    return (
      <span className={box + 'text-fg-subtle opacity-40'} aria-hidden="true">
        <Chevron className="h-4 w-4" />
      </span>
    )

  return (
    <Link
      to={`/courses/${to}/labs/${lab.slug}`}
      title={lab.title}
      aria-label={(dir === 'prev' ? 'Lab trước: ' : 'Lab sau: ') + lab.title}
      className={box + 'text-fg-muted transition hover:border-accent hover:text-accent-soft'}
    >
      <Chevron className="h-4 w-4" />
    </Link>
  )
}

function StepNav({
  step,
  total,
  onPrev,
  onNext,
}: {
  step: number
  total: number
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border p-3">
      <button
        onClick={onPrev}
        disabled={step === 0}
        className="inline-flex items-center gap-1 rounded-md border border-border-strong px-2.5 py-1.5 text-sm text-fg-muted transition hover:text-fg-strong disabled:opacity-40"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        Quay lại
      </button>
      <span className="font-mono text-sm text-fg">
        {total === 0 ? '—' : `Câu ${step + 1} / ${total}`}
      </span>
      <button
        onClick={onNext}
        disabled={step >= total - 1}
        className="inline-flex items-center gap-1 rounded-md bg-accent px-2.5 py-1.5 text-sm font-medium text-accent-fg transition hover:bg-accent-hover disabled:opacity-40"
      >
        Tiếp theo
        <ChevronRightIcon className="h-4 w-4" />
      </button>
    </div>
  )
}

function TabBody({
  tab,
  task,
  lab,
}: {
  tab: Tab
  task?: LabTask
  lab?: LabDetail
}) {
  if (tab === 'Hướng dẫn')
    return <Prose text={lab?.description_md} empty="Bài này chưa có hướng dẫn." />

  if (!task)
    return <p className="text-sm text-fg-subtle">Bài này chưa có nhiệm vụ nào.</p>

  if (tab === 'Gợi ý')
    return (
      <Prose
        text={task.hint}
        empty="Chưa có gợi ý cho nhiệm vụ này — thử tự làm trong terminal trước."
      />
    )

  return (
    <div className="space-y-4">
      <p className="leading-relaxed text-fg">{task.title}</p>
      <div className="flex items-center gap-2 font-mono text-xs">
        <span className="rounded bg-muted px-2 py-0.5 text-accent-soft">
          {task.points} điểm
        </span>
      </div>
      <p className="rounded-md border border-dashed border-border-strong px-3 py-2.5 text-xs leading-relaxed text-fg-subtle">
        Gõ lệnh vào terminal bên phải để hoàn thành. Nút kiểm tra sẽ có khi phần
        chấm điểm được làm.
      </p>
    </div>
  )
}

/** Plain paragraphs rather than markdown: hints are one or two sentences, and
    pulling the renderer in here would load it on a page that does not need it. */
function Prose({ text, empty }: { text?: string; empty: string }) {
  if (!text?.trim()) return <p className="text-sm text-fg-subtle">{empty}</p>
  return (
    <div className="space-y-3 text-sm leading-relaxed text-fg">
      {text.split(/\n{2,}/).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  )
}


/** Counts from expires_at rather than ticking down a number handed over once, so
    a backgrounded tab wakes up showing the real remaining time. */
function Countdown({ expiresAt }: { expiresAt: string }) {
  const [left, setLeft] = useState(() => remaining(expiresAt))
  useEffect(() => {
    const t = setInterval(() => setLeft(remaining(expiresAt)), 1000)
    return () => clearInterval(t)
  }, [expiresAt])

  const mins = Math.floor(left / 60)
  return (
    <span
      className={
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-sm ' +
        (mins < 5 ? 'bg-danger/10 text-danger' : 'bg-muted text-fg')
      }
      title="Container sẽ tự bị xoá khi hết giờ"
    >
      <ClockIcon className="h-3.5 w-3.5" />
      {String(Math.floor(mins / 60)).padStart(2, '0')}:
      {String(mins % 60).padStart(2, '0')}:{String(left % 60).padStart(2, '0')}
    </span>
  )
}

function remaining(expiresAt: string): number {
  return Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000))
}
