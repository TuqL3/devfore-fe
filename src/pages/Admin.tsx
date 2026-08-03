import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { adminApi } from '@/api/admin'
import { ApiError } from '@/lib/api'
import { Button, Card, StatCard } from '@/components/ui'
import {
  BookIcon,
  CheckIcon,
  LayersIcon,
  PlusIcon,
  SearchIcon,
  UsersIcon,
} from '@/components/icons'
import type { CourseSummary } from '@/lib/types'

type Filter = 'all' | 'published' | 'draft'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'published', label: 'Đã đăng' },
  { key: 'draft', label: 'Nháp' },
]

/** The course list. Adding and editing live at their own URLs, so this screen
 *  only ever shows the totals and the table — and Back from a form lands here
 *  rather than leaving the admin area. */
export default function Admin() {
  const qc = useQueryClient()
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const courses = useQuery({ queryKey: ['admin-courses'], queryFn: adminApi.courses })

  const remove = useMutation({
    mutationFn: (id: number) => adminApi.deleteCourse(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-courses'] })
      qc.invalidateQueries({ queryKey: ['courses'] })
      setError('')
    },
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : 'không xoá được, thử lại'),
  })

  // The totals are a fold over the rows already on screen — a dashboard
  // endpoint for four sums the client can add up itself would be a round trip
  // that tells us nothing new.
  const all = useMemo(() => courses.data ?? [], [courses.data])
  const totals = useMemo(
    () => ({
      courses: all.length,
      published: all.filter((c) => c.status === 'published').length,
      labs: all.reduce((n, c) => n + c.lab_count, 0),
      students: all.reduce((n, c) => n + c.student_count, 0),
    }),
    [all],
  )

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all.filter(
      (c) =>
        (filter === 'all' || c.status === filter) &&
        (!q ||
          c.title.toLowerCase().includes(q) ||
          c.slug.toLowerCase().includes(q)),
    )
  }, [all, filter, query])

  const onDelete = (c: CourseSummary) => {
    // Deleting a course cascades to its labs, tasks, enrolments and scores.
    // Naming what goes with it is the difference between a confirmation and a
    // formality.
    const msg =
      `Xoá "${c.title}"?\n\n` +
      `Mất theo: ${c.lab_count} lab (kèm nhiệm vụ), ` +
      `${c.student_count} lượt ghi danh và toàn bộ điểm của khoá này. ` +
      `Không khôi phục được.`
    if (confirm(msg)) remove.mutate(c.id)
  }

  const empty = all.length === 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg-strong">Quản trị khoá học</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Thêm, sửa, xoá khoá học. Khoá ở trạng thái nháp không hiện ngoài danh
            sách công khai.
          </p>
        </div>
        <Link to="/admin/courses/new">
          <Button>
            <PlusIcon className="h-4 w-4" />
            Thêm khoá học
          </Button>
        </Link>
      </div>

      {error && (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-fg-strong">Tổng quan</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Khoá học"
            value={totals.courses}
            icon={BookIcon}
            tint="amber"
          />
          <StatCard
            label="Đã đăng"
            value={totals.published}
            icon={CheckIcon}
            tint="emerald"
          />
          <StatCard label="Lab" value={totals.labs} icon={LayersIcon} tint="sky" />
          <StatCard
            label="Học viên"
            value={totals.students}
            icon={UsersIcon}
            tint="violet"
          />
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-fg-strong">
            Danh sách khoá học
            {!empty && (
              <span className="ml-2 font-normal text-fg-subtle">
                {shown.length}/{all.length}
              </span>
            )}
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                type="search"
                placeholder="Tìm theo tên hoặc slug…"
                aria-label="Tìm khoá học"
                className="w-56 rounded-lg border border-border-strong bg-bg py-2 pr-3 pl-9 text-sm text-fg outline-none transition placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-accent/25"
              />
            </div>

            <div
              role="group"
              aria-label="Lọc theo trạng thái"
              className="flex gap-1 rounded-lg border border-border bg-surface p-1"
            >
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  aria-pressed={filter === f.key}
                  className={
                    'rounded-md px-2.5 py-1 text-xs font-medium transition ' +
                    (filter === f.key
                      ? 'bg-accent text-accent-fg'
                      : 'text-fg-muted hover:text-fg-strong')
                  }
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Card className="overflow-hidden">
          {courses.isLoading && (
            <p className="px-4 py-10 text-center text-sm text-fg-subtle">Đang tải…</p>
          )}

          {!courses.isLoading && empty && (
            <div className="px-4 py-12 text-center">
              <p className="text-sm text-fg-muted">Chưa có khoá học nào.</p>
              <Link to="/admin/courses/new" className="mt-3 inline-block">
                <Button>
                  <PlusIcon className="h-4 w-4" />
                  Tạo khoá đầu tiên
                </Button>
              </Link>
            </div>
          )}

          {!courses.isLoading && !empty && shown.length === 0 && (
            <p className="px-4 py-12 text-center text-sm text-fg-subtle">
              Không khoá nào khớp bộ lọc.
            </p>
          )}

          {shown.length > 0 && (
            <>
              {/* Wide: a table, because the counts are worth comparing down a
                  column. Narrow: the same rows as cards — a 6-column table on a
                  phone is a table nobody scrolls sideways through. */}
              <table className="hidden w-full text-left text-sm md:table">
                <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-fg-subtle">
                  <tr>
                    <th className="px-4 py-3 font-medium">Khoá học</th>
                    <th className="px-4 py-3 font-medium">Cấp độ</th>
                    <th className="px-4 py-3 font-medium">Trạng thái</th>
                    <th className="px-4 py-3 text-right font-medium">Lab</th>
                    <th className="px-4 py-3 text-right font-medium">Học viên</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {shown.map((c) => (
                    <tr
                      key={c.id}
                      className="border-t border-border transition first:border-t-0 hover:bg-muted/40"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-fg-strong">{c.title}</div>
                        <div className="font-mono text-xs text-fg-subtle">
                          {c.slug}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-fg-muted">{c.level}</td>
                      <td className="px-4 py-3">
                        <StatusPill status={c.status} />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-fg-muted">
                        {c.lab_count}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-fg-muted">
                        {c.student_count}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <RowActions
                          course={c}
                          onDelete={onDelete}
                          disabled={remove.isPending}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <ul className="divide-y divide-border md:hidden">
                {shown.map((c) => (
                  <li key={c.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-fg-strong">{c.title}</div>
                        <div className="truncate font-mono text-xs text-fg-subtle">
                          {c.slug}
                        </div>
                      </div>
                      <StatusPill status={c.status} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted">
                      <span>{c.level}</span>
                      <span>{c.lab_count} lab</span>
                      <span>{c.student_count} học viên</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      <RowActions
                        course={c}
                        onDelete={onDelete}
                        disabled={remove.isPending}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </section>
    </div>
  )
}

function StatusPill({ status }: { status: CourseSummary['status'] }) {
  return (
    <span
      className={
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ' +
        (status === 'published'
          ? 'bg-success-soft text-success'
          : 'bg-muted text-fg-muted')
      }
    >
      <span
        className={
          'h-1.5 w-1.5 rounded-full ' +
          (status === 'published' ? 'bg-success' : 'bg-fg-subtle')
        }
        aria-hidden="true"
      />
      {status === 'published' ? 'đã đăng' : 'nháp'}
    </span>
  )
}

function RowActions({
  course,
  onDelete,
  disabled,
}: {
  course: CourseSummary
  onDelete: (c: CourseSummary) => void
  disabled: boolean
}) {
  return (
    <>
      {/* "Nội dung" rather than "Lab & nhiệm vụ": the page behind it also holds
          the revision notes now, and a link that names only half of what is
          there is a link nobody clicks looking for the other half. */}
      <Link
        to={`/admin/courses/${course.id}`}
        className="rounded px-2 py-1 text-sm text-accent-soft transition hover:bg-muted"
      >
        Nội dung
      </Link>
      <Link
        to={`/admin/courses/${course.id}/edit`}
        className="rounded px-2 py-1 text-sm text-accent-soft transition hover:bg-muted"
      >
        Sửa
      </Link>
      <button
        onClick={() => onDelete(course)}
        disabled={disabled}
        className="rounded px-2 py-1 text-sm text-danger transition hover:bg-danger/10 disabled:opacity-50"
      >
        Xoá
      </button>
    </>
  )
}
