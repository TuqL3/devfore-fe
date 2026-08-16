import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { labsApi } from '@/api/labs'
import { coursesApi } from '@/api/courses'
import { ApiError } from '@/lib/api'
import type { CheckResult, LabDetail, LabSession, LabTask } from '@/lib/types'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/Avatar'
import { LabTerminal } from '@/components/LabTerminal'
import { SimEditor } from '@/components/SimEditor'
import { ConfirmModal } from '@/components/ConfirmModal'
import { IncidentBar } from '@/components/IncidentBar'
import { Prose as Markdown } from '@/components/MarkdownEditor'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  TerminalIcon,
} from '@/components/icons'

// Ids, not labels — the active tab is compared by value.
const TABS = [
  { id: 'task', label: 'Tasks' },
  { id: 'hint', label: 'Hints' },
  { id: 'assistant', label: 'Assistant' },
] as const satisfies readonly { id: string; label: string }[]

/** How the question is marked, said on the card so a student knows whether to
    look at the terminal or at the options. */
const KIND_LABEL: Record<LabTask['kind'], string> = {
  script: 'Hands-on',
  command: 'Type a command',
  choice: 'Theory',
  sim: 'Pipeline',
}
type Tab = (typeof TABS)[number]['id']

/** Browser back while a container is still up.
 *
 *  react-router's `useBlocker` is the obvious tool and cannot be used: it calls
 *  `useDataRouterContext`, and this app mounts `<BrowserRouter>` rather than a
 *  data router. Moving the whole route tree onto `createBrowserRouter` to gain
 *  one dialog is a refactor of every provider in `main.tsx`, so the guard is done
 *  against history directly.
 *
 *  How it works: an extra entry is pushed on top of the lab URL, so the first
 *  back lands on the lab again rather than leaving. The popstate handler pushes
 *  it straight back and reports the attempt. Nothing navigates until the caller
 *  decides to.
 *
 *  Closing the tab and reloading go through `beforeunload` instead, because no
 *  handler can stop those — the most a page may do is ask the browser to ask.
 *  That prompt is the browser's own: its wording is fixed, it cannot be styled,
 *  and Chrome and Firefox both refuse to show it at all until the page has been
 *  interacted with. Two different-looking prompts is the price of covering both
 *  exits; one exit left unguarded was the alternative.
 */
function useLeaveGuard(active: boolean, onAttempt: () => void) {
  // Read at pop time, not at subscribe time: the handler outlives the render
  // that created it, and re-subscribing on every change would push a new
  // history entry each time.
  const attempt = useRef(onAttempt)
  attempt.current = onAttempt

  useEffect(() => {
    if (!active) return
    window.history.pushState(null, '', window.location.href)
    const onPop = () => {
      // Put the entry back first: the browser has already moved, and this is
      // what moves it back before anything is rendered against the new URL.
      window.history.pushState(null, '', window.location.href)
      attempt.current()
    }

    // Tab close and reload. preventDefault is what asks for the prompt; the
    // returnValue assignment is the older spelling of the same request, kept
    // because Safari still reads it and ignoring it costs one line.
    //
    // No attempt.current() here: the dialog this file draws would never be seen
    // — the page is already on its way out, and a React state update at that
    // point renders into a document nobody will look at again.
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }

    window.addEventListener('popstate', onPop)
    window.addEventListener('beforeunload', onUnload)
    return () => {
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('beforeunload', onUnload)
    }
  }, [active])
}

/** Màn làm bài, dùng cho cả hai đường vào.
 *
 *  `drill` bật khi nó là một thử thách War Room: cùng container, cùng terminal,
 *  cùng đường chấm — chỉ khác chỗ nó thuộc về. Không có khoá học nào để hỏi bài
 *  trước/bài sau, và nút quay lại trỏ về `/war-room`.
 *
 *  Một component chứ không phải hai: khác biệt là bốn dòng, còn thứ giống nhau là
 *  cả cái terminal, đồng hồ, ô nhiệm vụ và luồng nộp bài. Hai bản sao của chừng
 *  đó là hai chỗ để lệch nhau. */
