import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { adminApi } from '@/api/admin'
import { Card, ErrorBox } from '@/components/ui'
import { timeAgo } from '@/lib/relativeTime'
import type { AdminChatMessage, AdminSharedReport } from '@/lib/types'

/** Kiểm duyệt — hai thứ nền tảng đang phát ra ngoài mà trước đây không ai xem
 *  được: những gì người ta nói trong phòng chung, và những báo cáo ca trực đang
 *  công khai dưới tên miền của mình.
 *
 *  Trước bản này, cách duy nhất để gỡ một tin nhắn là sửa tay database, còn cách
 *  duy nhất để gỡ một trang công khai là có ai đó gửi link cho bạn. */
export default function AdminModeration() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg-strong">Moderation</h1>
        <p className="mt-1 max-w-3xl text-sm text-fg-muted">The two things this platform puts out into the world: what is said in the room, and the reports public under your own domain.</p>
      </div>
      <SharedReports />
      <ChatRoom />
    </div>
  )
}

function SharedReports() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['admin-shared'], queryFn: adminApi.sharedReports })
  const drop = useMutation({
    mutationFn: (token: string) => adminApi.unshareDrill(token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-shared'] }),
  })

  return (
    <Card className="p-5">
      <h2 className="font-semibold text-fg-strong">Public reports</h2>
      <p className="mt-1 text-sm text-fg-muted">Anybody with the link can open these. Taking one down kills the link; the owner can publish again, which mints a new one.</p>

      {q.isError && <ErrorBox>Could not read the numbers. Try reloading the page.</ErrorBox>}
      {q.data?.length === 0 && (
        <p className="mt-3 text-sm text-fg-subtle">Nothing is public right now.</p>
      )}

      <ul className="mt-3 divide-y divide-border">
        {(q.data ?? []).map((r: AdminSharedReport) => (
          <li key={r.token} className="flex flex-wrap items-center gap-3 py-2 text-sm">
            <span className="font-medium text-fg-strong">{r.player}</span>
            <span className="min-w-0 flex-1 truncate text-fg-muted">
              {r.lab_title}
              {r.incident_title && ` — ${r.incident_title}`}
            </span>
            <span className="text-xs text-fg-subtle">{timeAgo(r.started_at)}</span>
            <a
              href={`/r/${r.token}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-border-strong px-2 py-1 text-xs text-fg-muted transition hover:border-accent hover:text-fg"
            >
              Open
            </a>
            <button
              onClick={() => drop.mutate(r.token)}
              disabled={drop.isPending}
              className="rounded-md border border-border-strong px-2 py-1 text-xs text-danger transition hover:border-danger disabled:opacity-40"
            >
              Take down
            </button>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function ChatRoom() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['admin-chat'], queryFn: () => adminApi.chat(100) })
  const del = useMutation({
    mutationFn: (id: number) => adminApi.deleteChat(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-chat'] }),
  })
  const [showDeleted, setShowDeleted] = useState(false)

  const rows = (q.data ?? []).filter((m) => showDeleted || m.deleted_at === null)

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold text-fg-strong">Chat room</h2>
        <label className="flex items-center gap-2 text-xs text-fg-muted">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(e) => setShowDeleted(e.target.checked)}
          />
          show withdrawn
        </label>
      </div>
      <p className="mt-1 text-sm text-fg-muted">A withdrawn message keeps its row and loses its text — it stays listed because "somebody posted and removed something" is also an answer.</p>

      {q.isError && <ErrorBox>Could not read the numbers. Try reloading the page.</ErrorBox>}
      {rows.length === 0 && <p className="mt-3 text-sm text-fg-subtle">No messages yet.</p>}

      <ul className="mt-3 divide-y divide-border">
        {rows.map((m: AdminChatMessage) => (
          <li key={m.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2 text-sm">
            <span className="font-mono text-[11px] text-fg-subtle">{timeAgo(m.created_at)}</span>
            {m.user_id ? (
              <Link
                to={`/admin/users/${m.user_id}`}
                className="font-medium text-accent-soft hover:underline"
              >
                {m.username}
              </Link>
            ) : (
              <span className="font-medium text-fg-muted">{m.username}</span>
            )}
            {/* Tin nhắn riêng giữa hai người vẫn hiện ở đây, và được đánh dấu:
                nó không phải phòng chung, và một moderator đọc nó nên biết mình
                đang đọc gì. */}
            {m.peer_id && (
              <span className="rounded bg-muted px-1.5 text-[10px] text-fg-muted">
                direct
              </span>
            )}
            <span
              className={
                'min-w-0 flex-1 ' + (m.deleted_at ? 'italic text-fg-subtle' : 'text-fg')
              }
            >
              {m.deleted_at ? '(withdrawn)' : m.body}
            </span>
            {!m.deleted_at && (
              <button
                onClick={() => del.mutate(m.id)}
                disabled={del.isPending}
                className="rounded-md border border-border-strong px-2 py-0.5 text-xs text-danger transition hover:border-danger disabled:opacity-40"
              >
                Delete
              </button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}
