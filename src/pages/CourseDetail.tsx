import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { coursesApi } from '@/api/courses'
import { labsApi } from '@/api/labs'
import { ApiError } from '@/lib/api'
import { LabStartModal, type StartPhase } from '@/components/LabStartModal'
import { useAuth } from '@/context/AuthContext'
import type { CourseDetail as Course, Lab } from '@/lib/types'
import { useLevels } from '@/lib/levels'
import { LevelMeter } from '@/components/LevelMeter'
import { ArrowLeftIcon, BookIcon, CheckIcon } from '@/components/icons'
import { timeAgo } from '@/lib/relativeTime'

// Ids, not labels: the active tab is compared by value, and a label that
// changes with the language would silently reset which tab is open.
const TABS = [
  { id: 'content', label: 'Course content' },
  { id: 'reviews', label: 'Review' },
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'status', label: 'Status' },
] as const satisfies readonly { id: string; label: string }[]
type Tab = (typeof TABS)[number]['id']

const totalMinutes = (labs: Lab[]) =>
  labs.reduce((n, l) => n + l.duration_minutes, 0)

/** Queries behind the tabs that are not loaded with the course itself. */
const TAB_QUERY: Partial<Record<Tab, (slug: string) => unknown>> = {
  reviews: (slug) => ({
    queryKey: ['course', slug, 'reviews'],
    queryFn: () => coursesApi.reviews(slug),
  }),
  leaderboard: (slug) => ({
    queryKey: ['course', slug, 'leaderboard'],
    queryFn: () => coursesApi.leaderboard(slug),
  }),
}

