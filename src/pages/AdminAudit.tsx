import { useDeferredValue, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { adminApi } from '@/api/admin'
import { Card, ErrorBox, Input } from '@/components/ui'
import { SearchIcon } from '@/components/icons'
import { formatWhen } from '@/lib/relativeTime'
import type { AuditLog } from '@/lib/types'

/** Vietnamese for each action, and the colour it reads as. Keyed by the exact
 *  strings the server writes — an action missing from here still renders, as its
 *  raw key, because a log that hides what it does not recognise is worse than an
 *  ugly one. */
const ACTIONS: Record<string, { label: string; tone: string }> = {
  'user.ban': { label: 'Banned an account', tone: 'bg-danger/10 text-danger' },
  'user.unban': { label: 'Unbanned an account', tone: 'bg-success-soft text-success' },
  'user.role_grant': {
    label: 'Granted admin rights',
    tone: 'bg-violet-500/15 text-violet-500',
  },
  'user.role_revoke': {
    label: 'Revoked admin rights',
    tone: 'bg-amber-500/15 text-amber-500',
  },
  'lab_session.kill': {
    label: 'Killed a container',
    tone: 'bg-amber-500/15 text-amber-500',
  },
  'auth.totp_enable': {
    label: 'Turned two-factor on',
    tone: 'bg-success-soft text-success',
  },
  'auth.totp_disable': {
    label: 'Turned two-factor off',
    tone: 'bg-danger/10 text-danger',
  },
}

const FILTERS: { key: string; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'user.ban', label: 'Bans' },
  { key: 'user.role_grant', label: 'Role grants' },
  { key: 'lab_session.kill', label: 'Killed containers' },
]

/** Read-only, by design. There is no endpoint that writes here from a client:
 *  entries are written by the code that performs the action, and an API a client
 *  could post to would make the whole table worthless as evidence. */
export default function AdminAudit() {
  const [actor, setActor] = useState('')
  const [action, setAction] = useState('')
  const q = useDeferredValue(actor)

  const logs = useQuery({
    queryKey: ['admin-audit', q, action],
    queryFn: () => adminApi.auditLogs({ actor: q, action }),
  })

  const rows = logs.data?.logs ?? []
  const hidden = logs.data ? logs.data.total - rows.length : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg-strong">Admin audit log</h1>
        <p className="mt-1 text-sm text-fg-muted">
          {"Actions an admin performed on somebody else's account or container. Names are stored as they were at the time, so an old row still reads correctly after the account involved is deleted."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
          <Input
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            placeholder="Filter by who performed it"
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setAction(f.key)}
              className={
                'rounded-md px-3 py-1.5 text-sm transition ' +
                (action === f.key
                  ? 'bg-surface font-medium text-fg-strong shadow-sm'
                  : 'text-fg-muted hover:text-fg-strong')
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {logs.isError && <ErrorBox>Could not read the audit log.</ErrorBox>}

      <Card className="overflow-hidden">
        {logs.isLoading ? (
          <p className="px-5 py-8 text-center text-sm text-fg-subtle">
            Loading…
          </p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-fg-subtle">
            No action matches.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-fg-muted">
                  <th className="px-5 py-2 font-medium">When</th>
                  <th className="px-3 py-2 font-medium">Performed by</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                  <th className="px-3 py-2 font-medium">Target</th>
                  <th className="px-5 py-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <Row key={l.id} log={l} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {hidden > 0 && (
          <p className="border-t border-border px-5 py-2.5 text-xs text-fg-muted">
            {`Showing ${rows.length} of ${logs.data?.total ?? 0} matching rows. Narrow the filter to see the rest.`}
          </p>
        )}
      </Card>
    </div>
  )
}

function Row({ log }: { log: AuditLog }) {
  const a = ACTIONS[log.action]

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-5 py-2.5 text-xs whitespace-nowrap text-fg-muted">
        {formatWhen(log.created_at)}
      </td>
      <td className="px-3 py-2.5 font-medium text-fg-strong">{log.actor_name}</td>
      <td className="px-3 py-2.5">
        <span
          className={
            'rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ' +
            (a?.tone ?? 'bg-muted text-fg-muted')
          }
        >
          {a ? a.label : log.action}
        </span>
      </td>
      <td className="px-3 py-2.5 text-fg">
        {log.target_name || (
          <span className="font-mono text-xs text-fg-subtle">{log.target_id}</span>
        )}
      </td>
      <td className="px-5 py-2.5 text-xs text-fg-muted">
        {log.detail || '—'}
        {log.ip && <span className="ml-2 font-mono text-fg-subtle">{log.ip}</span>}
      </td>
    </tr>
  )
}
