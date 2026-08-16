import { useDeferredValue, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { chatApi } from '@/api/chat'
import { Avatar } from '@/components/Avatar'
import { SearchIcon, UsersIcon } from '@/components/icons'
import { timeAgo } from '@/lib/relativeTime'
import type { ChatConversation } from '@/lib/types'

/** null is the shared room. A number is the other person in a direct thread. */
export type Target = number | null

/** Conversation list. The shared room is pinned at the top and is not one of the
 *  rows the server returns — it always exists, so a row saying so would be a row
 *  that can go missing. */
export function ChatSidebar({
  target,
  onPick,
  conversations,
  unread,
}: {
  target: Target
  onPick: (t: Target) => void
  conversations: ChatConversation[]
  /** Unread per conversation, keyed the same way the provider keys it: 0 is the
   *  shared room, anything else is the other person's id. */
  unread: Record<number, number>
}) {
  const [query, setQuery] = useState('')
  // Built in, so typing does not fire a request per keystroke.
  const q = useDeferredValue(query)
  const searching = q.trim().length > 0

  const people = useQuery({
    queryKey: ['chat-people', q],
    queryFn: () => chatApi.people(q),
    enabled: searching,
  })

  // Anyone already in the list is reachable by clicking their row, so the
  // directory only offers people who are not.
  const known = new Set(conversations.map((c) => c.peer_id))
  const found = (people.data?.people ?? []).filter((p) => !known.has(p.id))

  return (
    <div className="flex min-h-0 flex-col">
      <div className="relative p-3">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-6 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find someone to message"
          className="w-full rounded-lg border border-border-strong bg-bg py-2 pr-3 pl-9 text-sm outline-none transition placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-accent/25"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <Row
          active={target === null}
          onClick={() => onPick(null)}
          icon={
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent-soft">
              <UsersIcon className="h-4 w-4" />
            </span>
          }
          title="Public room"
          subtitle="Readable by everyone"
          unread={unread[0] ?? 0}
        />

        {searching ? (
          <>
            <Label>Search results</Label>
            {people.isLoading ? (
              <Empty>Searching…</Empty>
            ) : found.length === 0 ? (
              <Empty>Nobody matches.</Empty>
            ) : (
              found.map((p) => (
                <Row
                  key={p.id}
                  active={target === p.id}
                  onClick={() => {
                    onPick(p.id)
                    setQuery('')
                  }}
                  icon={<Avatar user={p} className="h-9 w-9 rounded-lg text-xs" />}
                  title={p.username}
                  subtitle="Start a conversation"
                />
              ))
            )}
          </>
        ) : (
          <>
            <Label>Direct messages</Label>
            {conversations.length === 0 ? (
              <Empty>
                No conversations yet. Search a name above to start one.
              </Empty>
            ) : (
              conversations.map((c) => (
                <Row
                  key={c.peer_id}
                  active={target === c.peer_id}
                  onClick={() => onPick(c.peer_id)}
                  icon={
                    <Avatar
                      user={{ username: c.username, avatar_url: c.avatar_url }}
                      className="h-9 w-9 rounded-lg text-xs"
                    />
                  }
                  title={c.username}
                  subtitle={
                    c.last_deleted ? 'Message deleted' : c.last_body || '—'
                  }
                  meta={c.last_at ? timeAgo(c.last_at) : undefined}
                  muted={c.last_deleted}
                  unread={unread[c.peer_id] ?? 0}
                />
              ))
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2 pt-3 pb-1 text-xs font-medium text-fg-subtle">{children}</p>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-2 py-3 text-xs text-fg-subtle">{children}</p>
}

function Row({
  active,
  onClick,
  icon,
  title,
  subtitle,
  meta,
  muted,
  unread = 0,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  title: string
  subtitle: string
  meta?: string
  muted?: boolean
  unread?: number
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
      className={
        'flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition ' +
        (active ? 'bg-muted' : 'hover:bg-muted/60')
      }
    >
      {icon}
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span
            className={
              'truncate text-sm ' +
              (active ? 'font-semibold text-fg-strong' : 'font-medium text-fg')
            }
          >
            {title}
          </span>
          {unread > 0 ? (
            <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-accent-fg">
              {unread > 99 ? '99+' : unread}
            </span>
          ) : (
            meta && (
              <span className="shrink-0 text-[11px] text-fg-subtle">{meta}</span>
            )
          )}
        </span>
        <span
          className={
            'block truncate text-xs ' +
            (muted ? 'text-fg-subtle italic' : 'text-fg-muted')
          }
        >
          {subtitle}
        </span>
      </span>
    </button>
  )
}