export default function CourseDetail() {
  const { slug = '' } = useParams()
  const [tab, setTab] = useState<Tab>('content')
  const qc = useQueryClient()

  // Warm the tab's data on hover so clicking lands on content, not a skeleton.
  const prefetch = (id: Tab) => {
    const build = TAB_QUERY[id]
    if (build) qc.prefetchQuery(build(slug) as never)
  }

  const {
    data: course,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['course', slug],
    queryFn: () => coursesApi.detail(slug),
  })

  if (isLoading) return <DetailSkeleton />
  if (isError || !course)
    return (
      <div className="py-16 text-center">
        <p className="text-danger">Course not found.</p>
        <Link
          to="/courses"
          className="mt-3 inline-block text-sm text-accent-soft hover:underline"
        >
          ← Back to the course list
        </Link>
      </div>
    )

  return (
    <div className="space-y-8">
      <Header course={course} />
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="order-2 lg:order-1">
          <div className="flex flex-wrap gap-2 border-b border-border pb-px">
            {TABS.map((x) => (
              <button
                key={x.id}
                onClick={() => setTab(x.id)}
                onMouseEnter={() => prefetch(x.id)}
                onFocus={() => prefetch(x.id)}
                className={
                  'rounded-t-md px-4 py-2 text-sm font-medium transition ' +
                  (tab === x.id
                    ? 'border-b-2 border-accent bg-muted text-fg-strong'
                    : 'border-b-2 border-transparent text-fg-muted hover:bg-muted hover:text-fg-strong')
                }
              >
                {x.label}
                {x.id === 'content' && course.labs.length > 0 && (
                  <span className="ml-2 font-mono text-xs text-fg-subtle">
                    {course.labs.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* key replays the fade; min-h stops the short tabs from collapsing
              the page height as you switch. */}
          <div key={tab} className="page-enter min-h-80 pt-6">
            {tab === 'content' && (
              <ContentTab
                labs={course.labs}
                slug={course.slug}
                enrolled={course.enrolled}
              />
            )}
            {tab === 'reviews' && <ReviewsTab slug={slug} courseID={course.id} />}
            {tab === 'leaderboard' && <LeaderboardTab slug={slug} />}
            {tab === 'status' && <StatusTab course={course} />}
          </div>
        </div>

        <Sidebar course={course} />
      </div>
    </div>
  )
}

/** Title block spanning the full width; the sidebar keeps the enrol action. */
function Header({ course }: { course: Course }) {
  const { label: levelName } = useLevels()
  const minutes = totalMinutes(course.labs)
  return (
    <div className="relative isolate overflow-hidden rounded-2xl border border-border bg-surface p-6 sm:p-8">
      <span
        aria-hidden="true"
        className="absolute -right-20 -top-24 -z-10 h-64 w-64 rounded-full bg-accent/15 blur-3xl"
      />
      <Link
        to="/courses"
        className="inline-flex items-center gap-1.5 text-sm text-fg-muted transition hover:text-accent-soft"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Courses
      </Link>
      <h1 className="mt-3 text-3xl font-bold text-fg-strong sm:text-4xl">
        {course.title}
      </h1>
      <p className="mt-3 max-w-2xl text-fg-muted">{course.description}</p>

      <dl className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 font-mono text-sm">
        <div className="flex items-center gap-2">
          <LevelMeter level={course.level} />
          <span className="text-fg">{levelName(course.level)}</span>
        </div>
        <Stat value={course.lab_count} label="lab" />
        {minutes > 0 && <Stat value={`~${minutes}`} label="minutes" />}
        {course.student_count > 0 && (
          <Stat value={course.student_count} label="students" />
        )}
        {course.enrolled && (
          <span className="flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-xs text-success">
            <CheckIcon className="h-3 w-3" />
            Enrolled
          </span>
        )}
      </dl>
    </div>
  )
}


function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="font-semibold text-accent-soft">{value}</dt>
      <dd className="text-fg-muted">{label}</dd>
    </div>
  )
}

function Sidebar({ course }: { course: Course }) {
  const { label: levelName } = useLevels()
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const enroll = useMutation({
    mutationFn: () => coursesApi.enroll(course.slug),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['course', course.slug] }),
  })

  const tiles = [
    { value: String(course.lab_count), label: 'labs' },
    { value: `~${totalMinutes(course.labs)}`, label: 'minutes' },
    ...(course.student_count > 0
      ? [{ value: String(course.student_count), label: 'students' }]
      : []),
  ]

  return (
    <aside className="order-1 h-fit overflow-hidden rounded-xl border border-border bg-surface lg:sticky lg:top-24 lg:order-2">
      {/* Full-bleed cover: padding around the image made it read as a photo
          pasted into a box rather than part of the card. */}
      <div className="relative">
        {course.image_url ? (
          <img
            src={course.image_url}
            alt=""
            className="aspect-video w-full object-cover"
          />
        ) : (
          <div className="flex aspect-video w-full flex-col justify-center gap-1 bg-zinc-950 p-4 font-mono text-xs">
            <span className="flex gap-1.5">
              <span className="term-dot bg-red-400" />
              <span className="term-dot bg-amber-400" />
              <span className="term-dot bg-emerald-400" />
            </span>
            <span className="mt-2 text-zinc-500">~/courses</span>
            <span className="text-amber-400">
              $ cd {course.slug}
              <span className="term-caret ml-1" />
            </span>
          </div>
        )}
        <span className="absolute bottom-2 left-2 flex items-center gap-2 rounded-md bg-zinc-950/70 px-2 py-1 text-xs text-zinc-100 backdrop-blur">
          <LevelMeter level={course.level} dim="bg-zinc-600" />
          {levelName(course.level)}
        </span>
      </div>

      {course.enrolled && (
        <p className="flex items-center gap-2 bg-success-soft px-4 py-2.5 text-sm font-medium text-success">
          <CheckIcon className="h-4 w-4 shrink-0" />
          You are enrolled in this course
        </p>
      )}

      {/* Hairline grid: one bg-border under a gap-px grid draws every divider,
          no per-cell borders to keep in sync. */}
      <div className="flex gap-px bg-border">
        {tiles.map((tile) => (
          <div key={tile.label} className="flex-1 bg-surface px-2 py-4 text-center">
            <div className="font-mono text-2xl font-bold text-fg-strong">
              {tile.value}
            </div>
            <div className="mt-0.5 text-xs text-fg-muted">{tile.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3 border-t border-border p-4">
        {!course.enrolled &&
          (user ? (
            <>
              <button
                onClick={() => enroll.mutate()}
                disabled={enroll.isPending}
                className="w-full rounded-md bg-accent px-4 py-2.5 font-medium text-accent-fg transition hover:bg-accent-hover disabled:opacity-60"
              >
                {enroll.isPending ? 'Enrolling…' : 'Enrol'}
              </button>
              {enroll.isError && (
                <p className="text-sm text-danger">Enrolment failed, try again.</p>
              )}
            </>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="w-full rounded-md bg-accent px-4 py-2.5 font-medium text-accent-fg transition hover:bg-accent-hover"
            >
              Sign in to enrol
            </button>
          ))}

        <p className="text-center font-mono text-xs text-fg-subtle">
          updated{' '}
          {new Date(course.updated_at).toLocaleDateString('en-GB')}
        </p>
      </div>
    </aside>
  )
}


function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 transition hover:bg-muted">
      <dt className="text-fg-muted">{label}</dt>
      <dd className="font-mono text-fg-strong">{value}</dd>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border-strong px-6 py-12 text-center text-sm text-fg-subtle">
      {children}
    </div>
  )
}

function ContentTab({
  labs,
  slug,
  enrolled,
}: {
  labs: Lab[]
  slug: string
  enrolled: boolean
}) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [picked, setPicked] = useState<Lab | null>(null)
  const [error, setError] = useState('')

  // Whether a container is already up decides what clicking a lesson does, so it
  // is read here rather than discovered from a 409 after the fact.
  const { data: running } = useQuery({
    queryKey: ['lab-session'],
    queryFn: labsApi.current,
  })

  const start = useMutation({
    mutationFn: (labSlug: string) => labsApi.start(labSlug),
    onSuccess: (s, labSlug) => {
      qc.setQueryData(['lab-session'], s)
      // The lab screen is only ever entered with a container already running,
      // which is what lets it open straight into a terminal.
      navigate(`/courses/${slug}/labs/${labSlug}`)
    },
    onError: (e) => {
      setError(e instanceof ApiError ? e.message : 'could not start the lab')
      // A 409 means the server knows about a session this page does not — one
      // started in another tab. Refetch it, or the dialog reports the block with
      // nothing to end and no route to follow.
      if (e instanceof ApiError && e.status === 409) {
        qc.invalidateQueries({ queryKey: ['lab-session'] })
      }
    },
  })

  // Ending the session that is in the way, from the dialog that reports it. The
  // slot is what the student is actually blocked on, and it is not always
  // reachable from the lab screen: the running session can belong to a course
  // they are not on and may not remember.
  const stopRunning = useMutation({
    mutationFn: (id: string) => labsApi.stop(id),
    onSuccess: () => {
      qc.setQueryData(['lab-session'], null)
      // The dialog is showing a rejection that no longer applies; clearing both
      // is what turns it back into a Start button.
      setError('')
      start.reset()
    },
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : 'could not close the previous session'),
  })

  const open = (l: Lab) => {
    // Nobody signed in: the dialog behind this would offer a Start that the
    // server answers with a 401, so send them where they have to go anyway.
    // Checked before the running-session branch, which cannot apply to a caller
    // with no session at all.
    if (!user) {
      navigate('/login')
      return
    }
    // Already have a container for this very lab — a half-finished attempt, or
    // one left behind by a reload. Go back to it instead of offering a Start
    // that the server would reject and a dialog that would explain the rejection.
    if (running && running.lab_id === l.id) {
      navigate(`/courses/${slug}/labs/${l.slug}`)
      return
    }
    setError('')
    start.reset()
    setPicked(l)
  }

  if (labs.length === 0)
    return (
      <Empty>
        <BookIcon className="mx-auto mb-2 h-6 w-6" />
        This course has no labs yet.
      </Empty>
    )

  const blockedByOther = Boolean(running && picked && running.lab_id !== picked.id)

  const phase: StartPhase = start.isPending
    ? 'creating'
    : blockedByOther
      ? // One session per student. Known before the button is pressed, so the
        // dialog explains the rule instead of showing a Start that 409s.
        'blocked'
      : error
        ? start.error instanceof ApiError && start.error.status === 409
          ? 'blocked'
          : 'failed'
        : 'idle'

  return (
    <>
      {/* Said before the click, not after it. The server refuses an unenrolled
          start with this same rule, but hearing it from a failed dialog reads as
          a fault rather than as a step that was skipped. */}
      {!enrolled && (
        <p className="mb-4 rounded-md border border-border bg-muted px-4 py-2.5 text-sm text-fg-muted">
          You need to{' '}
          <span className="font-medium text-fg-strong">
            enrol
          </span>{' '}
          before starting a lab. The enrol button is in the panel on the right.
        </p>
      )}

      <ol className="relative space-y-3">
        {labs.map((l, i) => (
          <li key={l.id} className="relative pl-12">
            {/* Rail connecting the step markers, stopped short of the last one. */}
            {i < labs.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute left-[15px] top-9 h-full w-px bg-border"
              />
            )}
            <span className="absolute left-0 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface font-mono text-sm text-accent-soft">
              {i + 1}
            </span>
            <button
              onClick={() => open(l)}
              className={
                'block w-full rounded-lg border bg-surface p-4 text-left transition hover:border-accent ' +
                (running?.lab_id === l.id ? 'border-accent' : 'border-border')
              }
            >
              <h4 className="flex items-center gap-2 font-medium text-fg-strong">
                {l.title}
                {running?.lab_id === l.id && (
                  <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-normal text-success">
                    running
                  </span>
                )}
              </h4>
              <div className="mt-2 flex flex-wrap gap-2 font-mono text-xs text-fg-muted">
                <span className="rounded bg-muted px-2 py-0.5">
                  {l.duration_minutes} minutes
                </span>
                <span className="rounded bg-muted px-2 py-0.5">
                  {l.task_count} tasks
                </span>
                <span className="rounded bg-muted px-2 py-0.5 text-accent-soft">
                  {l.points} points
                </span>
              </div>
            </button>
          </li>
        ))}
      </ol>

      {picked && (
        <LabStartModal
          phase={phase}
          lab={picked}
          error={error}
          runningHref={
            running?.course_slug && running.lab_slug
              ? `/courses/${running.course_slug}/labs/${running.lab_slug}`
              : undefined
          }
          onStopRunning={running ? () => stopRunning.mutate(running.id) : undefined}
          stopping={stopRunning.isPending}
          onStart={() => {
            setError('')
            start.mutate(picked.slug)
          }}
          onClose={() => {
            setPicked(null)
            setError('')
            start.reset()
          }}
        />
      )}
    </>
  )
}

