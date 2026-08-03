import { useLayoutEffect, useRef, useState } from 'react'

import { Avatar } from '@/components/Avatar'
import type { ChatMessage } from '@/lib/types'

/** Consecutive messages from the same person inside this window are drawn as one
 *  block, with the name and time only on the first. Five minutes is where a run
 *  of typing stops reading as one thought. */
const GROUP_WINDOW = 5 * 60 * 1000

const MAX_BODY = 1000

/** How close to the top counts as "about to run out of history". Roughly one
 *  screen, so the older page is usually there before the reader reaches it. */
const LOAD_MARGIN = 400

export function ChatThread({
  messages,
  meID,
  loading,
  hasOlder,
  loadingOlder,
  onLoadOlder,
  canSend,
  placeholder,
  onSend,
  onEdit,
  onDelete,
}: {
  messages: ChatMessage[]
  meID?: number
  loading: boolean
  hasOlder: boolean
  loadingOlder: boolean
  onLoadOlder: () => void
  canSend: boolean
  placeholder: string
  onSend: (body: string) => void
  onEdit: (id: number, body: string) => void
  onDelete: (id: number) => void
}) {
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState<number | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const atBottom = useRef(true)
  const height = useRef(0)

  // Measured from the reader's own scrolling, never after a render: a layout
  // effect runs once the new messages are already in the DOM, so it would read
  // "not at the bottom" on the very first paint and never follow the thread.
  // Starts true, so a thread always opens on its newest message.
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    if (atBottom.current) {
      el.scrollTop = el.scrollHeight
    } else if (height.current && el.scrollHeight !== height.current) {
      // Older messages were inserted above the viewport. Push the scroll down
      // by exactly what they added, or the line being read slides off-screen
      // every time a page loads.
      el.scrollTop += el.scrollHeight - height.current
    }
    height.current = el.scrollHeight
  }, [messages])

  const send = () => {
    const body = draft.trim()
    if (!body || !canSend) return
    onSend(body)
    setDraft('')
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget
          atBottom.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 80
          if (el.scrollTop < LOAD_MARGIN && hasOlder && !loadingOlder) {
            onLoadOlder()
          }
        }}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
      >
        {loading ? (
          <p className="py-10 text-center text-sm text-fg-subtle">Đang tải…</p>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-fg-subtle">
            Chưa có tin nhắn nào. Bạn mở hàng đi.
          </p>
        ) : (
          <>
            {/* Also the way in when the first page is short enough that there
                is nothing to scroll, so the reader is never stuck with a
                conversation that has more above it. */}
            {hasOlder && (
              <button
                type="button"
                onClick={onLoadOlder}
                disabled={loadingOlder}
                className="mx-auto mb-2 block rounded-full px-3 py-1 text-xs text-fg-subtle transition hover:bg-muted disabled:opacity-60"
              >
                {loadingOlder ? 'Đang tải…' : 'Xem tin cũ hơn'}
              </button>
            )}
            {messages.map((m, i) => {
            const prev = messages[i - 1]
            const mine = m.user_id != null && m.user_id === meID
            const grouped =
              prev != null &&
              prev.user_id === m.user_id &&
              new Date(m.created_at).getTime() -
                new Date(prev.created_at).getTime() <
                GROUP_WINDOW &&
              sameDay(prev.created_at, m.created_at)

            return (
              <div key={m.id}>
                {!sameDay(prev?.created_at, m.created_at) && (
                  <DayDivider iso={m.created_at} />
                )}
                <Bubble
                  msg={m}
                  mine={mine}
                  grouped={grouped}
                  editing={editing === m.id}
                  onStartEdit={() => setEditing(m.id)}
                  onCancelEdit={() => setEditing(null)}
                  onSubmitEdit={(body) => {
                    onEdit(m.id, body)
                    setEditing(null)
                  }}
                  onDelete={() => onDelete(m.id)}
                />
              </div>
              )
            })}
          </>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
        className="flex items-end gap-2 border-t border-border p-3"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          // Enter sends, shift+Enter breaks the line. A chat box that needs a
          // mouse to send is a chat box nobody uses twice.
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          rows={1}
          maxLength={MAX_BODY}
          disabled={!canSend}
          placeholder={placeholder}
          className="max-h-32 min-h-[2.75rem] flex-1 resize-none rounded-lg border border-border-strong bg-bg px-3 py-2.5 text-sm outline-none transition placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-accent/25 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!canSend || draft.trim() === ''}
          className="shrink-0 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          Gửi
        </button>
      </form>
    </div>
  )
}

