import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  adminApi,
  type AdminIncident,
  type IncidentInput,
} from '@/api/admin'
import { Button, Card, Field, Input } from '@/components/ui'
import { ConfirmModal } from '@/components/ConfirmModal'
import { MarkdownEditor } from '@/components/MarkdownEditor'
import { PlusIcon } from '@/components/icons'
import { useT } from '@/lib/i18n'

// Same box the admin forms use elsewhere. Copied rather than exported from
// AdminCourse: one shared string constant across two screens is not worth an
// import that makes this component depend on a page.
const textarea =
  'w-full rounded-md border border-border-strong bg-bg px-3 py-2.5 text-fg outline-none ' +
  'transition placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-accent/25'

// Active by default: an author adding a scenario means it to be drawn. Retiring
// is the deliberate act, not enabling.
const EMPTY_INCIDENT: IncidentInput = {
  title: '',
  break_script: '',
  reveal_md: '',
  rps: 20,
  active: true,
}

/** The ways one lab's service can be broken — the whole of what makes it a War
 *  Room drill, since no flag column says so.
 *
 *  Lives in its own file because the War Room screen is where it is edited and
 *  that screen has to be self-contained: a section of the admin nav that bounces
 *  the author into another section is not a section.
 *
 *  Takes a lab id rather than a lab: it reads nothing else off one, and asking
 *  for the whole record would tie every caller to fetching a lab first.
 *
 *  Retired scenarios stay in the list on purpose. They are retired rather than
 *  deleted so old reports can still read them back, and hiding them would leave
 *  an author wondering where one went and writing it a second time. */
