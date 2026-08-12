import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { adminApi, type AdminDrill, type LabInput } from '@/api/admin'
import { ApiError } from '@/lib/api'
import { Button, Card, ErrorBox, Field, Input } from '@/components/ui'
import { PlusIcon } from '@/components/icons'
import { IncidentPanel } from '@/components/IncidentPanel'
import { MarkdownEditor } from '@/components/MarkdownEditor'
import { ClockIcon, TerminalIcon } from '@/components/icons'
import { useT, type Key } from '@/lib/i18n'

type Filter = 'all' | 'published' | 'draft'

const FILTERS: { key: Filter; label: Key }[] = [
  { key: 'all', label: 'war.filterAll' },
  { key: 'published', label: 'war.filterPublished' },
  { key: 'draft', label: 'war.filterDraft' },
]

// A drill is a lab, so creating one is creating a lab — the same endpoint the
// course screen posts to. No second way in, and nothing new on the server.
//
// incident_setup starts empty but the form requires it: it is the field that
// files the lab under War Room, and a drill created without it would drop
// straight out of this list.
const EMPTY_DRILL: LabInput = {
  slug: '',
  title: '',
  description_md: '',
  duration_minutes: 30,
  lab_image_id: null,
  sim_scenario: null,
  incident_setup: '',
  order_idx: 0,
}

const textarea =
  'w-full rounded-md border border-border-strong bg-bg px-3 py-2.5 text-fg outline-none ' +
  'transition placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-accent/25'


/** War Room from the author's side, and self-contained on purpose.
 *
 *  The first version of this screen linked each drill into the Courses section
 *  to edit it, which made a separate nav entry that was not a separate section.
 *  The scenario editor is rendered here instead — the same component, imported
 *  rather than copied, so there is still only one of it.
 *
 *  It exists because a drill is reachable nowhere else. A drill is a lab with
 *  incident scenarios on it — no flag column says so — and `labs.course_id` is
 *  NOT NULL, so every one of them is filed under some course. Without this list
 *  an author has to remember which course a challenge was created in, and a lab
 *  whose last scenario was switched off is invisible to everybody: it has
 *  dropped out of the student-facing War Room and looks like an ordinary lab
 *  everywhere in admin.
 *
 *  Same two-column shape as the course content screen: a narrow rail to pick
 *  with, a wide area to work in. Picking is a glance, editing is the job. */