function sameDay(a: string | undefined, b: string) {
  if (!a) return false
  return new Date(a).toDateString() === new Date(b).toDateString()
}

function DayDivider({ iso }: { iso: string }) {
  const d = new Date(iso)
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86_400_000).toDateString()
  const label =
    d.toDateString() === today
      ? 'Hôm nay'
      : d.toDateString() === yesterday
        ? 'Hôm qua'
        : d.toLocaleDateString('vi-VN')

  return (
    <div className="flex items-center gap-3 py-3">
      <span className="h-px flex-1 bg-border" />
      <span className="text-[11px] font-medium text-fg-subtle">{label}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}

function Bubble({
  msg,
  mine,
  grouped,
  editing,
  onStartEdit,
  onCancelEdit,
  onSubmitEdit,
  onDelete,
}: {
  msg: ChatMessage
  mine: boolean
  grouped: boolean
  editing: boolean
  onStartEdit: () => void
  onCancelEdit: () => void
  onSubmitEdit: (body: string) => void
  onDelete: () => void
}) {
  const deleted = msg.deleted_at != null

  return (
    <div
      className={
        'group flex items-end gap-2 ' +
        (mine ? 'flex-row-reverse' : '') +
        (grouped ? ' mt-0.5' : ' mt-3')
      }
    >
      {/* Kept in the layout even when grouped, so the run of messages stays
          aligned instead of stepping sideways under the first one. */}
      <span className="w-7 shrink-0">
        {!grouped && (
          <Avatar
            user={{ username: msg.username, avatar_url: null }}
            className="h-7 w-7 rounded-md text-[10px]"
          />
        )}
      </span>

      <div className={'min-w-0 max-w-[72%] ' + (mine ? 'items-end' : '')}>
        {!grouped && (
          <p
            className={
              'mb-1 flex items-baseline gap-2 text-xs ' +
              (mine ? 'flex-row-reverse' : '')
            }
          >
            <span className="font-medium text-fg-strong">{msg.username}</span>
            <span className="text-fg-subtle">{clock(msg.created_at)}</span>
          </p>
        )}

        {editing ? (
          <EditBox
            initial={msg.body}
            onCancel={onCancelEdit}
            onSubmit={onSubmitEdit}
          />
        ) : (
          <div className={'flex items-center gap-1 ' + (mine ? 'flex-row-reverse' : '')}>
            <p
              className={
                'rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap ' +
                (deleted
                  ? 'border border-dashed border-border-strong text-fg-subtle italic'
                  : mine
                    ? 'bg-accent text-accent-fg'
                    : 'bg-muted text-fg')
              }
            >
              {/* Rendered as text, never as markup: this is the one place on the
                  site where one user's input reaches another user's screen. */}
              {deleted ? 'Tin nhắn đã được thu hồi' : msg.body}
              {msg.edited_at && !deleted && (
                <span
                  className={
                    'ml-2 text-[10px] ' +
                    (mine ? 'text-accent-fg/70' : 'text-fg-subtle')
                  }
                >
                  đã sửa
                </span>
              )}
            </p>

            {/* Only the author's own, and never on something already taken
                back. Hidden until hover so the thread stays quiet. */}
            {mine && !deleted && (
              <span className="flex gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                <Action label="Sửa" onClick={onStartEdit}>
                  ✎
                </Action>
                <Action label="Thu hồi" danger onClick={onDelete}>
                  ✕
                </Action>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Action({
  label,
  danger,
  onClick,
  children,
}: {
  label: string
  danger?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={
        'grid h-6 w-6 place-items-center rounded text-xs transition ' +
        (danger
          ? 'text-fg-subtle hover:bg-danger/10 hover:text-danger'
          : 'text-fg-subtle hover:bg-muted hover:text-fg-strong')
      }
    >
      {children}
    </button>
  )
}

function EditBox({
  initial,
  onCancel,
  onSubmit,
}: {
  initial: string
  onCancel: () => void
  onSubmit: (body: string) => void
}) {
  const [value, setValue] = useState(initial)

  return (
    <div className="space-y-1">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel()
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            if (value.trim()) onSubmit(value.trim())
          }
        }}
        rows={2}
        maxLength={MAX_BODY}
        autoFocus
        className="w-full resize-none rounded-lg border border-accent bg-bg px-3 py-2 text-sm outline-none"
      />
      <p className="text-[11px] text-fg-subtle">
        Enter để lưu · Esc để huỷ
      </p>
    </div>
  )
}

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
