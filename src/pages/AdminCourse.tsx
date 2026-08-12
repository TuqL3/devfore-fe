import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  adminApi,
  type AdminLab,
  type AdminOption,
  type AdminReview,
  type AdminTask,
  type LabInput,
  type ReviewInput,
  type TaskInput,
} from '@/api/admin'
import { ApiError } from '@/lib/api'
import { Button, Card, ErrorBox, Field, Input, JsonField } from '@/components/ui'
import { ConfirmModal } from '@/components/ConfirmModal'
import { MarkdownEditor, Prose } from '@/components/MarkdownEditor'
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  LayersIcon,
  PlusIcon,
  TerminalIcon,
} from '@/components/icons'
import { useT, type Key } from '@/lib/i18n'

const EMPTY_LAB: LabInput = {
  slug: '',
  title: '',
  description_md: '',
  duration_minutes: 60,
  lab_image_id: null,
  sim_scenario: null,
  incident_setup: '',
  order_idx: 0,
}

const EMPTY_REVIEW: ReviewInput = { title: '', content_md: '', order_idx: 0 }


// Ids, not labels — the active tab is compared by value and also written to
// the URL.
const TABS = [
  { id: 'labs', label: 'ac.tab.labs' },
  { id: 'reviews', label: 'ac.tab.reviews' },
] as const satisfies readonly { id: string; label: Key }[]
type Tab = (typeof TABS)[number]['id']

// The tab in the URL is ascii, so a link survives being pasted somewhere that
// mangles the query string. 'Lab' is the default and writes no parameter at all.
const TAB_SLUG: Record<Tab, string> = { labs: 'lab-list', reviews: 'on-tap' }

const EMPTY_TASK: TaskInput = {
  title: '',
  hint: '',
  kind: 'script',
  check_script: '',
  options: [],
  expected_commands: '',
  sim_goal: null,
  points: 10,
  order_idx: 0,
}

// Two blanks, because a choice question needs at least two options and starting
// with none makes the author guess how to add the first.
const EMPTY_OPTIONS = [
  { text: '', correct: false },
  { text: '', correct: false },
]

const KIND_CHOICES: { value: TaskInput['kind']; label: Key; hint: Key }[] = [
  { value: 'script', label: 'lab.kind.script', hint: 'ac.kind.scriptHint' },
  { value: 'command', label: 'lab.kind.command', hint: 'ac.kind.commandHint' },
  { value: 'choice', label: 'lab.kind.choice', hint: 'ac.kind.choiceHint' },
  { value: 'sim', label: 'lab.kind.sim', hint: 'ac.kind.simHint' },
]

// field-sizing grows the box with what is typed instead of leaving the author
// scrolling inside three visible rows; `rows` stays as the minimum, and as the
// fallback where the browser does not support it yet.
const textarea =
  'w-full resize-y rounded-md border border-border-strong bg-bg px-3 py-2.5 text-fg outline-none ' +
  'field-sizing-content max-h-[60vh] ' +
  'transition placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-accent/25'

const select =
  'w-full rounded-md border border-border-strong bg-bg px-3 py-2.5 text-fg outline-none ' +
  'transition focus:border-accent focus:ring-2 focus:ring-accent/25 disabled:opacity-50'

// Placeholder chứ không phải giá trị mặc định: một lab mô phỏng mới phải là do
// tác giả quyết định, còn đây chỉ nói hình dạng.
const SCENARIO_EXAMPLE = `{
  "version": 1,
  "runner_count": 2,
  "cache_restore_seconds": 8,
  "catalog": {
    "checkout":  { "seconds": 5 },
    "npm-ci":    { "seconds": 90, "cacheable": "node_modules" },
    "npm-build": { "seconds": 60, "produces": "dist" },
    "e2e":       { "seconds": 200, "flaky": 30 }
  }
}`

const GOAL_EXAMPLE = `{
  "all": [
    { "run_status": "success" },
    { "total_seconds_lte": 360 },
    { "jobs_parallel": ["test", "build"] },
    { "cache_hit": "node_modules" },
    { "job_present": "lint" }
  ]
}`

/** Labs of one course on the left, the questions of the selected lab on the
 *  right. One screen rather than two: writing a lab means writing its questions,
 *  and a page change between the two loses the thread every time. */