function ReviewsTab({ slug, courseID }: { slug: string; courseID: number }) {
  const { isAdmin } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ['course', slug, 'reviews'],
    queryFn: () => coursesApi.reviews(slug),
  })
  // The way in to editing what is on this screen. Shown to admins only, and
  // here rather than only in the admin section, because this is the page
  // somebody is looking at when they decide a note needs changing.
  const editLink = isAdmin && (
    <Link
      to={`/admin/courses/${courseID}?tab=on-tap`}
      className="inline-block text-sm text-accent-soft hover:underline"
    >
      Manage review notes →
    </Link>
  )

  if (isLoading) return <BlockSkeleton />
  if (!data || data.length === 0)
    return (
      <div className="space-y-3">
        <Empty>No review content yet.</Empty>
        {editLink && <div className="text-center">{editLink}</div>}
      </div>
    )
  return (
    <div className="space-y-4">
      {editLink && <div className="flex justify-end">{editLink}</div>}
      {data.map((r) => (
        <div key={r.id} className="rounded-lg border border-border bg-surface p-5">
          <h4 className="font-medium text-fg-strong">{r.title}</h4>
          <div className="prose prose-zinc dark:prose-invert mt-2 max-w-none text-sm prose-pre:overflow-x-auto">
            <Markdown remarkPlugins={[remarkGfm]}>{r.content_md}</Markdown>
          </div>
        </div>
      ))}
    </div>
  )
}

