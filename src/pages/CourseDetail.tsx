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

const TABS = [
  'Nội dung khoá học',
  'Ôn tập',
  'Bảng xếp hạng',
  'Trạng thái',
] as const
type Tab = (typeof TABS)[number]

const totalMinutes = (labs: Lab[]) =>
  labs.reduce((n, l) => n + l.duration_minutes, 0)

/** Queries behind the tabs that are not loaded with the course itself. */
const TAB_QUERY: Partial<Record<Tab, (slug: string) => unknown>> = {
  'Ôn tập': (slug) => ({
    queryKey: ['course', slug, 'reviews'],
    queryFn: () => coursesApi.reviews(slug),
  }),
  'Bảng xếp hạng': (slug) => ({
    queryKey: ['course', slug, 'leaderboard'],
    queryFn: () => coursesApi.leaderboard(slug),
  }),
}

export default function CourseDetail() {
  const { slug = '' } = useParams()
  const [tab, setTab] = useState<Tab>('Nội dung khoá học')
  const qc = useQueryClient()

  // Warm the tab's data on hover so clicking lands on content, not a skeleton.
  const prefetch = (t: Tab) => {
    const build = TAB_QUERY[t]
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
        <p className="text-danger">Không tìm thấy khoá học.</p>
        <Link
          to="/courses"
          className="mt-3 inline-block text-sm text-accent-soft hover:underline"
        >
          ← Về danh sách khoá học
        </Link>
      </div>
    )

  return (
    <div className="space-y-8">
      <Header course={course} />
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="order-2 lg:order-1">
          <div className="flex flex-wrap gap-2 border-b border-border pb-px">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                onMouseEnter={() => prefetch(t)}
                onFocus={() => prefetch(t)}
                className={
                  'rounded-t-md px-4 py-2 text-sm font-medium transition ' +
                  (tab === t
                    ? 'border-b-2 border-accent bg-muted text-fg-strong'
                    : 'border-b-2 border-transparent text-fg-muted hover:bg-muted hover:text-fg-strong')
                }
              >
                {t}
                {t === 'Nội dung khoá học' && course.labs.length > 0 && (
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
            {tab === 'Nội dung khoá học' && <ContentTab labs={course.labs} slug={course.slug} />}
            {tab === 'Ôn tập' && <ReviewsTab slug={slug} />}
            {tab === 'Bảng xếp hạng' && <LeaderboardTab slug={slug} />}
            {tab === 'Trạng thái' && <StatusTab course={course} />}
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
        Khoá học
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
        {minutes > 0 && <Stat value={`~${minutes}`} label="phút" />}
        {course.student_count > 0 && (
          <Stat value={course.student_count} label="học viên" />
        )}
        {course.enrolled && (
          <span className="flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-xs text-success">
            <CheckIcon className="h-3 w-3" />
            Đã đăng ký
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
    { value: String(course.lab_count), label: 'bài lab' },
    { value: `~${totalMinutes(course.labs)}`, label: 'phút' },
    ...(course.student_count > 0
      ? [{ value: String(course.student_count), label: 'học viên' }]
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
          Đã đăng ký khoá này
        </p>
      )}

      {/* Hairline grid: one bg-border under a gap-px grid draws every divider,
          no per-cell borders to keep in sync. */}
      <div className="flex gap-px bg-border">
        {tiles.map((t) => (
          <div key={t.label} className="flex-1 bg-surface px-2 py-4 text-center">
            <div className="font-mono text-2xl font-bold text-fg-strong">
              {t.value}
            </div>
            <div className="mt-0.5 text-xs text-fg-muted">{t.label}</div>
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
                {enroll.isPending ? 'Đang đăng ký…' : 'Đăng ký học'}
              </button>
              {enroll.isError && (
                <p className="text-sm text-danger">Đăng ký thất bại, thử lại.</p>
              )}
            </>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="w-full rounded-md bg-accent px-4 py-2.5 font-medium text-accent-fg transition hover:bg-accent-hover"
            >
              Đăng nhập để đăng ký
            </button>
          ))}

        <p className="text-center font-mono text-xs text-fg-subtle">
          cập nhật {new Date(course.updated_at).toLocaleDateString('vi-VN')}
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

function ContentTab({ labs, slug }: { labs: Lab[]; slug: string }) {
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
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : 'không khởi động được lab'),
  })

  const open = (l: Lab) => {
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
        Khoá học chưa có bài lab nào.
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
                    đang chạy
                  </span>
                )}
              </h4>
              <div className="mt-2 flex flex-wrap gap-2 font-mono text-xs text-fg-muted">
                <span className="rounded bg-muted px-2 py-0.5">
                  {l.duration_minutes} phút
                </span>
                <span className="rounded bg-muted px-2 py-0.5">
                  {l.task_count} task
                </span>
                <span className="rounded bg-muted px-2 py-0.5 text-accent-soft">
                  {l.points} điểm
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

function ReviewsTab({ slug }: { slug: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['course', slug, 'reviews'],
    queryFn: () => coursesApi.reviews(slug),
  })
  if (isLoading) return <BlockSkeleton />
  if (!data || data.length === 0)
    return <Empty>Chưa có nội dung ôn tập.</Empty>
  return (
    <div className="space-y-4">
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
      <Empty>
        Chưa có ai ghi điểm ở khoá này — hoàn thành lab đầu tiên để mở bảng xếp
        hạng.
      </Empty>
    )

  const top = data[0].score || 1
  const total = data.reduce((n, r) => n + r.score, 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-px overflow-hidden rounded-xl border border-border bg-border">
        <Tile value={data.length} label="học viên có điểm" />
        <Tile value={data[0].score} label="điểm cao nhất" />
        <Tile value={Math.round(total / data.length)} label="điểm trung bình" />
      </div>

      {/* Table scrolls inside its own box; the page never scrolls sideways. */}
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-160 text-sm">
          <thead>
            <tr className="border-b border-border bg-muted text-left font-mono text-xs uppercase tracking-wide text-fg-subtle">
              <th className="px-4 py-3 font-medium">Hạng</th>
              <th className="px-4 py-3 font-medium">Thành viên</th>
              <th className="px-4 py-3 text-center font-medium">Điểm</th>
              <th className="px-4 py-3 text-center font-medium">Lab</th>
              <th className="px-4 py-3 text-center font-medium">Lần thử</th>
              <th className="px-4 py-3 text-right font-medium">Hoạt động cuối</th>
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
                              bạn
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
                    title={new Date(row.updated_at).toLocaleString('vi-VN')}
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
        # hiển thị tối đa 50 hạng đầu
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
        label="Trạng thái đăng ký"
        value={course.enrolled ? 'Đã đăng ký' : 'Chưa đăng ký'}
      />
      <Row label="Số lab" value={String(course.lab_count)} />
      <Row label="Học viên" value={String(course.student_count)} />
      <Row
        label="Cập nhật"
        value={new Date(course.updated_at).toLocaleDateString('vi-VN')}
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