export default function LabRunner({ drill = false }: { drill?: boolean }) {
  const { slug = '', labSlug = '' } = useParams()
  // Chỗ quay ra khi phiên không phải của màn này: danh sách thử thách, hoặc
  // trang khoá học đã dẫn tới đây.
  const backTo = drill ? '/war-room' : `/courses/${slug}`
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [tab, setTab] = useState<Tab>('task')
  // Set by the terminal itself once the shell is attached. Nothing earlier is a
  // truthful signal that the lab is usable.
  const [attached, setAttached] = useState(false)
  // Ending removes the container and everything in it. Both buttons that do it
  // go through this dialog rather than doing it on the first click.
  // Why the end-lab dialog is open, not just whether. Leaving by the back
  // button offers a third answer the header button has no use for — walk away
  // and let the session run — so the dialog has to know which it is.
  const [confirmStop, setConfirmStop] = useState<'button' | 'leave' | null>(null)
  const [confirmSubmit, setConfirmSubmit] = useState(false)

  const lab = useQuery({
    queryKey: drill ? ['drill', labSlug] : ['lab', slug, labSlug],
    queryFn: () => (drill ? labsApi.drill(labSlug) : labsApi.detail(slug, labSlug)),
  })
  const current = useQuery({ queryKey: ['lab-session'], queryFn: labsApi.current })

  // Same query key the course page uses, so arriving from there costs nothing.
  // The labs come back in order_idx order, which is what makes prev/next here
  // a lookup rather than a second endpoint to keep in step with the first.
  const course = useQuery({
    queryKey: ['course', slug],
    queryFn: () => coursesApi.detail(slug),
    // Một thử thách không thuộc khoá nào, nên không có gì để hỏi — và hỏi thì
    // nhận 404 của một khoá đang ẩn.
    enabled: !drill,
  })
  const siblings = course.data?.labs ?? []
  const at = siblings.findIndex((l) => l.slug === labSlug)

  // The component stays mounted when only the slug changes, so the step counter
  // would otherwise carry over and open the next lab on question four.
  useEffect(() => {
    setStep(0)
    setTab('task')
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
  // Có kịch bản là lab mô phỏng. Một trường, không phải một cờ riêng đi kèm —
  // hai thứ có thể nói khác nhau, một thứ thì không.
  const sim = lab.data?.sim_scenario ?? null
  const tasks = lab.data?.tasks ?? []
  // Passed in THIS attempt. The submit button and the dialog both count off it,
  // and the server refuses a hand-in that does not agree.
  const done = tasks.filter((t) => session?.passed_task_ids.includes(t.id)).length
  const remainingTasks = tasks.length - done
  const task: LabTask | undefined = tasks[step]

  // "Is this session for this lab" needs both answers: the session carries a
  // lab_id, the URL carries a slug. Until both queries have landed the question
  // has no answer, and undefined says so rather than guessing false.
  //
  // Computed above the error branch below, not next to the guard that reads it:
  // useLeaveGuard is a hook and every return in this component has to come
  // after it, or the hook order changes between renders.
  const resolved = !current.isLoading && !lab.isLoading
  const mine = resolved
    ? Boolean(session && lab.data && session.lab_id === lab.data.id)
    : undefined

  // Off the moment the session is being closed or handed in: those paths
  // navigate on purpose, and blocking them would trap the student on a screen
  // whose container no longer exists.
  useLeaveGuard(
    Boolean(mine && session) &&
      !stop.isPending &&
      !submit.isPending &&
      !submit.isSuccess,
    () => setConfirmStop('leave'),
  )

  if (lab.isError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <p className="text-danger">
          {drill ? 'This challenge was not found.' : 'This lab was not found.'}
        </p>
        <Link to={backTo} className="text-sm text-accent-soft hover:underline">
          ← {drill ? 'Back to War Room' : 'Back to the course'}
        </Link>
      </div>
    )
  }


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
    return <Navigate to={backTo} replace />
  }

  return (
    // h-dvh, not h-screen: on mobile the browser chrome eats part of 100vh and
    // the terminal ends up scrolled under it.
    <div className="flex h-dvh flex-col overflow-hidden bg-bg">
      <TopBar
        lab={lab.data}
        session={mine ? session : null}
        onStop={() => setConfirmStop('button')}
        onLeave={() => (mine && session ? setConfirmStop('leave') : navigate('/'))}
        onSubmit={() => setConfirmSubmit(true)}
        submitting={submit.isPending}
        remaining={remainingTasks}
        stopping={stop.isPending}
        drill={drill}
        position={at >= 0 ? `${at + 1}/${siblings.length}` : ''}
      />

      {/* Chỉ hiện với phiên bốc trúng sự cố. Nằm dưới thanh trên cùng chứ không
          chen vào trong nó: đây là trạng thái của hệ thống đang hỏng, không phải
          một nút bấm, và nó phải rộng bằng cả màn hình mới đúng trọng lượng. */}
      {mine && session?.incident && (
        <IncidentBar
          startedAt={session.started_at}
          rps={session.incident.rps}
          live={remainingTasks > 0}
        />
      )}

      <div className="flex min-h-0 flex-1">
        {/* Bề rộng co theo màn hình thay vì cứng 340px: đề bài có khối lệnh, và
            ở 340px thì mọi dòng lệnh đều phải cuộn ngang trong khi nửa màn hình
            bên phải bỏ trống. clamp giữ hai đầu — dưới 340 thì chữ gãy vụn, trên
            560 thì terminal bắt đầu mất chỗ. */}
        <aside className="flex w-[clamp(340px,26vw,560px)] shrink-0 flex-col border-r border-border bg-surface">
          <StepNav
            step={step}
            total={tasks.length}
            done={tasks.map((t) => Boolean(session?.passed_task_ids.includes(t.id)))}
            onPrev={() => setStep((s) => Math.max(0, s - 1))}
            onNext={() => setStep((s) => Math.min(tasks.length - 1, s + 1))}
          />

          <nav className="flex gap-1 border-b border-border px-3">
            {TABS.map((x) => (
              <button
                key={x.id}
                onClick={() => setTab(x.id)}
                className={
                  'relative px-3 py-2.5 text-sm font-medium transition ' +
                  (tab === x.id
                    ? 'text-fg-strong after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-accent'
                    : 'text-fg-muted hover:text-fg-strong')
                }
              >
                {x.label}
              </button>
            ))}
          </nav>

          <div key={tab + step} className="page-enter min-h-0 flex-1 overflow-y-auto p-4">
            <TabBody
              tab={tab}
              task={task}
              lab={lab.data}
              drill={drill}
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
              // Chấm một bài mô phỏng có một cách hỏng mà học viên sửa được:
              // chưa chạy pipeline lượt nào. Câu của server nói đúng điều đó,
              // nên nó được hiện nguyên văn thay vì "không chấm được".
              failMessage={
                check.error instanceof ApiError ? check.error.message : ''
              }
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

        {/* Một bài mô phỏng không có container nên cũng không có terminal. Chỗ
            đó là nơi viết pipeline — cùng vị trí trên màn hình, vì với học viên
            nó là cùng một việc: chỗ để làm bài. */}
        {sim ? (
          <main className="flex min-w-0 flex-1 flex-col bg-surface">
            <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-4">
              <span className="font-mono text-sm text-fg-muted">Simulated pipeline</span>
              <span className="text-xs text-fg-subtle">
                simulated time, not measured from a real CI
              </span>
            </div>
            {session && mine ? (
              <SimEditor
                // Đổi phiên là đổi lịch sử lượt chạy và đổi cả ô soạn thảo. Không
                // có key thì pipeline của phiên trước ở lại trên màn hình mới.
                key={session.id}
                sessionID={session.id}
                scenario={sim}
                live={session.status === 'running'}
              />
            ) : (
              <p className="p-4 text-sm text-fg-subtle">Opening the lab…</p>
            )}
          </main>
        ) : (
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
                Opening the terminal…
              </div>
            )}
          </div>
        </main>
        )}
      </div>

      {confirmStop && session && (
        <ConfirmModal
          title={confirmStop === 'leave' ? 'Leave the lab?' : 'End this lab session?'}
          confirmLabel={
            stop.isPending
              ? 'Closing…'
              : confirmStop === 'leave'
                ? 'End it and leave'
                : 'End'
          }
          tone="danger"
          busy={stop.isPending}
          onClose={() => setConfirmStop(null)}
          onConfirm={() => stop.mutate(session.id)}
        >
          {/* Said first when they were on their way out: the thing they are
              about to lose is not obvious, and "ending" is not what pressing
              back asked for. */}
          {confirmStop === 'leave' && <p>The session is still running. Leaving keeps the clock ticking and the container alive — you can come back to it any time from History.</p>}
          <p>
            {sim ? 'This session closes and the pipeline runs cannot continue.' : 'Your container is deleted along with everything inside it. This session cannot be reopened.'}
          </p>
          <p>
            Points from tasks you passed are kept — only the{' '}
            {sim ? 'session' : 'container'} is lost.
          </p>
          {/* The answer the header button has no use for. Without it the guard
              would take away the one thing back used to do — step out and come
              back later — and leave no way to do it at all. */}
          {confirmStop === 'leave' && !stop.isPending && (
            <button
              type="button"
              onClick={() => {
                setConfirmStop(null)
                navigate(backTo)
              }}
              className="text-sm text-accent-soft transition hover:underline"
            >
              Leave, keep it running →
            </button>
          )}
        </ConfirmModal>
      )}

      {confirmSubmit && session && (
        <ConfirmModal
          title="Hand in?"
          confirmLabel={submit.isPending ? 'Handing in…' : 'Hand in'}
          busy={submit.isPending}
          onClose={() => setConfirmSubmit(false)}
          onConfirm={() => submit.mutate(session.id)}
        >
          <p>
            Your result is finalised
            {sim ? '' : ' and the container is deleted'}
            . This session cannot be continued.
          </p>
          {/* The number that decides whether they press it, said before they do
              rather than on the screen afterwards. */}
          <p className="text-fg">
            You have passed{' '}
            <strong className="text-fg-strong">{done}</strong>/{tasks.length}{' '}
            tasks.
          </p>
          {submit.isError && (
            <p className="text-danger">Could not hand in, try again.</p>
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
  onLeave,
  stopping,
  onSubmit,
  submitting,
  remaining,
  position,
  drill,
}: {
  lab?: LabDetail
  session: LabSession | null
  /** Ca trực gọi tên khác lab của khoá học — cùng màn hình, không cùng thứ. */
  drill: boolean
  onStop: () => void
  /** Pressing the wordmark walks away from a live container, so it asks first. */
  onLeave: () => void
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
      {/* A button, not a Link: leaving by this is leaving a container running,
          exactly as pressing back is, and the two have to ask the same question.
          The history guard cannot see an in-app navigation, so this one reports
          itself. */}
      <button
        onClick={onLeave}
        className="font-bold text-fg-strong transition hover:text-accent-soft"
      >
        DevForge
      </button>

      {session ? (
        <>
          <Countdown expiresAt={session.expires_at} />
          <span className="rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success">
            Running
          </span>
        </>
      ) : (
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-fg-muted">
          Not started
        </span>
      )}

      <span className="truncate text-sm text-fg-muted">
        {lab
          ? `${drill ? 'Shift' : 'Lab'}: ${lab.title}`
          : 'Loading…'}
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
              ? `${remaining} tasks still unpassed — all of them must pass before handing in`
              : 'Hand in and see the result'
          }
          className="rounded-md bg-accent px-4 py-1.5 text-sm font-semibold text-accent-fg transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? 'Handing in…' : 'Hand in'}
        </button>

        {session && (
          <button
            onClick={onStop}
            disabled={stopping}
            className="rounded-md border border-border-strong px-3 py-1.5 text-sm text-fg-muted transition hover:border-danger hover:text-danger disabled:opacity-50"
          >
            End
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
          aria-label="Previous question"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border-strong text-fg-muted transition hover:text-fg-strong disabled:opacity-40"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-mono text-sm tabular-nums text-fg-strong">
              {total === 0 ? '—' : `Question ${step + 1}`}
              {total > 0 && <span className="text-fg-subtle"> / {total}</span>}
            </p>
            <p className="text-xs tabular-nums text-fg-subtle">
              {finished}/{total} done
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
          aria-label="Next question"
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
  drill,
  result,
  passedEarlier,
  picked,
  onPick,
  failed,
  failMessage,
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
  /** Ca trực: đề bài mở sẵn, vì đồng hồ đã chạy trước khi màn này hiện ra. */
  drill: boolean
  /** The verdict of the last check on *this* task, if there was one. */
  result?: CheckResult
  /** This task is already passed, from before the current verdict. */
  passedEarlier: boolean
  /** Indexes ticked on this task, kept by the screen so they survive a step. */
  picked: number[]
  onPick: (selected: number[]) => void
  failed: boolean
  /** What the server said when the check itself could not run. */
  failMessage: string
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
  if (tab === 'assistant') return <Assistant />

  if (!task)
    return <p className="text-sm text-fg-subtle">This lab has no tasks yet.</p>

  if (tab === 'hint')
    return <Prose text={task.hint} empty="No hint for this task — try it in the terminal first." />

  return (
    <>
      {lab?.description_md?.trim() && (
        // Mở sẵn khi là ca trực: đồng hồ đã chạy từ lúc container lên, nên bắt
        // người ta bấm một lần nữa mới thấy đề bài là ăn cắp giây của họ. Bài
        // của khoá học không có đồng hồ nên vẫn gập, để chỗ cho nhiệm vụ.
        <details open={drill} className="mb-4 rounded-lg border border-border bg-surface">
          <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium text-fg-strong [&::-webkit-details-marker]:hidden">
            {drill ? 'Shift brief' : 'Lab instructions'}
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
      failMessage={failMessage}
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
        Assistant
        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-soft">
          Beta
        </span>
      </p>
      <p className="mt-1 max-w-xs text-sm text-fg-subtle">
        Coming soon: ask about the question you are on, right here. In the meantime, the Hints tab is where the clues are.
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
  failMessage,
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
  failMessage: string
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
            {task.points} points
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
            Next question
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-center text-sm text-fg-muted">
              {remaining === 0
                ? 'This is the last question, and you have finished them all.'
                : `This is the last question. ${remaining} still unpassed.`}
            </p>
            {/* The server refuses a hand-in with anything left unpassed, so the
                button says so here rather than letting the click come back a
                409 from a dialog the student already confirmed. */}
            <button
              onClick={onSubmit}
              disabled={remaining > 0}
              title={
                remaining > 0
                  ? `${remaining} tasks still unpassed — all of them must pass before handing in`
                  : 'Hand in and see the result'
              }
              className="inline-flex w-full items-center justify-center rounded-md bg-success px-4 py-2.5 font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100"
            >
              Hand in
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
          {checking
            ? 'Checking…'
            : choice
              ? 'Answer'
              : task.kind === 'sim'
                ? 'Grade the latest run'
                : 'Mark as done'}
        </button>
      )}

      {/* result, not verdict: this is what the last press of the button said.
          A question passed in an earlier session was not just answered, and
          congratulating a student for ticks they have not made reads as the
          screen answering for them. The "đã xong" badge says the rest. */}
      {result?.passed && (
        <p className="rounded-md border border-success/40 bg-success-soft px-3 py-2.5 text-sm text-success">
          Correct answer!
          {result.points_awarded > 0 &&
            ` +${result.points_awarded} points`}
          {result.lab_completed && ' — you have completed the whole lab.'}
        </p>
      )}
      {/* Gone while the next check runs: a red box under a spinner reads as the
          verdict on the attempt being made, and it is the one before it. */}
      {verdict && !verdict.passed && !checking && (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger">
          {choice
            ? 'Not right yet. This question may take more than one answer — check the Hints tab if you need it.'
            : task.kind === 'command'
              ? 'No matching command found. Run it in the terminal and press again — check the Hints tab if you need it.'
              : task.kind === 'sim'
                ? 'The latest run does not meet the requirement. Fix the pipeline, run it again, then press grade — check the Hints tab if you need it.'
                : 'Not there yet. Do it in the terminal and press check again — check the Hints tab if you need it.'}
        </p>
      )}
      {failed && (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger">
          {/* Câu của server khi có: "hãy chạy pipeline một lượt trước khi nộp"
              là việc học viên làm được, còn "không chấm được" thì không. */}
          {failMessage || 'Cannot grade right now. Check that the lab session is still running, then try again.'}
        </p>
      )}

      {task.kind === 'script' && !verdict?.passed && (
        <p className="rounded-md border border-dashed border-border-strong px-3 py-2.5 text-xs leading-relaxed text-fg-subtle">
          Type commands into the terminal on the right, then press the button above. Grading reads the result inside the container, not the commands you typed.
        </p>
      )}
      {task.kind === 'command' && !verdict?.passed && (
        <p className="rounded-md border border-dashed border-border-strong px-3 py-2.5 text-xs leading-relaxed text-fg-subtle">
          Run the command in the terminal on the right, then press the button above. This question is graded on the command you typed, so type it rather than only reading it.
        </p>
      )}
      {task.kind === 'sim' && !verdict?.passed && (
        <p className="rounded-md border border-dashed border-border-strong px-3 py-2.5 text-xs leading-relaxed text-fg-subtle">
          Write the pipeline on the right, then press Run pipeline. Grading reads the{' '}
          <strong className="text-fg-muted">latest run</strong>
          , not the text you are typing — run it again after every edit. The seconds are simulated time: what is worth learning is the ratio between arrangements, not the number.
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
      title="The container is deleted automatically when time runs out"
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
