import { useEffect, useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { coursesApi } from '@/api/courses'
import type { CourseSummary } from '@/lib/types'
import { useLevels } from '@/lib/levels'
import { LevelMeter } from '@/components/LevelMeter'

export function CourseCard({ c }: { c: CourseSummary }) {
  const { label } = useLevels()
  return (
    <Link
      to={`/courses/${c.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition hover:-translate-y-0.5 hover:border-accent hover:shadow-lg hover:shadow-accent/10"
    >
      <div className="relative h-40 overflow-hidden">
        {c.image_url ? (
          <img
            src={c.image_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          // Terminal placeholder so cards without artwork keep the same height
          // and still look deliberate.
          <div className="flex h-full flex-col justify-center gap-2 bg-zinc-950 p-4 font-mono text-sm">
            <span className="flex gap-1.5">
              <span className="term-dot bg-red-400" />
              <span className="term-dot bg-amber-400" />
              <span className="term-dot bg-emerald-400" />
            </span>
            <span className="text-zinc-500">~/courses</span>
            <span className="text-amber-400">
              $ cd {c.slug}
              <span className="term-caret ml-1" />
            </span>
          </div>
        )}
        <span className="absolute bottom-2 left-2 flex items-center gap-2 rounded-md bg-zinc-950/70 px-2 py-1 text-xs text-zinc-100 backdrop-blur">
          <LevelMeter level={c.level} dim="bg-zinc-600" />
          {label(c.level)}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-semibold text-fg-strong group-hover:text-accent-soft">
          {c.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-fg-muted">
          {c.description}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-4 font-mono text-xs text-fg-subtle">
          <span>
            {c.lab_count} lab
            {c.student_count > 0 && ` · ${c.student_count} học viên`}
          </span>
          <span className="text-accent-soft transition-transform group-hover:translate-x-1">
            →
          </span>
        </div>
      </div>
    </Link>
  )
}

function CardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border border-border bg-surface">
      <div className="h-40 bg-muted" />
      <div className="space-y-3 p-4">
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="h-4 w-3/4 rounded bg-muted" />
        <div className="h-3 w-full rounded bg-muted" />
      </div>
    </div>
  )
}

export default function Courses() {
  // Filters live in the URL so a filtered list can be shared and the back
  // button steps through it.
  const [params, setParams] = useSearchParams()
  const level = params.get('level') ?? ''
  const q = params.get('q') ?? ''

  // Local mirror of the search box: typing updates it instantly, the URL and
  // the request only follow once typing pauses.
  const [text, setText] = useState(q)
  useEffect(() => setText(q), [q])
  useEffect(() => {
    if (text === q) return
    const id = setTimeout(() => patch('q', text), 350)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  function patch(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const { levels, label } = useLevels()

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['courses', { level, q }],
    queryFn: () => coursesApi.list({ level, q }),
    // Keep the previous page visible while a new filter loads instead of
    // flashing skeletons on every keystroke.
    placeholderData: keepPreviousData,
  })

  const filtering = !!level || !!q

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg-strong">Khoá học</h1>
        <p className="mt-1 text-fg-muted">
          Mỗi khoá gồm nhiều lab thực hành trên container Linux thật.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tìm khoá học…"
          aria-label="Tìm khoá học"
          className="w-full max-w-xs rounded-md border border-border-strong bg-surface px-3 py-2 text-sm outline-none placeholder:text-fg-subtle focus:border-accent"
        />
        {levels.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <FilterChip active={!level} onClick={() => patch('level', '')}>
              Tất cả
            </FilterChip>
            {levels.map((l) => (
              <FilterChip
                key={l.slug}
                active={level === l.slug}
                onClick={() => patch('level', l.slug)}
              >
                {l.label}
                <span className="ml-1.5 font-mono text-xs opacity-70">
                  {l.course_count}
                </span>
              </FilterChip>
            ))}
          </div>
        )}
        {isFetching && !isLoading && (
          <span className="font-mono text-xs text-fg-subtle">đang lọc…</span>
        )}
      </div>

      {isError && (
        <p className="text-danger">Không tải được danh sách khoá học.</p>
      )}
      {!isLoading && data?.length === 0 && (
        <p className="text-fg-subtle">
          {filtering ? (
            <>
              Không có khoá học nào khớp
              {level && <> ở mức “{label(level)}”</>}
              {q && <> với từ khoá “{q}”</>}.{' '}
              <button
                onClick={() => setParams({}, { replace: true })}
                className="text-accent-soft hover:underline"
              >
                Xoá bộ lọc
              </button>
            </>
          ) : (
            'Chưa có khoá học nào được xuất bản.'
          )}
        </p>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />)
          : data?.map((c) => <CourseCard key={c.id} c={c} />)}
      </div>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={
        'rounded-full border px-3 py-1.5 text-sm transition ' +
        (active
          ? 'border-accent bg-accent text-accent-fg'
          : 'border-border-strong text-fg-muted hover:border-accent hover:text-fg-strong')
      }
    >
      {children}
    </button>
  )
}