export default function AdminWarRoom() {
  const t = useT()
  const qc = useQueryClient()
  const [selectedID, setSelectedID] = useState<number | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [error, setError] = useState('')

  // One box for both create and edit: the fields are the same, and a drill with
  // no course has no lab page to be edited on.
  const [form, setForm] = useState<LabInput | null>(null)
  const [editingID, setEditingID] = useState<number | null>(null)

  const drills = useQuery({ queryKey: ['admin-drills'], queryFn: adminApi.drills })
  // Only fetched once the form opens: the picker is the only thing that needs
  // it, and most visits to this screen never open it.
  const save = useMutation({
    mutationFn: (v: { id: number | null; input: LabInput }) =>
      v.id === null
        ? adminApi.createDrill(v.input)
        : adminApi.updateLab(v.id, v.input),
    onSuccess: (lab) => {
      qc.invalidateQueries({ queryKey: ['admin-drills'] })
      // Straight into the drill, because the next thing to do is add a scenario
      // to it and that panel is one selection away.
      setSelectedID(lab.id)
      setForm(null)
      setEditingID(null)
      setError('')
    },
    onError: (e) =>
      setError(
        e instanceof ApiError
          ? e.message
          : editingID === null
            ? t('war.createFailed')
            : t('war.saveFailed'),
      ),
  })

  // The server refuses a publish with nothing to draw, and its sentence names
  // what to do about it — shown as-is rather than replaced with a generic one.
  const setStatus = useMutation({
    mutationFn: (v: { id: number; status: 'draft' | 'published' }) =>
      adminApi.setDrillStatus(v.id, v.status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-drills'] })
      setError('')
    },
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : t('war.statusFailed')),
  })

  const all = useMemo(() => drills.data ?? [], [drills.data])
  const shown = useMemo(
    () => all.filter((d) => filter === 'all' || d.status === filter),
    [all, filter],
  )

  // Read out of the fresh list rather than held in state: turning a scenario on
  // or off refetches this, and a copy taken when the row was clicked would keep
  // showing the counts from before the edit.
  const selected = all.find((d) => d.id === selectedID) ?? null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg-strong">{t('war.adminTitle')}</h1>
          <p className="mt-1 max-w-3xl text-sm text-fg-muted">
            {t('war.adminSubtitle')}
          </p>
        </div>
        {!form && (
          <Button
            className="shrink-0"
            onClick={() => {
              setForm(EMPTY_DRILL)
              setEditingID(null)
              setError('')
            }}
          >
            <PlusIcon className="h-4 w-4" />
            {t('war.create')}
          </Button>
        )}
      </div>

      {form && (
        <DrillForm
          value={form}
          editing={editingID !== null}
          saving={save.isPending}
          onChange={setForm}
          onCancel={() => {
            setForm(null)
            setEditingID(null)
          }}
          onSubmit={() => save.mutate({ id: editingID, input: form })}
        />
      )}

      {error && (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {drills.isLoading && (
        <p className="py-10 text-center text-sm text-fg-subtle">
          {t('common.loading')}
        </p>
      )}
      {drills.isError && <ErrorBox>{t('war.adminLoadError')}</ErrorBox>}

      {/* Only when nothing is being created — an empty list behind an open form
          is telling somebody to do the thing they are already doing. */}
      {drills.data?.length === 0 && !form && (
        <Card className="flex flex-col items-center px-6 py-16 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-muted text-fg-subtle">
            <TerminalIcon className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm font-medium text-fg">{t('war.adminEmpty')}</p>
          <p className="mt-1 max-w-md text-sm text-fg-subtle">
            {t('war.adminEmptyHint')}
          </p>
        </Card>
      )}

      {all.length > 0 && (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <Card className="w-full shrink-0 overflow-hidden p-0 lg:w-76">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-fg-strong">
                {t('war.drillList')}
                <span className="ml-1.5 font-normal text-fg-subtle">
                  {shown.length}/{all.length}
                </span>
              </h2>
              <div
                role="group"
                aria-label={t('war.filterGroup')}
                className="mt-2 flex gap-1 rounded-lg bg-muted p-1"
              >
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    aria-pressed={filter === f.key}
                    className={
                      'flex-1 rounded-md px-2 py-1 text-xs font-medium transition ' +
                      (filter === f.key
                        ? 'bg-surface text-fg-strong shadow-sm'
                        : 'text-fg-muted hover:text-fg-strong')
                    }
                  >
                    {t(f.label)}
                  </button>
                ))}
              </div>
            </div>
            <ul className="max-h-[70vh] divide-y divide-border overflow-y-auto">
              {shown.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-fg-subtle">
                  {t('war.noMatch')}
                </li>
              )}
              {shown.map((d) => (
                <li key={d.id} className="relative">
                  {selectedID === d.id && (
                    <span
                      className="absolute inset-y-0 left-0 w-0.5 bg-accent"
                      aria-hidden="true"
                    />
                  )}
                  <button
                    onClick={() => {
                      setSelectedID(d.id)
                      setError('')
                    }}
                    aria-current={selectedID === d.id ? 'true' : undefined}
                    className={
                      'block w-full px-4 py-3 text-left transition ' +
                      (selectedID === d.id ? 'bg-muted' : 'hover:bg-muted/50')
                    }
                  >
                    <span className="block font-medium text-fg-strong">
                      {d.title}
                    </span>
                    {d.course_id !== null && (
                      <span className="mt-0.5 block truncate text-xs text-fg-subtle">
                        {t('war.inCourse')} {d.course_title}
                      </span>
                    )}
                    <DrillBadges drill={d} />
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <section className="min-w-0 flex-1">
            {selected ? (
              <div className="space-y-4">
                <Card className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <h2 className="font-semibold text-fg-strong">{selected.title}</h2>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-fg-subtle">
                      <span>{selected.slug}</span>
                      <span className="inline-flex items-center gap-1">
                        <ClockIcon className="h-3.5 w-3.5" />
                        {selected.duration_minutes}′
                      </span>
                    </p>
                    <DrillBadges drill={selected} />
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {/* Disabled rather than hidden when there is nothing to
                        draw: the button is where an author looks for it, and a
                        title saying why beats a control that vanished. */}
                    <button
                      onClick={() =>
                        setStatus.mutate({
                          id: selected.id,
                          status:
                            selected.status === 'published' ? 'draft' : 'published',
                        })
                      }
                      disabled={
                        setStatus.isPending ||
                        (selected.status === 'draft' && selected.incident_count === 0)
                      }
                      title={
                        selected.status === 'draft' && selected.incident_count === 0
                          ? t('war.cannotPublish')
                          : undefined
                      }
                      className={
                        'rounded-md px-4 py-2 text-sm font-medium whitespace-nowrap transition ' +
                        'disabled:cursor-not-allowed disabled:opacity-40 ' +
                        (selected.status === 'published'
                          ? 'border border-border-strong text-fg-muted hover:border-danger hover:text-danger'
                          : 'bg-accent text-accent-fg hover:bg-accent-hover')
                      }
                    >
                      {setStatus.isPending
                        ? t('war.publishing')
                        : selected.status === 'published'
                          ? t('war.unpublish')
                          : t('war.publish')}
                    </button>
                    {/* Edited here, not elsewhere: a challenge with no course
                        has no lab page in the Courses section to be edited on. */}
                    <button
                      onClick={() => {
                        setEditingID(selected.id)
                        setForm({
                          slug: selected.slug,
                          title: selected.title,
                          description_md: '',
                          duration_minutes: selected.duration_minutes,
                          lab_image_id: selected.lab_image_id,
                          sim_scenario: null,
                          incident_setup: selected.incident_setup,
                          order_idx: 0,
                        })
                        setError('')
                      }}
                      className="text-sm text-accent-soft hover:underline"
                    >
                      {t('war.edit')}
                    </button>
                  </div>
                </Card>

                {selected.incident_setup.trim() !== '' && (
                  <Card className="overflow-hidden p-0">
                    <p className="border-b border-border px-4 py-2 text-xs font-medium text-fg-muted">
                      {t('war.setupScript')}
                    </p>
                    <pre className="overflow-x-auto px-4 py-3 font-mono text-xs text-fg-muted">
                      {selected.incident_setup}
                    </pre>
                  </Card>
                )}

                {/* Keyed by lab: switching drills has to drop the open form and
                    whatever was half-typed in it, all of which described the
                    drill that was showing a moment ago. */}
                <IncidentPanel
                  key={selected.id}
                  labID={selected.id}
                  onError={(e) =>
                    setError(e instanceof Error ? e.message : t('war.adminLoadError'))
                  }
                  clearError={() => setError('')}
                />
              </div>
            ) : (
              <Card className="flex flex-col items-center px-6 py-16 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-muted text-fg-subtle">
                  <TerminalIcon className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm font-medium text-fg">
                  {t('war.noDrillPicked')}
                </p>
                <p className="mt-1 max-w-xs text-sm text-fg-subtle">
                  {t('war.pickDrill')}
                </p>
              </Card>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

/** The states worth flagging, all of which mean the drill does not run as its
 *  author expects. Shared by the rail and the header so the two cannot disagree
 *  about what is wrong with a lab. */
function DrillBadges({ drill }: { drill: AdminDrill }) {
  const t = useT()
  return (
    <span className="mt-1.5 flex flex-wrap gap-1.5">
      {/* Status first: it is the answer to "is anybody seeing this", and every
          other badge here only qualifies it. */}
      <span
        className={
          'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ' +
          (drill.status === 'published'
            ? 'bg-success-soft text-success'
            : 'bg-muted text-fg-muted')
        }
      >
        <span
          className={
            'h-1.5 w-1.5 rounded-full ' +
            (drill.status === 'published' ? 'bg-success' : 'bg-fg-subtle')
          }
          aria-hidden="true"
        />
        {drill.status === 'published' ? t('war.published') : t('war.draft')}
      </span>
      {/* Published with nothing to draw: the query hides it from students, so
          the admin list is the only place this can be noticed. */}
      {drill.status === 'published' && drill.incident_count === 0 && (
        <span className="rounded bg-danger/10 px-2 py-0.5 text-xs text-danger">
          {t('war.publishedNoActive')}
        </span>
      )}
      {drill.incident_count > 0 ? (
        <span className="rounded bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
          {t('war.activeCount', { n: drill.incident_count })}
        </span>
      ) : drill.scenario_count > 0 ? (
        <span className="rounded bg-muted px-2 py-0.5 text-xs text-fg-muted">
          {t('war.retiredOnly')}
        </span>
      ) : (
        <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs text-amber-500">
          {t('war.preparing')}
        </span>
      )}
      {drill.lab_image_id === null && (
        <span className="rounded bg-danger/10 px-2 py-0.5 text-xs text-danger">
          {t('war.noImageWarn')}
        </span>
      )}
      {drill.incident_setup.trim() === '' && (
        <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs text-amber-500">
          {t('war.noSetup')}
        </span>
      )}
    </span>
  )
}


/** Create and edit in one form: the fields are identical, and a drill that
 *  belongs to no course has no lab page elsewhere to be edited on.
 *
 *  There is no course picker. A challenge belongs to no course — `labs.course_id`
 *  is nullable since 000028 and this posts a row with none — so its points land
 *  on no scoreboard and no enrolment stands between a student and it.
 *
 *  The setup script is required. It is what puts the lab in the War Room list at
 *  all, and the server refuses a challenge without one; saying so here means an
 *  author finds out before pressing rather than after. */
function DrillForm({
  value,
  editing,
  saving,
  onChange,
  onCancel,
  onSubmit,
}: {
  value: LabInput
  editing: boolean
  saving: boolean
  onChange: (v: LabInput) => void
  onCancel: () => void
  onSubmit: () => void
}) {
  const t = useT()
  const set = <K extends keyof LabInput>(k: K, v: LabInput[K]) =>
    onChange({ ...value, [k]: v })

  const ready =
    value.title.trim() !== '' &&
    value.slug.trim() !== '' &&
    value.incident_setup.trim() !== ''

  return (
    <Card className="overflow-hidden p-0">
      <h2 className="border-b border-border px-5 py-3 font-semibold text-fg-strong">
        {editing ? t('war.editTitle') : t('war.createTitle')}
      </h2>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (ready) onSubmit()
        }}
        className="space-y-4 px-5 py-4"
      >
        {!editing && (
          <p className="rounded-md border border-dashed border-border-strong px-3 py-2 text-xs leading-relaxed text-fg-subtle">
            {t('war.standalone')}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('ac.fieldTitle')}>
            <Input
              value={value.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder={t('ac.incidentTitlePlaceholder')}
              autoFocus
              required
            />
          </Field>
          <Field label="Slug" hint={t('ac.slugHint')}>
            <Input
              variant="terminal"
              value={value.slug}
              onChange={(e) => set('slug', e.target.value)}
              placeholder="war-room-nginx"
              required
            />
          </Field>
        </div>

        <Field label={t('ac.fieldGuide')} hint={t('ac.guideHint')}>
          <MarkdownEditor
            rows={5}
            value={value.description_md}
            onChange={(v) => set('description_md', v)}
            placeholder={t('ac.guidePlaceholder')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('ac.duration')}>
            <Input
              type="number"
              min={1}
              max={600}
              value={value.duration_minutes}
              onChange={(e) => set('duration_minutes', Number(e.target.value))}
            />
          </Field>
        </div>

        <Field label={t('ac.incidentSetup')} hint={t('ac.incidentSetupHint')}>
          <textarea
            rows={3}
            value={value.incident_setup}
            onChange={(e) => set('incident_setup', e.target.value)}
            className={textarea + ' font-mono text-sm'}
            placeholder={t('ac.incidentSetupPlaceholder')}
            required
          />
        </Field>
        <p className="rounded-md border border-dashed border-border-strong px-3 py-2 text-xs leading-relaxed text-fg-subtle">
          {t('war.setupRequired')}
          {!editing && (
            <>
              <br />
              {t('war.nextStep')}
            </>
          )}
        </p>

        <div className="flex items-center gap-3 border-t border-border pt-4">
          <Button type="submit" disabled={!ready || saving} className="px-3 py-2 text-sm">
            {saving
              ? editing
                ? t('war.saving')
                : t('war.creating')
              : editing
                ? t('war.save')
                : t('war.create')}
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
    </Card>
  )
}
