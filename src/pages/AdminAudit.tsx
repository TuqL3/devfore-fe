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
  'user.ban': { label: 'Khoá tài khoản', tone: 'bg-danger/10 text-danger' },
  'user.unban': { label: 'Mở khoá', tone: 'bg-success-soft text-success' },
  'user.role_grant': {
    label: 'Cấp quyền quản trị',
    tone: 'bg-violet-500/15 text-violet-500',
  },
  'user.role_revoke': {
    label: 'Gỡ quyền quản trị',
    tone: 'bg-amber-500/15 text-amber-500',
  },
  'lab_session.kill': {
    label: 'Dừng container',
    tone: 'bg-amber-500/15 text-amber-500',
  },
  'auth.totp_enable': {
    label: 'Bật xác thực hai lớp',
    tone: 'bg-success-soft text-success',
  },
  'auth.totp_disable': {
    label: 'Tắt xác thực hai lớp',
    tone: 'bg-danger/10 text-danger',
  },
}

const FILTERS = [
  { key: '', label: 'Tất cả' },
  { key: 'user.ban', label: 'Khoá' },
  { key: 'user.role_grant', label: 'Cấp quyền' },
  { key: 'lab_session.kill', label: 'Dừng container' },
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
        <h1 className="text-2xl font-bold text-fg-strong">Nhật ký quản trị</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Các thao tác một quản trị viên thực hiện lên tài khoản hoặc container
          của người khác. Tên được lưu lại tại thời điểm ghi, nên dòng cũ vẫn đọc
          được sau khi tài khoản liên quan bị xoá.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
          <Input
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            placeholder="Lọc theo người thực hiện"
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

      {logs.isError && <ErrorBox>Không đọc được nhật ký.</ErrorBox>}

      <Card className="overflow-hidden">
        {logs.isLoading ? (
          <p className="px-5 py-8 text-center text-sm text-fg-subtle">Đang tải…</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-fg-subtle">
            Chưa có thao tác nào khớp.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-fg-muted">
                  <th className="px-5 py-2 font-medium">Thời điểm</th>
                  <th className="px-3 py-2 font-medium">Người thực hiện</th>
                  <th className="px-3 py-2 font-medium">Thao tác</th>
                  <th className="px-3 py-2 font-medium">Đối tượng</th>
                  <th className="px-5 py-2 font-medium">Ghi chú</th>
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
            Hiện {rows.length} trong {logs.data?.total} dòng khớp. Thu hẹp bằng
            bộ lọc để thấy phần còn lại.
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
          {a?.label ?? log.action}
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