export default function AdminCourse() {
  const t = useT()
  const { id = '' } = useParams()
  const courseID = Number(id)
  const qc = useQueryClient()

  const [labForm, setLabForm] = useState<LabInput | null>(null)
  const [editingLab, setEditingLab] = useState<AdminLab | null>(null)
  // Lab đang chờ xác nhận xoá. Giữ cả object để hộp thoại đọc được tên và số
  // nhiệm vụ mà không phải dò lại danh sách.
  const [deletingLab, setDeletingLab] = useState<AdminLab | null>(null)
  // Which lab is open, and which tab, live in the URL rather than in state: they
  // survive a reload, they can be linked to, and Back steps between them instead
  // of leaving the page. Both are written through a merge, so setting one does
  // not silently drop the other.
  const [params, setParams] = useSearchParams()
  const selectedID = Number(params.get('lab')) || null
  const patchParams = (
    changes: Record<string, string | null>,
    opts?: { replace?: boolean },
  ) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) {
      if (v === null) next.delete(k)
      else next.set(k, v)
    }
    setParams(next, opts)
  }
  const setSelectedID = (id: number | null) =>
    patchParams({ lab: id ? String(id) : null }, { replace: !id })

  const tab: Tab = params.get('tab') === TAB_SLUG.reviews ? 'reviews' : 'labs'
  const setTab = (next: Tab) =>
    patchParams({ tab: next === 'labs' ? null : TAB_SLUG[next] })
  const [error, setError] = useState('')

  const courses = useQuery({ queryKey: ['admin-courses'], queryFn: adminApi.courses })
  const course = courses.data?.find((c) => c.id === courseID)

  const images = useQuery({ queryKey: ['lab-images'], queryFn: adminApi.labImages })
  const labs = useQuery({
    queryKey: ['admin-labs', courseID],
    queryFn: () => adminApi.labs(courseID),
    enabled: Number.isFinite(courseID) && courseID > 0,
  })
  // Only for the count on the tab. Same key as the panel's own query, so react
  // query serves both from one fetch rather than asking twice.
  const reviews = useQuery({
    queryKey: ['admin-reviews', courseID],
    queryFn: () => adminApi.reviews(courseID),
    enabled: Number.isFinite(courseID) && courseID > 0,
  })
  // Read back out of the list, so an edit to the lab is reflected here without
  // a second copy of it to keep in step.
  const selected = labs.data?.find((l) => l.id === selectedID) ?? null

  const fail = (e: unknown) =>
    setError(e instanceof ApiError ? e.message : t('ac.saveFailed'))

  const afterLabs = () => {
    qc.invalidateQueries({ queryKey: ['admin-labs', courseID] })
    // The lab count on the course row changes with this.
    qc.invalidateQueries({ queryKey: ['admin-courses'] })
    setLabForm(null)
    setEditingLab(null)
    setError('')
  }

  const saveLab = useMutation({
    mutationFn: (input: LabInput) =>
      editingLab
        ? adminApi.updateLab(editingLab.id, input)
        : adminApi.createLab(courseID, input),
    onSuccess: afterLabs,
    onError: fail,
  })

  const removeLab = useMutation({
    mutationFn: (labID: number) => adminApi.deleteLab(labID),
    onSuccess: (_, labID) => {
      // The right-hand panel is showing questions that no longer exist.
      if (selectedID === labID) setSelectedID(null)
      afterLabs()
    },
    onError: fail,
  })

  if (!Number.isFinite(courseID) || courseID <= 0) {
    return <p className="text-danger">{t('ac.badCourse')}</p>
  }

  const closeLabForm = () => {
    setLabForm(null)
    setEditingLab(null)
  }

  const openLabForm = (lab: AdminLab | null) => {
    setEditingLab(lab)
    setLabForm(
      lab
        ? {
            slug: lab.slug,
            title: lab.title,
            description_md: lab.description_md,
            duration_minutes: lab.duration_minutes,
            lab_image_id: lab.lab_image_id,
            sim_scenario: lab.sim_scenario,
            incident_setup: lab.incident_setup,
            order_idx: lab.order_idx,
          }
        : EMPTY_LAB,
    )
    setError('')
  }

  return (
    <div>
      <Link
        to="/admin/courses"
        className="inline-flex items-center gap-1.5 text-sm text-accent-soft hover:underline"
      >
        <ArrowLeftIcon className="h-3.5 w-3.5" />
        {t('ac.backList')}
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-fg-strong">
        {course?.title ?? t('ac.title')}
      </h1>
      <p className="mt-1 text-sm text-fg-muted">
        {tab === 'labs' ? t('ac.labsIntro') : t('ac.reviewsIntro')}
      </p>

      {/* Same tabs the student sees on the course page, so editing a course and
          reading it are the same shape. Counts sit next to the label rather than
          in a chip — two numbers, and the row stays one line on a phone. */}
      <div className="mt-5 flex flex-wrap gap-2 border-b border-border pb-px">
        {TABS.map((x) => {
          const count =
            x.id === 'labs' ? labs.data?.length : reviews.data?.length
          return (
            <button
              key={x.id}
              onClick={() => setTab(x.id)}
              aria-current={tab === x.id ? 'page' : undefined}
              className={
                'rounded-t-md px-4 py-2 text-sm font-medium transition ' +
                (tab === x.id
                  ? 'border-b-2 border-accent bg-muted text-fg-strong'
                  : 'border-b-2 border-transparent text-fg-muted hover:bg-muted hover:text-fg-strong')
              }
            >
              {t(x.label)}
              {count !== undefined && count > 0 && (
                <span className="ml-2 font-mono text-xs text-fg-subtle">{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {error && (
        <div className="mt-4">
          <ErrorBox>{error}</ErrorBox>
        </div>
      )}

      {tab === 'reviews' ? (
        <ReviewPanel courseID={courseID} onError={fail} clearError={() => setError('')} />
      ) : (
      /* A narrow rail of labs and one wide work area, rather than two equal
         columns: picking a lab is a glance, editing one is the job, and the
         forms on the right are the widest thing on the screen. */
      <div className="mt-6 grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]">
        <Card className="self-start lg:sticky lg:top-8">
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <h2 className="font-semibold text-fg-strong">
              {t('ac.tab.labs')}
              {labs.data && labs.data.length > 0 && (
                <span className="ml-1.5 font-normal text-fg-subtle">
                  {labs.data.length}
                </span>
              )}
            </h2>
            <Button className="px-2.5 py-1.5 text-sm" onClick={() => openLabForm(null)}>
              <PlusIcon className="h-4 w-4" />
              {t('ac.add')}
            </Button>
          </div>

          <ul className="max-h-[70vh] divide-y divide-border overflow-y-auto">
            {labs.isLoading && (
              <li className="px-4 py-6 text-sm text-fg-subtle">{t('common.loading')}</li>
            )}
            {labs.data?.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-fg-subtle">
                {t('ac.noLabs')}
              </li>
            )}
            {labs.data?.map((l) => {
              const active = selectedID === l.id
              return (
                <li key={l.id} className="relative">
                  {active && (
                    <span
                      className="absolute inset-y-0 left-0 w-0.5 bg-accent"
                      aria-hidden="true"
                    />
                  )}
                  <button
                    onClick={() => {
                      setSelectedID(l.id)
                      closeLabForm()
                    }}
                    aria-current={active ? 'true' : undefined}
                    className={
                      'block w-full px-4 pt-3 pb-2 text-left transition ' +
                      (active ? 'bg-muted' : 'hover:bg-muted/50')
                    }
                  >
                    <span className="block font-medium text-fg-strong">{l.title}</span>
                    <span className="mt-0.5 block truncate font-mono text-xs text-fg-subtle">
                      {l.slug}
                    </span>
                    {/* Three numbers on one line, separated rather than boxed —
                        three chips in a 19rem rail wrapped onto three rows. */}
                    <span className="mt-1.5 flex items-center gap-1.5 font-mono text-xs text-fg-muted">
                      <LayersIcon className="h-3.5 w-3.5" />
                      {l.task_count}
                      <span className="text-fg-subtle">·</span>
                      {l.points} {t('ac.pointsWord')}
                      <span className="text-fg-subtle">·</span>
                      <ClockIcon className="h-3.5 w-3.5" />
                      {l.duration_minutes}′
                    </span>
                    {/* Worth saying out loud: a lab with neither an image nor a
                        scenario fails at Start, not at save. A sim lab is not
                        missing an image — it is the other kind of lab. */}
                    {l.sim_scenario !== null ? (
                      <span className="mt-1.5 block rounded bg-muted px-2 py-0.5 text-xs text-fg-muted">
                        {t('ac.simLabNoContainer')}
                      </span>
                    ) : l.lab_image_id === null ? (
                      <span className="mt-1.5 block rounded bg-danger/10 px-2 py-0.5 text-xs text-danger">
                        {t('ac.noImage')}
                      </span>
                    ) : null}
                    {/* The only thing on this screen that tells a drill from an
                        ordinary lab: there is no flag column, an active scenario
                        IS what makes it one. */}
                    {l.incident_count > 0 && (
                      <span className="mt-1.5 block rounded bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
                        {t('ac.drillBadge', { n: l.incident_count })}
                      </span>
                    )}
                  </button>
                  <div
                    className={
                      'flex gap-1 px-3 pb-2 text-sm ' + (active ? 'bg-muted' : '')
                    }
                  >
                    <button
                      onClick={() => openLabForm(l)}
                      className="rounded px-2 py-0.5 text-xs text-accent-soft transition hover:bg-bg"
                    >
                      {t('ac.edit')}
                    </button>
                    <button
                      onClick={() => setDeletingLab(l)}
                      className="rounded px-2 py-0.5 text-xs text-danger transition hover:bg-danger/10"
                    >
                      {t('ac.delete')}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>

        {/* One work area, not two stacked ones: the lab form and the questions
            are never edited at the same time, and side by side each got half
            the width it needed. */}
        <section className="min-w-0">
          {labForm ? (
            <LabForm
              // Ô JSON giữ văn bản đang gõ ở bên trong nó, nên chuyển sang sửa
              // lab khác phải dựng lại form — không thì kịch bản của lab trước
              // ở lại trong ô.
              key={editingLab?.id ?? 'new'}
              value={labForm}
              editing={Boolean(editingLab)}
              images={images.data ?? []}
              saving={saveLab.isPending}
              onChange={setLabForm}
              onCancel={closeLabForm}
              onSubmit={() => saveLab.mutate(labForm)}
            />
          ) : selected ? (
            // Keyed by lab: switching labs must drop the open form, the trial
            // result and the setup box with it, all of which describe the lab
            // that was showing a moment ago.
            // Keyed by lab: switching labs must drop the open form, the trial
            // result and the setup box with it, all of which describe the lab
            // that was showing a moment ago.
            //
            // War Room scenarios are edited in the War Room section, not here.
            // A lab's incident_setup still lives on the form above, because it
            // is a column of the lab — writing it is what files the lab under
            // War Room in the first place.
            <TaskPanel
              key={selected.id}
              lab={selected}
              onError={fail}
              clearError={() => setError('')}
            />
          ) : (
            <Card className="flex flex-col items-center px-6 py-16 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-muted text-fg-subtle">
                <TerminalIcon className="h-5 w-5" />
              </span>
              <p className="mt-3 text-sm font-medium text-fg">{t('ac.noLabPicked')}</p>
              <p className="mt-1 max-w-xs text-sm text-fg-subtle">
                {labs.data?.length === 0
                  ? t('ac.createFirstLab')
                  : t('ac.pickLab')}
              </p>
              {labs.data?.length === 0 && (
                <Button className="mt-4 px-3 py-2 text-sm" onClick={() => openLabForm(null)}>
                  <PlusIcon className="h-4 w-4" />
                  {t('ac.addLab')}
                </Button>
              )}
            </Card>
          )}
        </section>
      </div>
      )}

      {/* Xoá một lab kéo theo nhiệm vụ và tiến độ học viên đã làm ở đó. Gọi tên
          những thứ mất theo mới là khác biệt giữa xác nhận và thủ tục. */}
      {deletingLab && (
        <ConfirmModal
          title={t('ac.deleteLabTitle', { name: deletingLab.title })}
          confirmLabel={
            removeLab.isPending ? t('ac.deleting') : t('ac.deleteLab')
          }
          tone="danger"
          busy={removeLab.isPending}
          onClose={() => setDeletingLab(null)}
          onConfirm={() => {
            removeLab.mutate(deletingLab.id)
            setDeletingLab(null)
          }}
        >
          <p>
            {t('ac.lostWithBefore')}{' '}
            <strong className="text-fg-strong">{deletingLab.task_count}</strong>{' '}
            {t('ac.lostWithAfter')}
          </p>
          <p className="text-danger">{t('ac.notRecoverable')}</p>
        </ConfirmModal>
      )}
    </div>
  )
}

/** The "Ôn tập" tab of a course, from the author's side. Plain markdown with no
 *  container behind it — nothing here is graded, it is the material a student
 *  reads before or after doing the labs. */
function ReviewPanel({
  courseID,
  onError,
  clearError,
}: {
  courseID: number
  onError: (e: unknown) => void
  clearError: () => void
}) {
  const t = useT()
  const qc = useQueryClient()
  const [form, setForm] = useState<ReviewInput | null>(null)
  const [editing, setEditing] = useState<AdminReview | null>(null)
  const [deleting, setDeleting] = useState<AdminReview | null>(null)

  const reviews = useQuery({
    queryKey: ['admin-reviews', courseID],
    queryFn: () => adminApi.reviews(courseID),
  })

  const done = () => {
    qc.invalidateQueries({ queryKey: ['admin-reviews', courseID] })
    setForm(null)
    setEditing(null)
    clearError()
  }

  const save = useMutation({
    mutationFn: (input: ReviewInput) =>
      editing
        ? adminApi.updateReview(editing.id, input)
        : adminApi.createReview(courseID, input),
    onSuccess: done,
    onError,
  })

  const remove = useMutation({
    mutationFn: (reviewID: number) => adminApi.deleteReview(reviewID),
    onSuccess: done,
    onError,
  })

  const open = (r: AdminReview | null) => {
    setEditing(r)
    setForm(
      r
        ? { title: r.title, content_md: r.content_md, order_idx: r.order_idx }
        : EMPTY_REVIEW,
    )
  }

  return (
    <Card className="mt-6">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="min-w-0 font-semibold text-fg-strong">
          {form
            ? editing
              ? t('ac.editReview')
              : t('ac.newReview')
            : t('ac.reviewList')}
        </h2>
        {!form && (
          <Button className="shrink-0 px-2.5 py-1.5 text-sm" onClick={() => open(null)}>
            <PlusIcon className="h-4 w-4" />
            {t('ac.add')}
          </Button>
        )}
      </div>

      {form ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            save.mutate(form)
          }}
          className="space-y-4 px-4 py-4"
        >
          <Field label={t('ac.fieldTitle')}>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={t('ac.reviewTitlePlaceholder')}
              autoFocus
              required
            />
          </Field>

          <Field label={t('ac.fieldContent')}>
            <MarkdownEditor
              value={form.content_md}
              onChange={(v) => setForm({ ...form, content_md: v })}
              placeholder={t('ac.reviewContentPlaceholder')}
            />
          </Field>

          {/* Only when editing: a new note is appended to the end by the server,
              so offering a position on create would be a field that lies. */}
          {editing && (
            <Field label={t('ac.fieldOrder')}>
              <Input
                type="number"
                min={0}
                value={form.order_idx}
                onChange={(e) =>
                  setForm({ ...form, order_idx: Number(e.target.value) || 0 })
                }
              />
            </Field>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending
                ? t('ac.saving')
                : editing
                  ? t('ac.save')
                  : t('ac.addReview')}
            </Button>
            <button
              type="button"
              onClick={() => {
                setForm(null)
                setEditing(null)
              }}
              className="rounded-md px-3 py-2 text-sm text-fg-muted transition hover:text-fg-strong"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      ) : reviews.isLoading ? (
        <p className="px-4 py-6 text-sm text-fg-subtle">{t('common.loading')}</p>
      ) : reviews.data?.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-fg-subtle">
          {t('ac.noReviews')}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {reviews.data?.map((r) => (
            <li key={r.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-fg-strong">{r.title}</p>
                  <p className="mt-0.5 font-mono text-xs text-fg-subtle">
                    #{r.order_idx}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1 text-sm">
                  <button
                    onClick={() => open(r)}
                    className="rounded px-2 py-0.5 text-xs text-accent-soft transition hover:bg-muted"
                  >
                    {t('ac.edit')}
                  </button>
                  <button
                    onClick={() => setDeleting(r)}
                    className="rounded px-2 py-0.5 text-xs text-danger transition hover:bg-danger/10"
                  >
                    {t('ac.delete')}
                  </button>
                </div>
              </div>
              {/* Rendered rather than shown as source: what an author needs to
                  check is how the table or the code block comes out. */}
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-fg-muted select-none">
                  {t('ac.viewContent')}
                </summary>
                <div className="mt-2 rounded-md border border-border bg-bg px-3 py-2">
                  <Prose>{r.content_md}</Prose>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}

      {deleting && (
        <ConfirmModal
          title={t('ac.deleteReviewTitle')}
          confirmLabel={remove.isPending ? t('ac.deleting') : t('ac.delete')}
          tone="danger"
          busy={remove.isPending}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            remove.mutate(deleting.id)
            setDeleting(null)
          }}
        >
          <p>
            {t('ac.reviewLostBefore')}{' '}
            <strong className="text-fg-strong">{deleting.title}</strong>{' '}
            {t('ac.reviewLostAfter')}
          </p>
          {/* Không chấm điểm nên không ai mất tiến độ — nói ra để người xoá khỏi
              phải đoán. */}
          <p>
            {t('ac.reviewNoProgress')}
          </p>
          <p className="text-danger">{t('ac.notRecoverable')}</p>
        </ConfirmModal>
      )}
    </Card>
  )
}

function LabForm({
  value,
  editing,
  images,
  saving,
  onChange,
  onCancel,
  onSubmit,
}: {
  value: LabInput
  editing: boolean
  images: { id: number; name: string; tag: string; active: boolean }[]
  saving: boolean
  onChange: (v: LabInput) => void
  onCancel: () => void
  onSubmit: () => void
}) {
  const t = useT()
  const set = <K extends keyof LabInput>(k: K, v: LabInput[K]) =>
    onChange({ ...value, [k]: v })

  const sim = value.sim_scenario !== null

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      className="rounded-xl border border-border bg-surface shadow-sm"
    >
      <h3 className="border-b border-border px-5 py-3 font-semibold text-fg-strong">
        {editing ? t('ac.editLab') : t('ac.newLab')}
      </h3>

      <div className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('ac.fieldTitle')}>
            <Input value={value.title} onChange={(e) => set('title', e.target.value)} />
          </Field>
          <Field label="Slug" hint={t('ac.slugHint')}>
            <Input
              value={value.slug}
              variant="terminal"
              onChange={(e) => set('slug', e.target.value)}
              placeholder="linux-lab-1"
            />
          </Field>
        </div>
        <Field label={t('ac.fieldGuide')} hint={t('ac.guideHint')}>
          <MarkdownEditor
            rows={6}
            value={value.description_md}
            onChange={(v) => set('description_md', v)}
            placeholder={t('ac.guidePlaceholder')}
          />
        </Field>
        {/* Same as the question form: a new lab is appended by the server, so
            its order box would be a control with no effect. */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t('ac.duration')}>
            <Input
              type="number"
              min={1}
              max={600}
              value={value.duration_minutes}
              onChange={(e) => set('duration_minutes', Number(e.target.value))}
            />
          </Field>
          {editing && (
            <Field label={t('ac.fieldOrder')} hint={t('ac.orderHint')}>
              <Input
                type="number"
                min={0}
                value={value.order_idx}
                onChange={(e) => set('order_idx', Number(e.target.value))}
              />
            </Field>
          )}
          <Field label="Image" hint={t('ac.imageHint')}>
            <select
              className={select}
              value={value.lab_image_id ?? ''}
              disabled={sim}
              title={sim ? t('ac.simNoContainer') : undefined}
              onChange={(e) =>
                set('lab_image_id', e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">{t('ac.notPicked')}</option>
              {images.map((im) => (
                <option key={im.id} value={im.id}>
                  {im.name}:{im.tag}
                  {im.active ? '' : t('ac.imageRetired')}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Một lab chạy container hoặc mô phỏng pipeline, không bao giờ cả hai —
            server và cả ràng buộc trong database đều nói vậy. Ở đây ô nào có
            nội dung thì ô kia khoá lại, để tác giả không điền xong mới bị từ
            chối. */}
        <JsonField
          label={t('ac.simScenario')}
          hint={
            value.lab_image_id !== null
              ? t('ac.simHasImage')
              : t('ac.simEmptyIsContainer')
          }
          value={value.sim_scenario}
          onChange={(v) => set('sim_scenario', v)}
          placeholder={SCENARIO_EXAMPLE}
        />
        {/* Hidden on a sim lab: there is no container for it to run in, and the
            server refuses the pair anyway. Showing a box whose value would be
            rejected is worse than not showing it. */}
        {!sim && (
          <Field label={t('ac.incidentSetup')} hint={t('ac.incidentSetupHint')}>
            <textarea
              rows={3}
              value={value.incident_setup}
              onChange={(e) => set('incident_setup', e.target.value)}
              className={textarea + ' font-mono text-sm'}
              placeholder={t('ac.incidentSetupPlaceholder')}
            />
          </Field>
        )}
        {!sim && value.incident_setup.trim() !== '' && (
          <p className="rounded-md border border-dashed border-border-strong px-3 py-2 text-xs leading-relaxed text-fg-subtle">
            {t('ac.incidentSetupNote')}
          </p>
        )}

        {sim && (
          <p className="rounded-md border border-dashed border-border-strong px-3 py-2 text-xs leading-relaxed text-fg-subtle">
            {t('ac.simNote1')}
            <br />
            {t('ac.simNote2Before')}{' '}
            <strong className="text-fg-muted">{t('ac.simNote2Strong')}</strong>
            {t('ac.simNote2After')}
            <br />
            {t('ac.simNote3')}
          </p>
        )}
      </div>

      {/* Actions on their own bar, so a long form always ends the same way. */}
      <div className="flex items-center gap-3 border-t border-border px-5 py-3">
        <Button type="submit" disabled={saving} className="px-3 py-2 text-sm">
          {saving ? t('ac.saving') : editing ? t('ac.save') : t('ac.createLab')}
        </Button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-fg-muted transition hover:text-fg-strong"
        >
          {t('common.cancel')}
        </button>
      </div>
    </form>
  )
}

/** Options of a choice question. Ticking more than one is allowed and turns it
 *  into a multiple-answer question — the student then has to pick exactly that
 *  set, no partial credit. */
function OptionsEditor({
  options,
  onChange,
}: {
  options: AdminOption[]
  onChange: (o: AdminOption[]) => void
}) {
  const t = useT()
  const patch = (i: number, o: Partial<AdminOption>) =>
    onChange(options.map((cur, j) => (i === j ? { ...cur, ...o } : cur)))

  const correct = options.filter((o) => o.correct).length

  return (
    <div className="space-y-2">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-fg">{t('ac.options')}</span>
        <span className="text-xs text-fg-subtle">
          {t('ac.optionsHint')}
        </span>
      </span>

      {/* The whole row turns green when it is an answer, not just a 16px tick —
          scanning six options for which ones are marked is the thing an author
          does most in here. */}
      {options.map((o, i) => (
        <div
          key={i}
          className={
            'flex items-center gap-2 rounded-lg border p-2 transition ' +
            (o.correct
              ? 'border-success/50 bg-success/10'
              : 'border-transparent hover:bg-muted/50')
          }
        >
          <label
            title={t('ac.correctAnswer')}
            className="flex shrink-0 cursor-pointer items-center gap-2 pl-1"
          >
            <input
              type="checkbox"
              checked={o.correct}
              onChange={(e) => patch(i, { correct: e.target.checked })}
              className="h-4 w-4 accent-[var(--success)]"
            />
            <span className="font-mono text-xs text-fg-subtle">
              {String.fromCharCode(65 + i)}
            </span>
          </label>
          <Input
            value={o.text}
            onChange={(e) => patch(i, { text: e.target.value })}
            placeholder={t('ac.optionN', { n: i + 1 })}
          />
          <button
            type="button"
            onClick={() => onChange(options.filter((_, j) => j !== i))}
            disabled={options.length <= 2}
            title={
              options.length <= 2 ? t('ac.needTwoOptions') : t('ac.deleteOption')
            }
            aria-label={t('ac.deleteOptionLabel')}
            className="shrink-0 rounded px-2 py-1 text-sm text-fg-subtle transition hover:bg-danger/10 hover:text-danger disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-fg-subtle"
          >
            ✕
          </button>
        </div>
      ))}

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onChange([...options, { text: '', correct: false }])}
          disabled={options.length >= 10}
          className="rounded-md border border-border-strong px-3 py-1.5 text-sm text-fg transition hover:border-accent disabled:opacity-50"
        >
          {t('ac.addOption')}
        </button>
        {/* The two ways an author leaves a question that cannot be answered
            correctly, both of which the server also refuses. */}
        {correct === 0 && (
          <span className="text-xs text-danger">{t('ac.noCorrect')}</span>
        )}
        {correct > 0 && correct === options.length && (
          <span className="text-xs text-danger">{t('ac.allCorrect')}</span>
        )}
      </div>
    </div>
  )
}

function TaskPanel({
  lab,
  onError,
  clearError,
}: {
  lab: AdminLab
  onError: (e: unknown) => void
  clearError: () => void
}) {
  const t = useT()
  const qc = useQueryClient()
  const [form, setForm] = useState<TaskInput | null>(null)
  const [editing, setEditing] = useState<AdminTask | null>(null)
  const [deleting, setDeleting] = useState<AdminTask | null>(null)
  // The command that performs the task. Kept out of TaskInput on purpose: it is
  // never saved, it only exists so a trial can check the passing direction too.
  const [setup, setSetup] = useState('')

  const trial = useMutation({
    mutationFn: (input: { script: string; setup: string }) =>
      adminApi.tryScript(lab.id, input.script, input.setup),
    onError,
  })

  const tasks = useQuery({
    queryKey: ['admin-tasks', lab.id],
    queryFn: () => adminApi.tasks(lab.id),
  })

  // Closing the form clears the trial with it: a verdict left on screen would
  // belong to the previous script and read as if it were about this one.
  const closeForm = () => {
    setForm(null)
    setEditing(null)
    setSetup('')
    trial.reset()
  }

  const done = () => {
    qc.invalidateQueries({ queryKey: ['admin-tasks', lab.id] })
    // Task count and total points live on the lab row.
    qc.invalidateQueries({ queryKey: ['admin-labs'] })
    closeForm()
    clearError()
  }

  const save = useMutation({
    mutationFn: (input: TaskInput) =>
      editing ? adminApi.updateTask(editing.id, input) : adminApi.createTask(lab.id, input),
    onSuccess: done,
    onError,
  })

  const remove = useMutation({
    mutationFn: (taskID: number) => adminApi.deleteTask(taskID),
    onSuccess: done,
    onError,
  })

  const set = <K extends keyof TaskInput>(k: K, v: TaskInput[K]) =>
    form && setForm({ ...form, [k]: v })

  // Built once and placed in one of two spots: at the top when adding, and in
  // the row being edited when editing. Editing a question a screen down should
  // not send the author back to the top of the list to find the form.
  const formEl = form ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            save.mutate(form)
          }}
          // Recessed rather than raised: the form is a drawer inside this card,
          // not a second card floating on top of it.
          className="space-y-4 bg-muted/40 px-5 py-4"
        >
          <h3 className="text-sm font-semibold text-fg-strong">
            {editing ? t('ac.editTask') : t('ac.newTask')}
          </h3>
          {/* Three cards rather than a dropdown: the kind decides which half of
              this form appears, so it is worth seeing all three options and
              what each one means without opening anything. */}
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-fg">
              {t('ac.taskKind')}
            </legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {KIND_CHOICES.map((k) => (
                <label
                  key={k.value}
                  className={
                    'cursor-pointer rounded-lg border px-3 py-2 transition ' +
                    (form.kind === k.value
                      ? 'border-accent bg-accent/10'
                      : 'border-border-strong bg-bg hover:border-accent/50')
                  }
                >
                  <input
                    type="radio"
                    name="task-kind"
                    className="sr-only"
                    checked={form.kind === k.value}
                    onChange={() => {
                      // Switching to a choice question with no options would
                      // leave the author staring at a form with nothing to
                      // fill in.
                      setForm({
                        ...form,
                        kind: k.value,
                        options:
                          k.value === 'choice' && form.options.length === 0
                            ? EMPTY_OPTIONS
                            : form.options,
                      })
                      trial.reset()
                    }}
                  />
                  <span className="block text-sm font-medium text-fg-strong">
                    {t(k.label)}
                  </span>
                  <span className="mt-0.5 block text-xs text-fg-muted">
                    {t(k.hint)}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <Field label={t('ac.prompt')}>
            <textarea
              rows={2}
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              className={textarea}
              placeholder={
                form.kind === 'choice'
                  ? t('ac.promptChoice')
                  : form.kind === 'command'
                    ? t('ac.promptCommand')
                    : t('ac.promptScript')
              }
            />
          </Field>
          <Field label={t('ac.hintField')} hint={t('ac.hintFieldHint')}>
            <MarkdownEditor
              rows={5}
              value={form.hint}
              onChange={(v) => set('hint', v)}
              placeholder={t('ac.hintPlaceholder')}
            />
          </Field>
          {form.kind === 'choice' && (
            <OptionsEditor
              options={form.options}
              onChange={(options) => setForm({ ...form, options })}
            />
          )}

          {form.kind === 'sim' && (
            <>
              <JsonField
                // Cùng lý do như form lab: ô giữ văn bản bên trong, chuyển sang
                // sửa nhiệm vụ khác phải dựng lại nó.
                key={editing?.id ?? 'new'}
                label={t('ac.goalField')}
                hint={t('ac.goalHint')}
                value={form.sim_goal}
                onChange={(v) => set('sim_goal', v)}
                placeholder={GOAL_EXAMPLE}
              />
              <p className="rounded-md border border-dashed border-border-strong px-3 py-2 text-xs leading-relaxed text-fg-subtle">
                {t('ac.simGoal1Before')}{' '}
                <strong className="text-fg-muted">{t('ac.simGoal1Strong')}</strong>
                {t('ac.simGoal1After')}
                <br />
                {t('ac.simGoal2Before')}{' '}
                <code className="font-mono">run_status</code>,{' '}
                <code className="font-mono">total_seconds_lte</code>,{' '}
                <code className="font-mono">jobs_parallel</code>,{' '}
                <code className="font-mono">cache_hit</code>,{' '}
                <code className="font-mono">job_present</code>
                {t('ac.simGoal2Mid')} <code className="font-mono">all</code>
                {t('ac.simGoal2Mid2')} <code className="font-mono">any</code>
                {t('ac.simGoal2After')}
                <br />
                <code className="font-mono">jobs_parallel</code>{' '}
                {t('ac.simGoal3')}
                <br />
                {t('ac.simGoal4')}
              </p>
            </>
          )}

          {form.kind === 'command' && (
            <>
              <Field label={t('ac.expectedCommands')} hint={t('ac.expectedHint')}>
                <textarea
                  rows={3}
                  value={form.expected_commands}
                  onChange={(e) => set('expected_commands', e.target.value)}
                  className={textarea + ' font-mono text-sm'}
                  placeholder={'uname -a\nuname --all'}
                />
              </Field>
              <p className="rounded-md border border-dashed border-border-strong px-3 py-2 text-xs leading-relaxed text-fg-subtle">
                {t('ac.cmdNote1Before')}{' '}
                <code className="font-mono">ls -la /</code>{' '}
                {t('ac.cmdNote1Mid')} <code className="font-mono">ls -al /</code>{' '}
                {t('ac.cmdNote1After')}
                <br />
                {t('ac.cmdNote2Before')}
                <code className="font-mono">uname</code>,{' '}
                <code className="font-mono">which</code>,{' '}
                <code className="font-mono">cat /proc/…</code>
                {t('ac.cmdNote2After')}
              </p>
            </>
          )}

          {form.kind === 'script' && (
            <>
          <Field label={t('ac.checkScript')} hint={t('ac.checkScriptHint')}>
            <textarea
              rows={3}
              value={form.check_script}
              onChange={(e) => set('check_script', e.target.value)}
              className={textarea + ' font-mono text-sm'}
              placeholder={'test -d "$HOME/birds"'}
            />
          </Field>
          {/* The three rules an author needs to know before their script runs.
              Getting any of them wrong fails students who did the task right. */}
          <p className="rounded-md border border-dashed border-border-strong px-3 py-2 text-xs leading-relaxed text-fg-subtle">
            {t('ac.scriptNote1')} <code className="font-mono">/bin/sh -c</code>
            {t('ac.scriptNote2')} <code className="font-mono">student</code>
            {t('ac.scriptNote3')} <code className="font-mono">/home/student</code>
            {t('ac.scriptNote4')} <code className="font-mono">cd</code>{' '}
            {t('ac.scriptNote5')}
          </p>

          <div className="space-y-3 rounded-md border border-border-strong bg-bg p-3">
            <Field
              label={t('ac.trial')}
              hint={t('ac.trialHint')}
            >
              <textarea
                rows={2}
                value={setup}
                onChange={(e) => setSetup(e.target.value)}
                className={textarea + ' font-mono text-sm'}
                placeholder={t('ac.setupPlaceholder')}
              />
            </Field>
            {/* Both directions matter. Without a setup command the container is
                untouched, so a correct script must FAIL — that is what catches
                the scripts which pass no matter what the student did. */}
            <p className="text-xs leading-relaxed text-fg-subtle">
              {t('ac.trialNoteBefore')}{' '}
              <strong className="text-fg-muted">{t('ac.trialNoteFail')}</strong>
              {t('ac.trialNoteMid')}{' '}
              <strong className="text-fg-muted">{t('ac.trialNotePass')}</strong>
              {t('ac.trialNoteAfter')}
            </p>
            <button
              type="button"
              onClick={() => trial.mutate({ script: form.check_script, setup })}
              // No image means no container to try it in — the same reason the
              // lab cannot be started by a student.
              disabled={
                trial.isPending || !form.check_script.trim() || lab.lab_image_id === null
              }
              className="inline-flex items-center gap-2 rounded-md border border-border-strong px-3 py-1.5 text-sm text-fg transition hover:border-accent disabled:opacity-50"
            >
              {trial.isPending && (
                <span
                  aria-hidden="true"
                  className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
                />
              )}
              {trial.isPending ? t('ac.running') : t('ac.runTrial')}
            </button>
            {lab.lab_image_id === null && (
              <p className="text-xs text-danger">
                {t('ac.noImageYet')}
              </p>
            )}

            {trial.data && (
              <div className="space-y-2 text-xs">
                {trial.data.setup_failed ? (
                  <p className="rounded border border-danger/40 bg-danger/10 px-2 py-1.5 text-danger">
                    {t('ac.setupFailed', { code: trial.data.setup_exit_code })}
                  </p>
                ) : (
                  <p
                    className={
                      'rounded px-2 py-1.5 ' +
                      (trial.data.passed
                        ? 'bg-success-soft text-success'
                        : 'bg-muted text-fg-muted')
                    }
                  >
                    {trial.data.passed ? t('ac.passed') : t('ac.failed')}{' '}
                    {t('ac.exitCode')} {trial.data.exit_code}
                  </p>
                )}
                {(trial.data.output || trial.data.setup_output) && (
                  <pre className="max-h-40 overflow-auto rounded bg-muted px-2 py-1.5 font-mono text-fg-muted">
                    {trial.data.setup_output}
                    {trial.data.output}
                  </pre>
                )}
              </div>
            )}
          </div>
            </>
          )}
          {/* Two small numbers, two small boxes — a full-width field for "10"
              reads as if a lot were expected in it. Order is missing on a new
              question because the server ignores it there and appends: offering
              a box whose value is discarded is worse than not offering one. */}
          <div className="flex flex-wrap gap-4">
            <Field label={t('ac.points')}>
              <Input
                type="number"
                min={0}
                max={1000}
                value={form.points}
                onChange={(e) => set('points', Number(e.target.value))}
                className="w-28"
              />
            </Field>
            {editing && (
              <Field label={t('ac.fieldOrder')} hint={t('ac.orderHint')}>
                <Input
                  type="number"
                  min={0}
                  value={form.order_idx}
                  onChange={(e) => set('order_idx', Number(e.target.value))}
                  className="w-28"
                />
              </Field>
            )}
          </div>
          <div className="flex items-center gap-3 border-t border-border pt-4">
            <Button type="submit" disabled={save.isPending} className="px-3 py-2 text-sm">
              {save.isPending
                ? t('ac.saving')
                : editing
                  ? t('ac.save')
                  : t('ac.createTask')}
            </Button>
            <button
              type="button"
              onClick={closeForm}
              className="text-sm text-fg-muted transition hover:text-fg-strong"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
  ) : null

  const startEdit = (t: AdminTask) => {
    closeForm()
    setEditing(t)
    setForm({
      title: t.title,
      hint: t.hint,
      kind: t.kind,
      check_script: t.check_script,
      options: t.options.length ? t.options : EMPTY_OPTIONS,
      expected_commands: t.expected_commands,
      sim_goal: t.sim_goal,
      points: t.points,
      order_idx: t.order_idx,
    })
    clearError()
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="min-w-0">
          <h2 className="truncate font-semibold text-fg-strong">{t('ac.tasks')}</h2>
          <p className="truncate text-xs text-fg-muted">
            {t('ac.taskSummary', {
              lab: lab.title,
              n: lab.task_count,
              points: lab.points,
            })}
          </p>
        </div>
        <Button
          className="px-3 py-1.5 text-sm"
          onClick={() => {
            closeForm()
            setForm(EMPTY_TASK)
            clearError()
          }}
        >
          <PlusIcon className="h-4 w-4" />
          {t('ac.addTask')}
        </Button>
      </div>

      {/* Only the new-question form sits here; an edit renders inside its row. */}
      {!editing && formEl && (
        <div className="border-b border-border">{formEl}</div>
      )}

      <ol className="divide-y divide-border">
        {tasks.isLoading && (
          <li className="px-5 py-6 text-sm text-fg-subtle">{t('common.loading')}</li>
        )}
        {tasks.data?.length === 0 && !form && (
          <li className="px-5 py-10 text-center text-sm text-fg-subtle">
            {t('ac.noTasks')}
          </li>
        )}
        {tasks.data?.map((task, i) => (
          <li key={task.id}>
            {editing?.id === task.id ? (
              formEl
            ) : (
              // One line per question, answer key behind a disclosure. Ten
              // questions with their options open is a screen of scrolling to
              // reach the buttons on the last one. <details> because the browser
              // already does this, including keyboard and find-in-page.
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-2.5 px-5 py-2.5 transition hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
                  <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-fg-subtle transition group-open:rotate-90" />
                  {/* Numbered by position in the list, which is the order the
                      student meets them in — not the id. */}
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-muted font-mono text-xs text-fg-muted">
                    {i + 1}
                  </span>
                  {/* Clipped while closed so every row is one line; the full
                      wording comes back when the row is opened. */}
                  <span className="min-w-0 flex-1 truncate text-sm text-fg group-open:overflow-visible group-open:whitespace-normal">
                    {task.title}
                  </span>
                  <KindBadge kind={task.kind} />
                  <span className="shrink-0 rounded bg-muted px-2 py-0.5 font-mono text-xs text-accent-soft">
                    {task.points}
                    {t('ac.pointsShort')}
                  </span>
                  {/* preventDefault, or the click that hits a button also toggles
                      the row it lives in. */}
                  <span className="flex shrink-0 gap-1">
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        startEdit(task)
                      }}
                      className="rounded px-2 py-1 text-xs text-accent-soft transition hover:bg-muted"
                    >
                      {t('ac.edit')}
                    </button>
                    <button
                      onClick={(e) => {
                        // preventDefault, hoặc cú bấm này cũng gập luôn hàng nó
                        // đang nằm trong.
                        e.preventDefault()
                        setDeleting(task)
                      }}
                      className="rounded px-2 py-1 text-xs text-danger transition hover:bg-danger/10"
                    >
                      {t('ac.delete')}
                    </button>
                  </span>
                </summary>

                <div className="px-5 pb-3 pl-16">
                  {task.kind === 'sim' ? (
                    <pre className="overflow-x-auto rounded bg-muted px-3 py-2 font-mono text-xs text-fg-muted">
                      {task.sim_goal
                        ? JSON.stringify(task.sim_goal, null, 2)
                        : t('ac.noGoal')}
                    </pre>
                  ) : task.kind === 'command' ? (
                    <pre className="overflow-x-auto rounded bg-muted px-3 py-2 font-mono text-xs text-fg-muted">
                      {task.expected_commands}
                    </pre>
                  ) : task.kind === 'choice' ? (
                    <ul className="space-y-1 text-xs">
                      {task.options.map((o, j) => (
                        <li key={j} className={o.correct ? 'text-success' : 'text-fg-muted'}>
                          {o.correct ? '✓' : '○'} {o.text}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <pre className="overflow-x-auto rounded bg-muted px-3 py-2 font-mono text-xs text-fg-muted">
                      {task.check_script ||
                        t('ac.noScript')}
                    </pre>
                  )}
                  {/* The same renderer as the editor preview, so a hint reads
                      here exactly as it will in the lab. */}
                  {task.hint && (
                    <div className="mt-3 border-t border-border pt-3">
                      <p className="mb-1.5 text-xs font-medium text-fg-muted">
                        {t('ac.hintField')}
                      </p>
                      <Prose>{task.hint}</Prose>
                    </div>
                  )}
                </div>
              </details>
            )}
          </li>
        ))}
      </ol>

      {deleting && (
        <ConfirmModal
          title={t('ac.deleteTaskTitle')}
          confirmLabel={remove.isPending ? t('ac.deleting') : t('ac.deleteTask')}
          tone="danger"
          busy={remove.isPending}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            remove.mutate(deleting.id)
            setDeleting(null)
          }}
        >
          <p className="text-fg-strong">{deleting.title}</p>
          <p>{t('ac.taskPointsLost')}</p>
          <p className="text-danger">{t('ac.notRecoverable')}</p>
        </ConfirmModal>
      )}
    </Card>
  )
}

const KINDS: Record<AdminTask['kind'], Key> = {
  script: 'lab.kind.script',
  command: 'lab.kind.command',
  choice: 'lab.kind.choice',
  sim: 'lab.kind.sim',
}

/** How the question is marked. Four kinds are marked four different ways, and
 *  the body below only shows the answer key — not what it is. */
function KindBadge({ kind }: { kind: AdminTask['kind'] }) {
  const t = useT()
  return (
    <span className="rounded bg-muted px-2 py-0.5 text-xs text-fg-muted">
      {t(KINDS[kind])}
    </span>
  )
}