export function IncidentPanel({
  labID,
  onError,
  clearError,
}: {
  labID: number
  onError: (e: unknown) => void
  clearError: () => void
}) {
  const t = useT()
  const qc = useQueryClient()
  const [form, setForm] = useState<IncidentInput | null>(null)
  const [editing, setEditing] = useState<AdminIncident | null>(null)
  const [deleting, setDeleting] = useState<AdminIncident | null>(null)

  const incidents = useQuery({
    queryKey: ['admin-incidents', labID],
    queryFn: () => adminApi.incidents(labID),
  })

  // The lab list carries incident_count, and that count is what badges a lab as
  // a drill — so it has to be refetched with every write here or the rail keeps
  // claiming the old number.
  const done = () => {
    qc.invalidateQueries({ queryKey: ['admin-incidents', labID] })
    qc.invalidateQueries({ queryKey: ['admin-labs'] })
    qc.invalidateQueries({ queryKey: ['admin-drills'] })
    setForm(null)
    setEditing(null)
    clearError()
  }

  const save = useMutation({
    mutationFn: (in_: IncidentInput) =>
      editing
        ? adminApi.updateIncident(editing.id, in_)
        : adminApi.createIncident(labID, in_),
    onSuccess: done,
    onError,
  })

  const remove = useMutation({
    mutationFn: (id: number) => adminApi.deleteIncident(id),
    onSuccess: done,
    onError,
  })

  const open = (inc: AdminIncident | null) => {
    clearError()
    setEditing(inc)
    setForm(
      inc
        ? {
            title: inc.title,
            break_script: inc.break_script,
            reveal_md: inc.reveal_md,
            rps: inc.rps,
            active: inc.active,
          }
        : EMPTY_INCIDENT,
    )
  }

  const set = <K extends keyof IncidentInput>(k: K, v: IncidentInput[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f))

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="min-w-0">
          <h2 className="truncate font-semibold text-fg-strong">
            {t('ac.incidents')}
          </h2>
          <p className="mt-0.5 text-xs text-fg-muted">{t('ac.incidentsSummary')}</p>
        </div>
        {!form && (
          <Button className="shrink-0 px-3 py-1.5 text-sm" onClick={() => open(null)}>
            <PlusIcon className="h-4 w-4" />
            {t('ac.addIncident')}
          </Button>
        )}
      </div>

      {form && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            save.mutate(form)
          }}
          className="space-y-4 bg-muted/40 px-5 py-4"
        >
          <h3 className="text-sm font-semibold text-fg-strong">
            {editing ? t('ac.editIncident') : t('ac.newIncident')}
          </h3>

          <Field label={t('ac.incidentTitle')} hint={t('ac.incidentTitleHint')}>
            <Input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder={t('ac.incidentTitlePlaceholder')}
              autoFocus
              required
            />
          </Field>

          <Field label={t('ac.breakScript')} hint={t('ac.breakScriptHint')}>
            <textarea
              rows={3}
              value={form.break_script}
              onChange={(e) => set('break_script', e.target.value)}
              className={textarea + ' font-mono text-sm'}
              placeholder={t('ac.breakScriptPlaceholder')}
            />
          </Field>
          <p className="rounded-md border border-dashed border-border-strong px-3 py-2 text-xs leading-relaxed text-fg-subtle">
            {t('ac.breakScriptNote')}
          </p>

          <Field label={t('ac.revealMD')} hint={t('ac.revealHint')}>
            <MarkdownEditor
              rows={5}
              value={form.reveal_md}
              onChange={(v) => set('reveal_md', v)}
              placeholder={t('ac.revealPlaceholder')}
            />
          </Field>

          <div className="flex flex-wrap items-end gap-4">
            <Field label={t('ac.rps')} hint={t('ac.rpsHint')}>
              <Input
                type="number"
                min={0}
                max={100000}
                value={form.rps}
                onChange={(e) => set('rps', Number(e.target.value) || 0)}
                className="w-32"
              />
            </Field>
            {/* A checkbox rather than two buttons: this is the switch between
                "in the pool" and "kept for the reports", and it is the field an
                author touches most after writing the script once. */}
            <label className="flex items-center gap-2 pb-2 text-sm text-fg">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => set('active', e.target.checked)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              <span>
                {t('ac.active')}
                <span className="ml-1.5 text-xs text-fg-subtle">
                  {t('ac.activeHint')}
                </span>
              </span>
            </label>
          </div>

          <div className="flex items-center gap-3 border-t border-border pt-4">
            <Button type="submit" disabled={save.isPending} className="px-3 py-2 text-sm">
              {save.isPending
                ? t('ac.saving')
                : editing
                  ? t('ac.save')
                  : t('ac.createIncident')}
            </Button>
            <button
              type="button"
              onClick={() => {
                setForm(null)
                setEditing(null)
              }}
              className="text-sm text-fg-muted transition hover:text-fg-strong"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      )}

      {incidents.isLoading ? (
        <p className="px-5 py-6 text-sm text-fg-subtle">{t('common.loading')}</p>
      ) : incidents.data?.length === 0 && !form ? (
        <p className="px-5 py-8 text-center text-sm text-fg-subtle">
          {t('ac.noIncidents')}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {incidents.data?.map((inc) => (
            <li key={inc.id} className="px-5 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium text-fg-strong">
                    <span className="truncate">{inc.title}</span>
                    {!inc.active && (
                      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal uppercase text-fg-subtle">
                        {t('ac.incidentOff')}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-fg-subtle">
                    {inc.rps} rps
                  </p>
                </div>
                <div className="flex shrink-0 gap-1 text-sm">
                  <button
                    onClick={() => open(inc)}
                    className="rounded px-2 py-0.5 text-xs text-accent-soft transition hover:bg-muted"
                  >
                    {t('ac.edit')}
                  </button>
                  <button
                    onClick={() => setDeleting(inc)}
                    className="rounded px-2 py-0.5 text-xs text-danger transition hover:bg-danger/10"
                  >
                    {t('ac.delete')}
                  </button>
                </div>
              </div>
              {/* Folded away: this is the answer, and an author scrolling the
                  list is usually looking for which scenario, not for how. */}
              {inc.break_script.trim() !== '' && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-fg-muted select-none">
                    {t('ac.viewScript')}
                  </summary>
                  <pre className="mt-2 overflow-x-auto rounded bg-muted px-3 py-2 font-mono text-xs text-fg-muted">
                    {inc.break_script}
                  </pre>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}

      {deleting && (
        <ConfirmModal
          title={t('ac.deleteIncidentTitle')}
          confirmLabel={remove.isPending ? t('ac.deleting') : t('ac.deleteIncident')}
          tone="danger"
          busy={remove.isPending}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            remove.mutate(deleting.id)
            setDeleting(null)
          }}
        >
          <p className="text-fg-strong">{deleting.title}</p>
          <p>{t('ac.incidentDeleteNote')}</p>
        </ConfirmModal>
      )}
    </Card>
  )
}
