import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { adminApi } from '@/api/admin'
import { ApiError } from '@/lib/api'
import { Button, Card, StatCard } from '@/components/ui'
import { ConfirmModal } from '@/components/ConfirmModal'
import {
  BookIcon,
  CheckIcon,
  LayersIcon,
  PlusIcon,
  SearchIcon,
  UsersIcon,
} from '@/components/icons'
import type { CourseSummary } from '@/lib/types'
import { useT, type Key } from '@/lib/i18n'

type Filter = 'all' | 'published' | 'draft'

const FILTERS: { key: Filter; label: Key }[] = [
  { key: 'all', label: 'admin.filter.all' },
  { key: 'published', label: 'admin.filter.published' },
  { key: 'draft', label: 'admin.filter.draft' },
]

/** The course list. Adding and editing live at their own URLs, so this screen
 *  only ever shows the totals and the table — and Back from a form lands here
 *  rather than leaving the admin area. */
export default function Admin() {
  const t = useT()
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
      setError(e instanceof ApiError ? e.message : t('admin.deleteFailed')),
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

  // Khoá đang chờ xác nhận xoá. Giữ cả object chứ không chỉ id, để hộp thoại đọc
  // được tên và mấy con số ra mà không phải dò lại danh sách.
  const [deleting, setDeleting] = useState<CourseSummary | null>(null)

  const empty = all.length === 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg-strong">{t('admin.title')}</h1>
          <p className="mt-1 text-sm text-fg-muted">
            {t('admin.subtitle')}
          </p>
        </div>
        <Link to="/admin/courses/new">
          <Button>
            <PlusIcon className="h-4 w-4" />
            {t('admin.addCourse')}
          </Button>
        </Link>
      </div>

      {error && (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-fg-strong">
          {t('admin.overview')}
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label={t('admin.statCourses')}
            value={totals.courses}
            icon={BookIcon}
            tint="amber"
          />
          <StatCard
            label={t('admin.statPublished')}
            value={totals.published}
            icon={CheckIcon}
            tint="emerald"
          />
          <StatCard
            label={t('admin.statLabs')}
            value={totals.labs}
            icon={LayersIcon}
            tint="sky"
          />
          <StatCard
            label={t('admin.statStudents')}
            value={totals.students}
            icon={UsersIcon}
            tint="violet"
          />
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-fg-strong">
            {t('admin.courseList')}
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
                placeholder={t('admin.searchPlaceholder')}
                aria-label={t('admin.searchLabel')}
                className="w-56 rounded-lg border border-border-strong bg-bg py-2 pr-3 pl-9 text-sm text-fg outline-none transition placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-accent/25"
              />
            </div>

            <div
              role="group"
              aria-label={t('admin.filterGroup')}
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
                  {t(f.label)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Card className="overflow-hidden">
          {courses.isLoading && (
            <p className="px-4 py-10 text-center text-sm text-fg-subtle">
              {t('common.loading')}
            </p>
          )}

          {!courses.isLoading && empty && (
            <div className="px-4 py-12 text-center">
              <p className="text-sm text-fg-muted">{t('admin.empty')}</p>
              <Link to="/admin/courses/new" className="mt-3 inline-block">
                <Button>
                  <PlusIcon className="h-4 w-4" />
                  {t('admin.createFirst')}
                </Button>
              </Link>
            </div>
          )}

          {!courses.isLoading && !empty && shown.length === 0 && (
            <p className="px-4 py-12 text-center text-sm text-fg-subtle">
              {t('admin.noMatch')}
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
                    <th className="px-4 py-3 font-medium">{t('admin.colCourse')}</th>
                    <th className="px-4 py-3 font-medium">{t('admin.colLevel')}</th>
                    <th className="px-4 py-3 font-medium">{t('admin.colStatus')}</th>
                    <th className="px-4 py-3 text-right font-medium">{t('admin.colLabs')}</th>
                    <th className="px-4 py-3 text-right font-medium">{t('admin.colStudents')}</th>
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
                          onDelete={setDeleting}
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
                      <span>
                        {c.lab_count} {t('admin.labsWord')}
                      </span>
                      <span>
                        {c.student_count} {t('admin.studentsWord')}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      <RowActions
                        course={c}
                        onDelete={setDeleting}
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

      {/* Xoá một khoá kéo theo lab, nhiệm vụ, ghi danh và điểm. Gọi tên những thứ
          mất theo mới là khác biệt giữa một lời xác nhận và một thủ tục. */}
      {deleting && (
        <ConfirmModal
          title={t('admin.deleteTitle', { name: deleting.title })}
          confirmLabel={
            remove.isPending ? t('admin.deleting') : t('admin.deleteCourse')
          }
          tone="danger"
          busy={remove.isPending}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            remove.mutate(deleting.id)
            setDeleting(null)
          }}
        >
          <p>{t('admin.lostWith')}</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <strong className="text-fg-strong">{deleting.lab_count}</strong>{' '}
              {t('admin.lostLabs')}
            </li>
            <li>
              <strong className="text-fg-strong">{deleting.student_count}</strong>{' '}
              {t('admin.lostEnrolments')}
            </li>
            <li>{t('admin.lostScores')}</li>
          </ul>
          <p className="text-danger">{t('admin.notRecoverable')}</p>
        </ConfirmModal>
      )}
    </div>
  )
}

function StatusPill({ status }: { status: CourseSummary['status'] }) {
  const t = useT()
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
      {status === 'published' ? t('admin.published') : t('admin.draft')}
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
  const t = useT()
  return (
    <>
      {/* "Nội dung" rather than "Lab & nhiệm vụ": the page behind it also holds
          the revision notes now, and a link that names only half of what is
          there is a link nobody clicks looking for the other half. */}
      <Link
        to={`/admin/courses/${course.id}`}
        className="rounded px-2 py-1 text-sm text-accent-soft transition hover:bg-muted"
      >
        {t('admin.rowContent')}
      </Link>
      <Link
        to={`/admin/courses/${course.id}/edit`}
        className="rounded px-2 py-1 text-sm text-accent-soft transition hover:bg-muted"
      >
        {t('admin.rowEdit')}
      </Link>
      <button
        onClick={() => onDelete(course)}
        disabled={disabled}
        className="rounded px-2 py-1 text-sm text-danger transition hover:bg-danger/10 disabled:opacity-50"
      >
        {t('admin.rowDelete')}
      </button>
    </>
  )
}
