import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { labsApi } from '@/api/labs'
import { coursesApi } from '@/api/courses'
import type { CheckResult, LabDetail, LabSession, LabTask } from '@/lib/types'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/Avatar'
import { LabTerminal } from '@/components/LabTerminal'
import { ConfirmModal } from '@/components/ConfirmModal'
import { Prose as Markdown } from '@/components/MarkdownEditor'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  TerminalIcon,
} from '@/components/icons'

const TABS = ['Nhiệm vụ', 'Gợi ý', 'Trợ lý'] as const

/** How the question is marked, said on the card so a student knows whether to
    look at the terminal or at the options. */
const KIND_LABEL: Record<LabTask['kind'], string> = {
  script: 'Thực hành',
  command: 'Gõ lệnh',
  choice: 'Lý thuyết',
}
type Tab = (typeof TABS)[number]

export default function LabRunner() {
  const { slug = '', labSlug = '' } = useParams()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [tab, setTab] = useState<Tab>('Nhiệm vụ')
  // Set by the terminal itself once the shell is attached. Nothing earlier is a
  // truthful signal that the lab is usable.
  const [attached, setAttached] = useState(false)
  // Ending removes the container and everything in it. Both buttons that do it
  // go through this dialog rather than doing it on the first click.
  const [confirmStop, setConfirmStop] = useState(false)
  const [confirmSubmit, setConfirmSubmit] = useState(false)

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

  // The component stays mounted when only the slug changes, so the step counter
  // would otherwise carry over and open the next lab on question four.
  useEffect(() => {
    setStep(0)
    setTab('Nhiệm vụ')
    setAttached(false)
    setPicked({})
    setReopened({})
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

  // Grading runs the task's script inside this session's container, so it is
  // addressed by session rather than by lab. Scoring itself is the server's,
  // and it already ignores repeat passes.
  const check = useMutation({
    mutationFn: (v: { sessionID: string; taskID: number; selected: number[] }) =>
      labsApi.check(v.sessionID, v.taskID, v.selected),
    // The server writes the pass down; the cached session still holds the list
    // from before it. Everything counting progress — the header, the counter,
    // the green box on a question stepped back to — reads that list, so without
    // this the whole screen says 0 done until the page is reloaded. Patched in
    // place rather than refetched: the id is already known here.
    onSuccess: (res, v) => {
      if (!res.passed) return
      qc.setQueryData<LabSession | null>(['lab-session'], (s) =>
        s && !s.passed_task_ids.includes(v.taskID)
          ? { ...s, passed_task_ids: [...s.passed_task_ids, v.taskID] }
          : s,
      )
    },
  })

  // Handing in ends the container the same way Stop does, so the session cache
  // is cleared with it. The report screen reads the session back by id and does
  // not need a running one.
  const submit = useMutation({
    mutationFn: (id: string) => labsApi.submit(id),
    onSuccess: (report) => {
      qc.setQueryData(['lab-session'], null)
      navigate(`/history/${report.session_id}?done=1`)
    },
  })

  // Ticks belong to the question, not to the panel showing it. Held here rather
  // than inside the panel because switching tab or question remounts that, and
  // stepping back to an answered question used to show empty boxes under a
  // green "correct".
  const [picked, setPicked] = useState<Record<number, number[]>>({})
  // Questions the student has gone back to and started re-answering. A pass on
  // record stops counting the moment the ticks under it change: the green box
  // would otherwise be praising an answer that is no longer on screen.
  const [reopened, setReopened] = useState<Record<number, boolean>>({})

  const session = current.data ?? null
  const tasks = lab.data?.tasks ?? []
  // Passed in THIS attempt. The submit button and the dialog both count off it,
  // and the server refuses a hand-in that does not agree.
  const done = tasks.filter((t) => session?.passed_task_ids.includes(t.id)).length
  const remainingTasks = tasks.length - done
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

  // "Is this session for this lab" needs both answers: the session carries a
  // lab_id, the URL carries a slug. Until both queries have landed the question
  // has no answer, and undefined says so rather than guessing false.
  const resolved = !current.isLoading && !lab.isLoading
  const mine = resolved
    ? Boolean(session && lab.data && session.lab_id === lab.data.id)
    : undefined

  // Starting a lab belongs to the course page, so this screen is only ever
  // reached with a container already running. Anyone who typed the URL, or came
  // back to a stale tab, goes there to start one rather than being shown a
  // terminal with nothing behind it.
  //
  // Only a resolved false redirects. Arriving from the start dialog lands here
  // with the session already in the cache but the lab still loading; reading
  // that as "not mine" bounced every student straight back to the course page
  // the instant they pressed Bắt đầu làm bài.
  // submit clears the session cache and then navigates to the report. Without
  // it here, the render in between reads "no session" and bounces to the course
  // page first, which wins.
  if (mine === false && !stop.isPending && !submit.isSuccess) {
    return <Navigate to={`/courses/${slug}`} replace />
  }

  return (
    // h-dvh, not h-screen: on mobile the browser chrome eats part of 100vh and
    // the terminal ends up scrolled under it.
    <div className="flex h-dvh flex-col overflow-hidden bg-bg">
      <TopBar
        lab={lab.data}
        session={mine ? session : null}
        onStop={() => setConfirmStop(true)}
        onSubmit={() => setConfirmSubmit(true)}
        submitting={submit.isPending}
        remaining={remainingTasks}
        stopping={stop.isPending}
        position={at >= 0 ? `${at + 1}/${siblings.length}` : ''}
      />

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[340px] shrink-0 flex-col border-r border-border bg-surface">
          <StepNav
            step={step}
            total={tasks.length}
            done={tasks.map((t) => Boolean(session?.passed_task_ids.includes(t.id)))}
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
            <TabBody
              tab={tab}
              task={task}
              lab={lab.data}
              // A verdict belongs to the task it was asked about. Comparing the
              // id is what stops the previous task's "chưa đúng" from greeting
              // the student on the next one.
              result={check.variables?.taskID === task?.id ? check.data : undefined}
              // Passed in THIS attempt, before stepping away from the question.
              // Without it a question answered a minute ago comes back looking
              // untouched; scoped to the session, so a lab opened again starts
              // over rather than arriving already ticked.
              passedEarlier={Boolean(
                task &&
                  session?.passed_task_ids.includes(task.id) &&
                  !reopened[task.id],
              )}
              picked={task ? (picked[task.id] ?? []) : []}
              onPick={(sel) => {
                if (!task) return
                setPicked((p) => ({ ...p, [task.id]: sel }))
                setReopened((r) => ({ ...r, [task.id]: true }))
              }}
              failed={check.variables?.taskID === task?.id && check.isError}
              checking={check.isPending}
              onCheck={(selected) =>
                session &&
                task &&
                check.mutate({ sessionID: session.id, taskID: task.id, selected })
              }
              onReset={() => check.reset()}
              onNext={() => setStep((s) => Math.min(tasks.length - 1, s + 1))}
              hasNext={step < tasks.length - 1}
              // Same dialog the header button opens. Finishing the last question
              // leaves the student at the bottom of this panel, and telling them
              // to go find Nộp bài up in the header is a scroll away from where
              // they are looking.
              onSubmit={() => setConfirmSubmit(true)}
              remaining={remainingTasks}
            />
          </div>

        </aside>

        <main className="flex min-w-0 flex-1 flex-col bg-[#12141c]">
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-white/10 px-4">
            <span className="font-mono text-sm text-zinc-300">Terminal</span>
          </div>

          <div className="relative min-h-0 flex-1 p-2">
            {session && mine && (
              <LabTerminal
                terminalPath={session.terminal_path}
                onReady={() => setAttached(true)}
                // The shell exiting means the session is over, and clearing the
                // cache is what the guard above reads to send them back to the
                // course page. No panel in between: there is nothing left on
                // this screen to do.
                onClosed={() => {
                  setAttached(false)
                  qc.setQueryData(['lab-session'], null)
                }}
              />
            )}

            {/* The container exists by the time this screen renders; what is
                left is the websocket attaching a shell to it. A spinner over
                the pane beats an empty black box that fills in later. */}
            {!attached && (
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

      {confirmStop && session && (
        <ConfirmModal
          title="Kết thúc bài thực hành?"
          confirmLabel={stop.isPending ? 'Đang đóng…' : 'Kết thúc'}
          tone="danger"
          busy={stop.isPending}
          onClose={() => setConfirmStop(false)}
          onConfirm={() => stop.mutate(session.id)}
        >
          <p>
            Container của bạn sẽ bị xoá cùng mọi thứ bên trong. Không mở lại
            được phiên này.
          </p>
          <p>
            Điểm các nhiệm vụ đã đạt vẫn được giữ — chỉ container là mất.
          </p>
        </ConfirmModal>
      )}

      {confirmSubmit && session && (
        <ConfirmModal
          title="Nộp bài?"
          confirmLabel={submit.isPending ? 'Đang nộp…' : 'Nộp bài'}
          busy={submit.isPending}
          onClose={() => setConfirmSubmit(false)}
          onConfirm={() => submit.mutate(session.id)}
        >
          <p>
            Kết quả được chốt lại và container bị xoá. Phiên này không làm tiếp
            được.
          </p>
          {/* The number that decides whether they press it, said before they do
              rather than on the screen afterwards. */}
          <p className="text-fg">
            Đã làm đúng{' '}
            <strong className="text-fg-strong">{done}</strong>/{tasks.length}{' '}
            nhiệm vụ.
          </p>
          {submit.isError && (
            <p className="text-danger">Không nộp được, thử lại.</p>
          )}
        </ConfirmModal>
      )}
    </div>
  )
}

function TopBar({
  lab,
  session,
  onStop,
  stopping,
  onSubmit,
  submitting,
  remaining,
  position,
}: {
  lab?: LabDetail
  session: LabSession | null
  onStop: () => void
  stopping: boolean
  onSubmit: () => void
  submitting: boolean
  /** Tasks still unpassed in this attempt. Handing in needs all of them done. */
  remaining: number
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
          onClick={onSubmit}
          disabled={!session || submitting || remaining > 0}
          title={
            remaining > 0
              ? `Còn ${remaining} nhiệm vụ chưa làm đúng — xong hết mới nộp được`
              : 'Nộp bài và xem kết quả'
          }
          className="rounded-md bg-accent px-4 py-1.5 text-sm font-semibold text-accent-fg transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? 'Đang nộp…' : 'Nộp bài'}
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
        {user && <Avatar user={user} className="h-8 w-8 text-xs" />}
      </div>
    </header>
  )
}

function StepNav({
  step,
  total,
  done,
  onPrev,
  onNext,
}: {
  step: number
  total: number
  /** Task ids passed in this attempt, by position. */
  done: boolean[]
  onPrev: () => void
  onNext: () => void
}) {
  const finished = done.filter(Boolean).length
  const pct = total > 0 ? (finished / total) * 100 : 0

  return (
    <div className="border-b border-border p-3">
      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          disabled={step === 0}
          aria-label="Câu trước"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border-strong text-fg-muted transition hover:text-fg-strong disabled:opacity-40"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-mono text-sm tabular-nums text-fg-strong">
              {total === 0 ? '—' : `Câu ${step + 1}`}
              {total > 0 && <span className="text-fg-subtle"> / {total}</span>}
            </p>
            <p className="text-xs tabular-nums text-fg-subtle">
              {finished}/{total} đã xong
            </p>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-success transition-[width]"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <button
          onClick={onNext}
          disabled={step >= total - 1}
          aria-label="Câu sau"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent text-accent-fg transition hover:bg-accent-hover disabled:opacity-40"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function TabBody({
  tab,
  task,
  lab,
  result,
  passedEarlier,
  picked,
  onPick,
  failed,
  checking,
  onCheck,
  onReset,
  onNext,
  hasNext,
  onSubmit,
  remaining,
}: {
  tab: Tab
  task?: LabTask
  lab?: LabDetail
  /** The verdict of the last check on *this* task, if there was one. */
  result?: CheckResult
  /** This task is already passed, from before the current verdict. */
  passedEarlier: boolean
  /** Indexes ticked on this task, kept by the screen so they survive a step. */
  picked: number[]
  onPick: (selected: number[]) => void
  failed: boolean
  checking: boolean
  /** Indexes ticked on a choice question; empty for a script one. */
  onCheck: (selected: number[]) => void
  onReset: () => void
  onNext: () => void
  hasNext: boolean
  onSubmit: () => void
  /** Questions not passed yet, so the last card can say what handing in costs. */
  remaining: number
}) {
  if (tab === 'Trợ lý') return <Assistant />

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
    <>
      {lab?.description_md?.trim() && (
        <details className="mb-4 rounded-lg border border-border bg-surface">
          <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium text-fg-strong [&::-webkit-details-marker]:hidden">
            Hướng dẫn bài lab
          </summary>
          <div className="border-t border-border px-3 py-2">
            <Prose text={lab.description_md} empty="" />
          </div>
        </details>
      )}
      <TaskBody
      key={task.id}
      task={task}
      result={result}
      passedEarlier={passedEarlier}
      picked={picked}
      onPick={onPick}
      failed={failed}
      checking={checking}
      onCheck={onCheck}
      onReset={onReset}
      onNext={onNext}
      hasNext={hasNext}
      onSubmit={onSubmit}
      remaining={remaining}
      />
    </>
  )
}

/** Placeholder for the question-answering assistant. Shipped empty on purpose:
 *  the tab is where students will look for it, and an empty tab that says when
 *  beats a tab that appears later and nobody notices. */
function Assistant() {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-muted text-fg-subtle">
        <TerminalIcon className="h-5 w-5" />
      </span>
      <p className="mt-3 flex items-center gap-2 text-sm font-medium text-fg">
        Trợ lý
        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-soft">
          Beta
        </span>
      </p>
      <p className="mt-1 max-w-xs text-sm text-fg-subtle">
        Sắp có: hỏi đáp về câu hỏi đang làm ngay tại đây. Trong lúc chờ, tab Gợi ý
        là nơi có manh mối.
      </p>
    </div>
  )
}

/** The question itself. Split out of TabBody so the ticked answers can live in
 *  state that resets with the task rather than persisting across questions. */
function TaskBody({
  task,
  result,
  passedEarlier,
  picked,
  onPick,
  failed,
  checking,
  onCheck,
  onReset,
  onNext,
  hasNext,
  onSubmit,
  remaining,
}: {
  task: LabTask
  result?: CheckResult
  passedEarlier: boolean
  picked: number[]
  onPick: (selected: number[]) => void
  failed: boolean
  checking: boolean
  onCheck: (selected: number[]) => void
  /** Drops the last verdict, which starts a fresh attempt. */
  onReset: () => void
  onNext: () => void
  hasNext: boolean
  onSubmit: () => void
  remaining: number
}) {
  const choice = task.kind === 'choice'

  // A pass recorded for this attempt counts, so a question answered a few steps
  // ago comes back answered rather than blank. No points on it: this is a record
  // of what happened, not a fresh award.
  const verdict: CheckResult | undefined =
    result ??
    (passedEarlier
      ? { passed: true, points_awarded: 0, lab_completed: false }
      : undefined)

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-border bg-bg">
        <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2">
          <span className="text-xs font-medium text-fg-muted">
            {KIND_LABEL[task.kind]}
          </span>
          <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-accent-soft">
            {task.points} điểm
          </span>
        </div>
        <p className="px-3 py-3 leading-relaxed font-medium text-fg-strong">
          {task.title}
        </p>
      </div>

      {choice && (
        <ul className="space-y-2">
          {task.options.map((text, i) => {
            const ticked = picked.includes(i)
            // Colour follows the verdict, not the selection: after answering,
            // green and red are what tell a student which of their ticks was
            // the right one, and an accent-coloured tick says nothing.
            const state = verdict && ticked ? (verdict.passed ? 'right' : 'wrong') : 'open'
            return (
              <li key={i}>
                <label
                  className={
                    'flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition ' +
                    (checking ? 'cursor-wait ' : 'cursor-pointer ') +
                    (state === 'right'
                      ? 'border-success/60 bg-success-soft text-success'
                      : state === 'wrong'
                        ? 'border-danger/60 bg-danger/10 text-danger'
                        : ticked
                          ? 'border-accent bg-accent/5 text-fg-strong'
                          : 'border-border text-fg hover:border-border-strong')
                  }
                >
                  {/* A radio where the question takes one answer: ticking a
                      second box on a one-answer question can only be a wrong
                      answer, and the server told us how many it takes without
                      saying which. */}
                  <input
                    type={task.single_answer ? 'radio' : 'checkbox'}
                    name={`task-${task.id}`}
                    checked={ticked}
                    // Only while a check is in flight. A passed question stays
                    // answerable: coming back to one the server recorded as
                    // passed shows no ticks, so locking it leaves the student
                    // looking at four empty boxes they cannot touch.
                    disabled={checking}
                    onChange={(e) => {
                      // Changing a tick is starting a new answer, so last one's
                      // verdict goes with it — the red boxes described the ticks
                      // that were there a moment ago, not these.
                      if (verdict) onReset()
                      onPick(
                        task.single_answer
                          ? [i]
                          : e.target.checked
                            ? [...picked, i]
                            : picked.filter((x) => x !== i),
                      )
                    }}
                    className={
                      'mt-0.5 h-4 w-4 shrink-0 ' +
                      (state === 'right'
                        ? 'accent-[var(--success)]'
                        : state === 'wrong'
                          ? 'accent-[var(--danger)]'
                          : 'accent-[var(--accent)]')
                    }
                  />
                  <span className="font-mono text-xs text-fg-subtle">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  <span className="min-w-0 flex-1">{text}</span>
                </label>
              </li>
            )
          })}
        </ul>
      )}

      {/* Two states, not three: passed, or the check button. A wrong answer used
          to park a "try again" button in front of the check one, which meant two
          clicks to do the one thing — fix it in the terminal, check again. */}
      {verdict?.passed ? (
        hasNext ? (
          <button
            onClick={onNext}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 font-medium text-accent-fg transition hover:bg-accent-hover"
          >
            Câu hỏi tiếp theo
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-center text-sm text-fg-muted">
              {remaining === 0
                ? 'Đây là câu cuối, bạn đã làm xong hết.'
                : `Đây là câu cuối. Còn ${remaining} câu chưa làm đúng.`}
            </p>
            {/* The server refuses a hand-in with anything left unpassed, so the
                button says so here rather than letting the click come back a
                409 from a dialog the student already confirmed. */}
            <button
              onClick={onSubmit}
              disabled={remaining > 0}
              title={
                remaining > 0
                  ? `Còn ${remaining} nhiệm vụ chưa làm đúng — xong hết mới nộp được`
                  : 'Nộp bài và xem kết quả'
              }
              className="inline-flex w-full items-center justify-center rounded-md bg-success px-4 py-2.5 font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100"
            >
              Nộp bài
            </button>
          </div>
        )
      ) : (
        <button
          onClick={() => onCheck(picked)}
          disabled={checking || (choice && picked.length === 0)}
          className={
            'inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 font-medium text-accent-fg transition hover:bg-accent-hover disabled:opacity-70 ' +
            (checking ? 'disabled:cursor-wait' : 'disabled:cursor-not-allowed')
          }
        >
          {checking && (
            <span
              aria-hidden="true"
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
          )}
          {checking ? 'Đang kiểm tra…' : choice ? 'Trả lời' : 'Đã hoàn thành'}
        </button>
      )}

      {/* result, not verdict: this is what the last press of the button said.
          A question passed in an earlier session was not just answered, and
          congratulating a student for ticks they have not made reads as the
          screen answering for them. The "đã xong" badge says the rest. */}
      {result?.passed && (
        <p className="rounded-md border border-success/40 bg-success-soft px-3 py-2.5 text-sm text-success">
          Câu trả lời chính xác!
          {result.points_awarded > 0 && ` +${result.points_awarded} điểm`}
          {result.lab_completed && ' — bạn đã hoàn thành cả bài lab.'}
        </p>
      )}
      {/* Gone while the next check runs: a red box under a spinner reads as the
          verdict on the attempt being made, and it is the one before it. */}
      {verdict && !verdict.passed && !checking && (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger">
          {choice
            ? 'Chưa đúng. Câu này có thể có nhiều đáp án — xem tab Gợi ý nếu cần.'
            : task.kind === 'command'
              ? 'Chưa thấy lệnh nào khớp. Chạy lệnh trong terminal rồi bấm lại — xem tab Gợi ý nếu cần.'
              : 'Chưa đạt. Làm trong terminal rồi bấm kiểm tra lại — xem tab Gợi ý nếu cần.'}
        </p>
      )}
      {failed && (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger">
          Không chấm được lúc này. Kiểm tra phiên lab còn chạy rồi thử lại.
        </p>
      )}

      {task.kind === 'script' && !verdict?.passed && (
        <p className="rounded-md border border-dashed border-border-strong px-3 py-2.5 text-xs leading-relaxed text-fg-subtle">
          Gõ lệnh vào terminal bên phải, xong thì bấm nút trên. Bài chấm theo kết
          quả trong container, không theo câu lệnh bạn gõ.
        </p>
      )}
      {task.kind === 'command' && !verdict?.passed && (
        <p className="rounded-md border border-dashed border-border-strong px-3 py-2.5 text-xs leading-relaxed text-fg-subtle">
          Chạy lệnh trong terminal bên phải, xong thì bấm nút trên. Câu này chấm
          theo lệnh bạn đã gõ, nên gõ đúng lệnh chứ đừng chỉ đọc.
        </p>
      )}
    </div>
  )
}

/** Markdown, the same renderer the admin previews with. Plain paragraphs were
    fine while hints were one sentence; a hint with a command or a list in it
    used to arrive as one run-on block. */
function Prose({ text, empty }: { text?: string; empty: string }) {
  if (!text?.trim()) return <p className="text-sm text-fg-subtle">{empty}</p>
  return <Markdown>{text}</Markdown>
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
