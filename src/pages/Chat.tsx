import { useEffect, useMemo, useState } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

import { chatApi } from '@/api/chat'
import { useAuth } from '@/context/AuthContext'
import { useChat } from '@/context/ChatContext'
import { askNotifyPermission, ROOM } from '@/lib/chat'
import { Avatar } from '@/components/Avatar'
import { ChatSidebar, type Target } from '@/components/ChatSidebar'
import { ChatThread } from '@/components/ChatThread'
import { UsersIcon } from '@/components/icons'
import type { ChatMessage } from '@/lib/types'

/** The shared room and every direct thread.
 *
 *  The socket is not here — it belongs to ChatProvider, so a message arriving
 *  while somebody is on another page still counts. This screen only reads what
 *  the provider holds and fetches the history the socket cannot know about. */
export default function Chat() {
  const { user } = useAuth()
  const { status, live, unread, send, edit, remove, markRead } = useChat()
  const [target, setTarget] = useState<Target>(null)

  // Newest page first, older pages fetched as the reader scrolls up. A thread
  // years long would otherwise arrive in one response and be laid out in full
  // before the first line is readable.
  const history = useInfiniteQuery({
    queryKey: ['chat-messages', target],
    queryFn: ({ pageParam }) =>
      chatApi.messages(target ?? undefined, pageParam || undefined),
    initialPageParam: 0,
    // The oldest id of the page just read is where the next one starts. An
    // empty page is the beginning of the conversation — stop asking. Reading
    // the end rather than counting against the server's page size keeps the
    // two from having to agree on a number.
    getNextPageParam: (last) => (last.messages.length ? last.messages[0].id : undefined),
  })
  const conversations = useQuery({
    queryKey: ['chat-conversations'],
    queryFn: chatApi.conversations,
  })

  const key = target ?? ROOM
  const pages = history.data?.pages
  const messages = useMemo(
    () =>
      mergeById(
        // Pages arrive newest-block-first; the thread reads oldest-first.
        [...(pages ?? [])].reverse().flatMap((p) => p.messages),
        live[key] ?? [],
      ),
    [pages, live, key],
  )

  // Looking at a conversation is reading it. Runs on every new message too, so
  // a thread left open does not accumulate a count behind the reader's eyes.
  // Keyed on the newest id rather than the count, which now also grows when
  // older history is pulled in above.
  const newestID = messages.at(-1)?.id
  useEffect(() => {
    markRead(key)
  }, [key, newestID, markRead])

  const rows = conversations.data?.conversations ?? []
  const peer = rows.find((c) => c.peer_id === target)

  return (
    <div className="mx-auto flex h-[calc(100dvh-9rem)] max-w-6xl gap-4">
      <aside className="hidden w-72 shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-surface md:flex">
        <ChatSidebar
          target={target}
          onPick={setTarget}
          conversations={rows}
          unread={unread}
        />
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface">
        <header className="flex items-center gap-3 border-b border-border px-4 py-3">
          {target === null ? (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent-soft">
              <UsersIcon className="h-4 w-4" />
            </span>
          ) : (
            <Avatar
              user={{
                username: peer?.username ?? '?',
                avatar_url: peer?.avatar_url ?? null,
              }}
              className="h-9 w-9 rounded-lg text-xs"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-fg-strong">
              {target === null ? 'Phòng chung' : (peer?.username ?? 'Trò chuyện')}
            </p>
            <p className="truncate text-xs text-fg-muted">
              {target === null
                ? 'Mọi người trên nền tảng đều đọc được'
                : 'Chỉ hai người đọc được'}
            </p>
          </div>
          <ConnBadge status={status} online={pages?.[0]?.online} />
        </header>

        {/* Remounted per conversation so the draft and the scroll position of
            one thread do not carry into another. */}
        <ChatThread
          key={key}
          messages={messages}
          meID={user?.id}
          loading={history.isLoading}
          hasOlder={history.hasNextPage}
          loadingOlder={history.isFetchingNextPage}
          onLoadOlder={history.fetchNextPage}
          canSend={status === 'open'}
          placeholder={status === 'open' ? 'Nhập tin nhắn…' : 'Đang kết nối lại…'}
          // Notifications are on by default and there is no switch for them, so
          // the permission is asked for here rather than from a button: sending
          // a message is a real user gesture, which is what a browser requires,
          // and it only ever happens once — after the first answer the call
          // returns it without prompting again.
          onSend={(body) => {
            void askNotifyPermission()
            send(body, target ?? 0)
          }}
          onEdit={edit}
          onDelete={remove}
        />
      </section>
    </div>
  )
}

/** History and the live feed overlap: a message can be in both if it arrived
 *  between the fetch and the socket opening, and an edit arrives for a message
 *  the fetch already returned. Later wins, sorted by the id the database
 *  assigned — so every client sees the same order. */
function mergeById(a: ChatMessage[], b: ChatMessage[]): ChatMessage[] {
  const byID = new Map<number, ChatMessage>()
  for (const m of [...a, ...b]) byID.set(m.id, m)
  return [...byID.values()].sort((x, y) => x.id - y.id)
}

function ConnBadge({
  status,
  online,
}: {
  status: 'connecting' | 'open' | 'closed'
  online?: number
}) {
  const tone =
    status === 'open'
      ? 'bg-success-soft text-success'
      : status === 'connecting'
        ? 'bg-amber-500/15 text-amber-500'
        : 'bg-danger/10 text-danger'
  const label =
    status === 'open'
      ? online
        ? `${online} đang mở`
        : 'đã kết nối'
      : status === 'connecting'
        ? 'đang kết nối…'
        : 'mất kết nối'

  return (
    <span
      className={'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ' + tone}
    >
      {label}
    </span>
  )
}
