import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { chatApi, chatSocketURL } from '@/api/chat'
import { useAuth } from '@/context/AuthContext'
import { Card, Input } from '@/components/ui'
import { timeAgo } from '@/lib/relativeTime'
import type { ChatMessage } from '@/lib/types'

const MAX_BODY = 1000

type Status = 'connecting' | 'open' | 'closed'

/** The shared room.
 *
 *  History comes from a plain GET and live messages from the socket. Both land
 *  in the same list, keyed by the id the database assigned — which is also what
 *  stops a message appearing twice when it arrives on the socket after already
 *  being in the history fetch. */
export default function Chat() {
  const { user } = useAuth()
  const [live, setLive] = useState<ChatMessage[]>([])
  const [status, setStatus] = useState<Status>('connecting')
  const [draft, setDraft] = useState('')
  const ws = useRef<WebSocket | null>(null)
  const bottom = useRef<HTMLDivElement>(null)

  const history = useQuery({ queryKey: ['chat-history'], queryFn: chatApi.history })

  useEffect(() => {
    // The server closes the socket once the authorising session would have
    // expired, so reconnecting is the normal path rather than an error one.
    // `stopped` keeps a socket from being reopened after the page has moved on.
    let stopped = false
    let retry: ReturnType<typeof setTimeout> | undefined
    let backoff = 1000

    const connect = () => {
      if (stopped) return
      setStatus('connecting')
      const sock = new WebSocket(chatSocketURL())
      ws.current = sock

      sock.onopen = () => {
        setStatus('open')
        backoff = 1000
      }
      sock.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as ChatMessage
          setLive((prev) =>
            prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
          )
        } catch {
          // A frame that is not a message is not worth breaking the room over.
        }
      }
      sock.onclose = () => {
        if (stopped) return
        setStatus('closed')
        retry = setTimeout(connect, backoff)
        // Backs off to half a minute so a server that is down does not get a
        // reconnect every second from every open tab.
        backoff = Math.min(backoff * 2, 30_000)
      }
    }

    connect()
    return () => {
      stopped = true
      clearTimeout(retry)
      ws.current?.close()
    }
  }, [])

  const messages = mergeById(history.data?.messages ?? [], live)

  // Only follows the bottom, so reading back through history is not yanked away
  // by somebody else typing.
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'nearest' })
  }, [messages.length])

  const send = () => {
    const body = draft.trim()
    if (!body || ws.current?.readyState !== WebSocket.OPEN) return
    ws.current.send(JSON.stringify({ body }))
    setDraft('')
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-8rem)] max-w-3xl flex-col gap-4 px-4 py-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-fg-strong">Phòng chat chung</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Một phòng cho cả nền tảng. Lịch sử giữ lại, ai vào cũng đọc được.
          </p>
        </div>
        <ConnBadge status={status} online={history.data?.online} />
      </div>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {history.isLoading ? (
            <p className="text-center text-sm text-fg-subtle">Đang tải…</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-sm text-fg-subtle">
              Chưa ai nói gì. Bạn mở hàng đi.
            </p>
          ) : (
            messages.map((m) => (
              <Bubble key={m.id} msg={m} mine={m.user_id === user?.id} />
            ))
          )}
          <div ref={bottom} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
          className="flex items-center gap-2 border-t border-border p-3"
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={MAX_BODY}
            placeholder={
              status === 'open' ? 'Nhập tin nhắn…' : 'Đang kết nối lại…'
            }
            disabled={status !== 'open'}
          />
          <button
            type="submit"
            disabled={status !== 'open' || draft.trim() === ''}
            className="shrink-0 rounded-md bg-accent px-4 py-2.5 font-medium text-accent-fg transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            Gửi
          </button>
        </form>
      </Card>
    </div>
  )
}

/** History and the live feed overlap: a message can be in both if it arrived
 *  between the fetch and the socket opening. Keyed by id, sorted by id — the
 *  database assigned both, so every client sees the same order. */
function mergeById(a: ChatMessage[], b: ChatMessage[]): ChatMessage[] {
  const byID = new Map<number, ChatMessage>()
  for (const m of [...a, ...b]) byID.set(m.id, m)
  return [...byID.values()].sort((x, y) => x.id - y.id)
}

function ConnBadge({ status, online }: { status: Status; online?: number }) {
  const tone =
    status === 'open'
      ? 'bg-success-soft text-success'
      : status === 'connecting'
        ? 'bg-amber-500/15 text-amber-500'
        : 'bg-danger/10 text-danger'
  const label =
    status === 'open'
      ? `đang kết nối${online ? ` · ${online} người` : ''}`
      : status === 'connecting'
        ? 'đang kết nối…'
        : 'mất kết nối — đang thử lại'

  return (
    <span className={'rounded-full px-2.5 py-0.5 text-xs font-medium ' + tone}>
      {label}
    </span>
  )
}

function Bubble({ msg, mine }: { msg: ChatMessage; mine: boolean }) {
  return (
    <div className={'flex ' + (mine ? 'justify-end' : 'justify-start')}>
      <div className="max-w-[80%] min-w-0">
        <div
          className={
            'flex items-baseline gap-2 text-xs ' +
            (mine ? 'justify-end' : 'justify-start')
          }
        >
          <span className="font-medium text-fg-strong">{msg.username}</span>
          <span className="text-fg-subtle">{timeAgo(msg.created_at)}</span>
        </div>
        {/* Rendered as text, never as markup: this is the one place on the site
            where one user's input reaches another user's screen. */}
        <p
          className={
            'mt-1 rounded-lg px-3 py-2 text-sm break-words whitespace-pre-wrap ' +
            (mine ? 'bg-accent text-accent-fg' : 'bg-muted text-fg')
          }
        >
          {msg.body}
        </p>
      </div>
    </div>
  )
}
