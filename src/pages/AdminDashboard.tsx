import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { adminApi } from '@/api/admin'
import { ApiError } from '@/lib/api'
import { Card, ErrorBox, StatCard } from '@/components/ui'
import { ConfirmModal } from '@/components/ConfirmModal'
import {
  BookIcon,
  LayersIcon,
  TerminalIcon,
  UsersIcon,
} from '@/components/icons'
import { formatWhen, timeAgo } from '@/lib/relativeTime'
import type { LabStat, RunningSession } from '@/lib/types'
import { useT } from '@/lib/i18n'

const pct = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 100) : 0

/** The admin overview. One endpoint, one screen: totals across the top and the
 *  per-lab table under them. No time series — "what does the platform look like
 *  right now" is the question here, and a trend is a different screen. */
export default function AdminDashboard() {
  const t = useT()
  const stats = useQuery({ queryKey: ['admin-stats'], queryFn: adminApi.stats })

  if (stats.isLoading) {
    return (
      <p className="py-12 text-center text-sm text-fg-subtle">
        {t('common.loading')}
      </p>
    )
  }
  if (stats.isError || !stats.data) {
    return <ErrorBox>{t('dash.loadError')}</ErrorBox>
  }

  const s = stats.data
  const labs = s.labs

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg-strong">{t('dash.title')}</h1>
        <p className="mt-1 text-sm text-fg-muted">
          {t('dash.subtitle')}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Registrations on their own say nothing about use, so the figure that
            gets the tile is the one with a person behind it. */}
        <StatCard
          label={t('dash.activeStudents')}
          value={s.active_students}
          icon={UsersIcon}
          tint="sky"
        />
        <StatCard
          label={t('dash.sessionsWeek')}
          value={s.sessions_week}
          icon={LayersIcon}
          tint="violet"
        />
        <StatCard
          label={t('dash.published')}
          value={s.published}
          icon={BookIcon}
          tint="amber"
        />
        {/* The one number here that costs money while nobody is watching it. */}
        <StatCard
          label={t('dash.running')}
          value={s.running}
          icon={TerminalIcon}
          tint="emerald"
        />
      </div>

      <Card className="p-5">
        <p className="text-sm font-medium text-fg-strong">{t('dash.cumulative')}</p>
        <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          <Total label={t('dash.accounts')} value={s.students} />
          <Total
            label={t('dash.courses')}
            value={t('dash.publishedOf', {
              published: s.published,
              total: s.courses,
            })}
          />
          <Total label={t('dash.sessions')} value={s.sessions} />
          <Total
            label={t('dash.submitted')}
            value={`${s.submitted} (${pct(s.submitted, s.sessions)}%)`}
          />
        </dl>
      </Card>

      <RunningSessions />

      <Card className="overflow-hidden">
        <div className="border-b border-border px-5 py-3">
          <p className="font-medium text-fg-strong">{t('dash.byLab')}</p>
          <p className="mt-0.5 text-xs text-fg-muted">
            {t('dash.byLabHint')}
          </p>
        </div>

        {labs.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-fg-subtle">
            {t('dash.noLabsBefore')}{' '}
            <Link to="/admin/courses" className="text-accent-soft hover:underline">
              {t('dash.createCourse')}
            </Link>{' '}
            {t('dash.noLabsAfter')}
          </p>
        ) : (
          /* The table scrolls inside the card rather than widening the page:
             five numeric columns do not fit a phone, and a body that scrolls
             sideways takes the whole layout with it. */
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-fg-muted">
                  <th className="px-5 py-2 font-medium">Lab</th>
                  <th className="px-3 py-2 text-right font-medium">{t('dash.colRuns')}</th>
                  <th className="px-3 py-2 text-right font-medium">{t('dash.colSubmitted')}</th>
                  <th className="px-3 py-2 text-right font-medium">{t('dash.colGraded')}</th>
                  <th className="px-5 py-2 text-right font-medium">{t('dash.colRetried')}</th>
                </tr>
              </thead>
              <tbody>
                {labs.map((l) => (
                  <LabRow key={l.lab_id} lab={l} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

/** The live containers, with the button that kills one. Its own query rather
 *  than a field on the stats response: this is the part that goes stale in
 *  seconds, and killing one reloads only this. Renders nothing when the list is
 *  empty — an empty table is noise on a screen that is mostly numbers. */
function RunningSessions() {
  const t = useT()
  const qc = useQueryClient()
  const [target, setTarget] = useState<RunningSession | null>(null)
  const [error, setError] = useState('')

  const sessions = useQuery({
    queryKey: ['admin-running-sessions'],
    queryFn: adminApi.runningSessions,
    // Containers start and expire without this screen doing anything, so the
    // list refetches on its own. Thirty seconds rather than a socket: nothing
    // here is worth a second connection to keep open.
    refetchInterval: 30_000,
  })

  const kill = useMutation({
    mutationFn: (id: string) => adminApi.killSession(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-running-sessions'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      setTarget(null)
      setError('')
    },
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : t('dash.killFailed')),
  })

  const rows = sessions.data ?? []
  if (rows.length === 0) return null

  const now = Date.now()

  return (
    <>
      <Card className="overflow-hidden">
        <div className="border-b border-border px-5 py-3">
          <p className="font-medium text-fg-strong">
            {t('dash.runningCount', { n: rows.length })}
          </p>
          <p className="mt-0.5 text-xs text-fg-muted">
            {t('dash.runningHint')}
          </p>
        </div>

        {error && (
          <p className="border-b border-border px-5 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-fg-muted">
                <th className="px-5 py-2 font-medium">{t('dash.colStudent')}</th>
                <th className="px-3 py-2 font-medium">{t('dash.colLab')}</th>
                <th className="px-3 py-2 font-medium">{t('dash.colStarted')}</th>
                <th className="px-3 py-2 font-medium">{t('dash.colExpires')}</th>
                <th className="px-5 py-2 text-right font-medium">{t('dash.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                // Past its deadline and still running means the reaper has not
                // got to it. Worth flagging: that is what a leak looks like.
                const overdue = new Date(s.expires_at).getTime() < now
                return (
                  <tr key={s.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-2.5 font-medium text-fg-strong">
                      {s.username}
                    </td>
                    <td className="px-3 py-2.5 text-fg">
                      {s.lab_title}
                      {!s.has_container && (
                        <span
                          title={t('dash.noContainerTitle')}
                          className="ml-2 rounded bg-danger/10 px-1.5 py-0.5 text-xs text-danger"
                        >
                          {t('dash.noContainer')}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs text-fg-muted">
                      {timeAgo(s.started_at)}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs">
                      <span className={overdue ? 'text-danger' : 'text-fg-muted'}>
                        {overdue ? t('dash.overdue') : ''}
                        {formatWhen(s.expires_at)}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <button
                        onClick={() => setTarget(s)}
                        disabled={kill.isPending}
                        className="rounded-md border border-danger/50 px-3 py-1.5 text-sm font-medium whitespace-nowrap text-danger transition hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {t('dash.kill')}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {target && (
        <ConfirmModal
          title={t('dash.killTitle', { name: target.username })}
          confirmLabel={kill.isPending ? t('dash.killing') : t('dash.killSession')}
          tone="danger"
          busy={kill.isPending}
          onClose={() => setTarget(null)}
          onConfirm={() => kill.mutate(target.id)}
        >
          <p>
            {t('dash.killBody1')}
          </p>
          <p>
            {t('dash.killBody2')}
          </p>
        </ConfirmModal>
      )}
    </>
  )
}

function Total({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-fg-muted">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums text-fg-strong">
        {value}
      </dd>
    </div>
  )
}

function LabRow({ lab }: { lab: LabStat }) {
  const retryPct = pct(lab.retried, lab.answered)
  // A third of the answers needing a second press is the point where the lab is
  // worth reading again. Below that it is normal for hands-on work.
  const hot = lab.answered > 0 && retryPct >= 34
  const idle = lab.sessions === 0

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-5 py-2.5">
        <span className={idle ? 'text-fg-muted' : 'text-fg-strong'}>
          {lab.lab_title}
        </span>
        <span className="ml-2 text-xs text-fg-subtle">{lab.course_title}</span>
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-fg">
        {idle ? <span className="text-fg-subtle">—</span> : lab.sessions}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-fg">
        {idle ? (
          <span className="text-fg-subtle">—</span>
        ) : (
          <>
            {lab.submitted}
            <span className="ml-1 text-xs text-fg-subtle">
              {pct(lab.submitted, lab.sessions)}%
            </span>
          </>
        )}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-fg">
        {lab.answered || <span className="text-fg-subtle">—</span>}
      </td>
      <td className="px-5 py-2.5 text-right tabular-nums">
        {lab.answered === 0 ? (
          <span className="text-fg-subtle">—</span>
        ) : (
          <span className={hot ? 'font-medium text-amber-500' : 'text-fg'}>
            {lab.retried}
            <span className="ml-1 text-xs opacity-70">{retryPct}%</span>
          </span>
        )}
      </td>
    </tr>
  )
}
