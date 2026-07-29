import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { labsApi } from '@/api/labs'
import { ApiError } from '@/lib/api'
import type { LabDetail, LabSession, LabTask } from '@/lib/types'
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
  const [notice, setNotice] = useState('')

  const lab = useQuery({
    queryKey: ['lab', slug, labSlug],
    queryFn: () => labsApi.detail(slug, labSlug),
  })
  const current = useQuery({ queryKey: ['lab-session'], queryFn: labsApi.current })

  const start = useMutation({
    mutationFn: () => labsApi.start(labSlug),
    onSuccess: (s) => {
      setNotice('')
      qc.setQueryData(['lab-session'], s)
    },
    onError: (e) =>
      setNotice(e instanceof ApiError ? e.message : 'không khởi động được lab'),
  })
  const stop = useMutation({
    mutationFn: (id: string) => labsApi.stop(id),
    onSettled: () => qc.setQueryData(['lab-session'], null),
  })

  const session = current.data ?? null
  const mine = session && lab.data ? session.lab_id === lab.data.id : false
  const tasks = lab.data?.tasks ?? []
  const task: LabTask | undefined = tasks[step]

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

          {notice && (
            <p className="border-t border-danger/30 bg-danger/10 px-4 py-2.5 text-sm text-danger">
              {notice}
            </p>
          )}
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

          <div className="min-h-0 flex-1 p-2">
            {session && mine ? (
              <LabTerminal
                terminalPath={session.terminal_path}
                onClosed={(reason) => {
                  setNotice(reason)
                  qc.setQueryData(['lab-session'], null)
                }}
              />
            ) : (
              <StartPanel
                busy={start.isPending || current.isLoading}
                blocked={Boolean(session && !mine)}
                onStart={() => start.mutate()}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

function TopBar({
  courseSlug,
  lab,
  session,
  onStop,
  stopping,
}: {
  courseSlug: string
  lab?: LabDetail
  session: LabSession | null
  onStop: () => void
  stopping: boolean
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
      </span>

      <div className="ml-auto flex items-center gap-3">
        <button
          disabled
          title="Chấm điểm và nộp bài thuộc P4, chưa có ở bản này"
          className="cursor-not-allowed rounded-md bg-accent px-4 py-1.5 text-sm font-semibold text-accent-fg opacity-40"
        >
          Nộp bài
        </button>
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

function StartPanel({
  busy,
  blocked,
  onStart,
}: {
  busy: boolean
  blocked: boolean
  onStart: () => void
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <p className="max-w-sm text-sm text-zinc-400">
        {blocked
          ? 'Bạn đang có một phiên lab khác đang chạy. Mỗi lúc chỉ được mở một phiên.'
          : 'Container riêng của bạn sẽ được tạo và tự xoá sau 60 phút.'}
      </p>
      {!blocked && (
        <button
          onClick={onStart}
          disabled={busy}
          className="rounded-md bg-accent px-5 py-2.5 font-medium text-accent-fg transition hover:bg-accent-hover disabled:opacity-60"
        >
          {busy ? 'Đang khởi động…' : 'Bắt đầu làm bài'}
        </button>
      )}
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
