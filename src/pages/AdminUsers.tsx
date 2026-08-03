import { useDeferredValue, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { adminApi, type UserFilter } from '@/api/admin'
import { ApiError } from '@/lib/api'
import { Card, ErrorBox, Input } from '@/components/ui'
import { Avatar } from '@/components/Avatar'
import { ConfirmModal } from '@/components/ConfirmModal'
import { SearchIcon } from '@/components/icons'
import { useAuth } from '@/context/AuthContext'
import { timeAgo } from '@/lib/relativeTime'
import type { ManagedUser } from '@/lib/types'

const STATUSES: { key: NonNullable<UserFilter['status']>; label: string }[] = [
  { key: '', label: 'Tất cả' },
  { key: 'active', label: 'Hoạt động' },
  { key: 'pending', label: 'Chờ xác thực' },
  { key: 'banned', label: 'Đã khoá' },
]

const ROLES: { key: NonNullable<UserFilter['role']>; label: string }[] = [
  { key: '', label: 'Mọi quyền' },
  { key: 'admin', label: 'Quản trị' },
  { key: 'student', label: 'Học viên' },
]

/** The account table. Two decisions live here — is this account allowed in, and
 *  does it reach the admin screens — and both are refused on the caller's own
 *  row by the server, because that is the one mistake nobody can undo from the
 *  screen they just locked themselves out of. */
export default function AdminUsers() {
  const qc = useQueryClient()
  const { user: me } = useAuth()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<UserFilter['status']>('')
  const [role, setRole] = useState<UserFilter['role']>('')
  const [error, setError] = useState('')
  const [banning, setBanning] = useState<ManagedUser | null>(null)
  const [reason, setReason] = useState('')

  // Built in, so typing does not fire a request per keystroke and no debounce
  // helper had to be written for it.
  const q = useDeferredValue(query)

  const filter: UserFilter = { q, status, role }
  const users = useQuery({
    queryKey: ['admin-users', q, status, role],
    queryFn: () => adminApi.users(filter),
  })

  const fail = (e: unknown) =>
    setError(e instanceof ApiError ? e.message : 'không thực hiện được, thử lại')
  const done = () => {
    qc.invalidateQueries({ queryKey: ['admin-users'] })
    setError('')
  }

  const ban = useMutation({
    mutationFn: (v: { id: number; banned: boolean; reason: string }) =>
      adminApi.setBanned(v.id, v.banned, v.reason),
    onSuccess: () => {
      done()
      setBanning(null)
      setReason('')
    },
    onError: fail,
  })

  const role_ = useMutation({
    mutationFn: (v: { id: number; admin: boolean }) =>
      adminApi.setAdmin(v.id, v.admin),
    onSuccess: done,
    onError: fail,
  })

  const data = users.data
  const rows = data?.users ?? []
  const hidden = data ? data.total - rows.length : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg-strong">Người dùng</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Khoá tài khoản và cấp quyền quản trị. Cả hai đều huỷ phiên đăng nhập
          của tài khoản đó ngay lập tức.
        </p>
      </div>

      {error && <ErrorBox>{error}</ErrorBox>}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên hoặc email"
            className="pl-9"
          />
        </div>
        <Chips options={STATUSES} value={status} onChange={setStatus} />
        <Chips options={ROLES} value={role} onChange={setRole} />
      </div>

      <Card className="overflow-hidden">
        {users.isLoading ? (
          <p className="px-5 py-8 text-center text-sm text-fg-subtle">Đang tải…</p>
        ) : users.isError ? (
          <p className="px-5 py-8 text-center text-sm text-danger">
            Không đọc được danh sách.
          </p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-fg-subtle">
            Không có tài khoản nào khớp.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-fg-muted">
                  <th className="px-5 py-2 font-medium">Tài khoản</th>
                  <th className="px-3 py-2 font-medium">Trạng thái</th>
                  <th className="px-3 py-2 font-medium">Quyền</th>
                  <th className="px-3 py-2 font-medium">Tham gia</th>
                  <th className="px-5 py-2 text-right font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    isMe={u.id === me?.id}
                    busy={role_.isPending || ban.isPending}
                    onToggleAdmin={() =>
                      role_.mutate({ id: u.id, admin: !u.roles.includes('admin') })
                    }
                    onBan={() => {
                      setReason('')
                      setBanning(u)
                    }}
                    onUnban={() => ban.mutate({ id: u.id, banned: false, reason: '' })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Said out loud rather than truncated in silence: a capped list that
            looks complete is worse than one that admits it is not. */}
        {hidden > 0 && (
          <p className="border-t border-border px-5 py-2.5 text-xs text-fg-muted">
            Hiện {rows.length} trong {data?.total} tài khoản khớp. Thu hẹp bằng ô
            tìm kiếm để thấy phần còn lại.
          </p>
        )}
      </Card>

      {banning && (
        <ConfirmModal
          title={`Khoá tài khoản “${banning.username}”?`}
          confirmLabel={ban.isPending ? 'Đang khoá…' : 'Khoá tài khoản'}
          tone="danger"
          busy={ban.isPending}
          onClose={() => setBanning(null)}
          onConfirm={() => ban.mutate({ id: banning.id, banned: true, reason })}
        >
          <p>
            Họ sẽ bị đăng xuất khỏi mọi thiết bị và không đăng nhập lại được cho
            tới khi bạn mở khoá. Dữ liệu học tập giữ nguyên.
          </p>
          <label className="block">
            <span className="text-sm text-fg-muted">Lý do (không bắt buộc)</span>
            <Input
              value={reason}
              maxLength={500}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ghi lại để lần sau còn biết vì sao"
              className="mt-1"
            />
          </label>
        </ConfirmModal>
      )}
    </div>
  )
}

function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[]
  value: T | undefined
  onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={
            'rounded-md px-3 py-1.5 text-sm transition ' +
            ((value ?? '') === o.key
              ? 'bg-surface font-medium text-fg-strong shadow-sm'
              : 'text-fg-muted hover:text-fg-strong')
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function UserRow({
  user,
  isMe,
  busy,
  onToggleAdmin,
  onBan,
  onUnban,
}: {
  user: ManagedUser
  /** The caller's own row. Every action on it is refused by the server, so the
   *  buttons say why instead of offering a click that comes back a 409. */
  isMe: boolean
  busy: boolean
  onToggleAdmin: () => void
  onBan: () => void
  onUnban: () => void
}) {
  const admin = user.roles.includes('admin')
  const banned = user.status === 'banned'
  const selfTitle = 'không thao tác được trên chính tài khoản của bạn'

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-5 py-3">
        <div className="flex items-center gap-2.5">
          <Avatar user={user} className="h-8 w-8 text-xs" />
          <div className="min-w-0">
            <p className="truncate font-medium text-fg-strong">
              {user.username}
              {isMe && <span className="ml-1.5 text-xs text-fg-subtle">(bạn)</span>}
            </p>
            <p className="truncate text-xs text-fg-subtle">{user.email}</p>
          </div>
        </div>
      </td>

      <td className="px-3 py-3">
        <StatusBadge user={user} />
      </td>

      <td className="px-3 py-3">
        <span
          className={
            'rounded-full px-2 py-0.5 text-xs font-medium ' +
            (admin
              ? 'bg-violet-500/15 text-violet-500'
              : 'bg-muted text-fg-muted')
          }
        >
          {admin ? 'Quản trị' : 'Học viên'}
        </span>
      </td>

      <td className="px-3 py-3 text-xs whitespace-nowrap text-fg-muted">
        {timeAgo(user.created_at)}
      </td>

      <td className="px-5 py-3">
        <div className="flex justify-end gap-2">
          <RowButton
            disabled={isMe || busy}
            title={isMe ? selfTitle : undefined}
            onClick={onToggleAdmin}
          >
            {admin ? 'Gỡ quyền' : 'Cấp quyền'}
          </RowButton>
          {banned ? (
            <RowButton tone="ok" disabled={isMe || busy} onClick={onUnban}>
              Mở khoá
            </RowButton>
          ) : (
            <RowButton
              tone="danger"
              // Only an active account can be banned; a pending signup that came
              // back from an unban would be active, which is a way past email
              // verification rather than a moderation call.
              disabled={isMe || busy || user.status !== 'active'}
              title={
                isMe
                  ? selfTitle
                  : user.status !== 'active'
                    ? 'chỉ khoá được tài khoản đang hoạt động'
                    : undefined
              }
              onClick={onBan}
            >
              Khoá
            </RowButton>
          )}
        </div>
      </td>
    </tr>
  )
}

/** Table-sized button. Local rather than a `variant` prop on the shared Button:
 *  the padding here is the whole difference, and one row of a table is not a
 *  reason to grow the component every screen uses. */
function RowButton({
  tone = 'quiet',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'quiet' | 'ok' | 'danger'
}) {
  const tones = {
    quiet: 'border border-border-strong text-fg-muted hover:text-fg-strong hover:bg-muted',
    ok: 'bg-success text-white hover:brightness-110',
    danger: 'border border-danger/50 text-danger hover:bg-danger/10',
  }
  return (
    <button
      className={
        'rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition ' +
        'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ' +
        tones[tone] +
        ' ' +
        className
      }
      {...props}
    />
  )
}

function StatusBadge({ user }: { user: ManagedUser }) {
  if (user.status === 'banned') {
    return (
      <div>
        <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
          Đã khoá
        </span>
        {/* The reason and who gave it, because "why is this person locked out"
            is the next question every time. */}
        <p className="mt-1 max-w-56 text-xs text-fg-subtle">
          {user.banned_reason ?? 'không ghi lý do'}
          {user.banned_by && ` — ${user.banned_by}`}
        </p>
      </div>
    )
  }
  if (user.status === 'pending') {
    return (
      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-500">
        Chờ xác thực
      </span>
    )
  }
  return (
    <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
      Hoạt động
    </span>
  )
}