const MEDAL = ['🥇', '🥈', '🥉']

function LeaderboardTab({ slug }: { slug: string }) {
  const { user } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ['course', slug, 'leaderboard'],
    queryFn: () => coursesApi.leaderboard(slug),
  })

  if (isLoading) return <BlockSkeleton />
  if (!data || data.length === 0)
    return (
      <Empty>Nobody has scored on this course yet — finish the first lab to open the leaderboard.</Empty>
    )

  const top = data[0].score || 1
  const total = data.reduce((n, r) => n + r.score, 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-px overflow-hidden rounded-xl border border-border bg-border">
        <Tile value={data.length} label="students with a score" />
        <Tile value={data[0].score} label="top score" />
        <Tile value={Math.round(total / data.length)} label="average score" />
      </div>

      {/* Table scrolls inside its own box; the page never scrolls sideways. */}
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-160 text-sm">
          <thead>
            <tr className="border-b border-border bg-muted text-left font-mono text-xs uppercase tracking-wide text-fg-subtle">
              <th className="px-4 py-3 font-medium">Rank</th>
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-4 py-3 text-center font-medium">Score</th>
              <th className="px-4 py-3 text-center font-medium">Labs</th>
              <th className="px-4 py-3 text-center font-medium">Attempts</th>
              <th className="px-4 py-3 text-right font-medium">Last activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((row) => {
              const me = row.username === user?.username
              return (
                <tr
                  key={row.username}
                  className={
                    'transition ' + (me ? 'bg-accent/10' : 'hover:bg-muted')
                  }
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-base">
                      {MEDAL[row.rank - 1] ?? (
                        <span className="text-fg-subtle">{row.rank}</span>
                      )}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {row.avatar_url ? (
                        <img
                          src={row.avatar_url}
                          alt=""
                          loading="lazy"
                          className="h-8 w-8 shrink-0 rounded-md object-cover"
                        />
                      ) : (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted font-mono text-xs font-bold text-accent-soft">
                          {row.username.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium text-fg-strong">
                            {row.username}
                          </span>
                          {me && (
                            <span className="shrink-0 rounded bg-accent px-1.5 py-0.5 font-mono text-[10px] font-semibold text-accent-fg">
                              you
                            </span>
                          )}
                        </div>
                        {/* Bar relative to the leader — the numbers alone do
                            not show how far apart the ranks are. */}
                        <div className="mt-1 h-1 w-32 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-accent"
                            style={{
                              width: `${Math.max(4, (row.score / top) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span className="inline-block rounded-full bg-accent px-2.5 py-1 font-mono text-xs font-bold text-accent-fg">
                      {row.score}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-fg">
                    {row.labs_completed}
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-fg-muted">
                    {row.attempts}
                  </td>
                  <td
                    className="px-4 py-3 text-right font-mono text-xs text-fg-subtle"
                    title={new Date(row.updated_at).toLocaleString('en-GB')}
                  >
                    {timeAgo(row.updated_at)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="font-mono text-xs text-fg-subtle">
        # showing the top 50 ranks
      </p>
    </div>
  )
}

function Tile({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-32 flex-1 bg-surface px-3 py-4 text-center">
      <div className="font-mono text-xl font-bold text-fg-strong">{value}</div>
      <div className="mt-0.5 text-xs text-fg-muted">{label}</div>
    </div>
  )
}


function StatusTab({ course }: { course: Course }) {
  return (
    <dl className="space-y-2 rounded-xl border border-border bg-surface p-5 text-sm">
      <Row
        label="Enrolment status"
        value={course.enrolled ? 'Enrolled' : 'Not enrolled'}
      />
      <Row label="Labs" value={String(course.lab_count)} />
      <Row label="Students" value={String(course.student_count)} />
      <Row
        label="Updated"
        value={new Date(course.updated_at).toLocaleDateString('en-GB')}
      />
    </dl>
  )
}

function BlockSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="h-20 rounded-lg border border-border bg-muted" />
      ))}
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="h-52 rounded-2xl border border-border bg-muted" />
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <BlockSkeleton />
        <div className="h-72 rounded-xl border border-border bg-muted" />
      </div>
    </div>
  )
}
