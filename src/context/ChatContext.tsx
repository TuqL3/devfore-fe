import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { chatSocketURL } from '@/api/chat'
import { notify, ROOM, type ChatStatus } from '@/lib/chat'
import { useAuth } from '@/context/AuthContext'
import type { ChatEvent, ChatMessage } from '@/lib/types'

interface ChatState {
  status: ChatStatus
  /** Live events since the socket opened, per conversation. */
  live: Record<number, ChatMessage[]>
  /** Unread count per conversation, from the last-read mark this browser kept. */
  unread: Record<number, number>
  /** Direct-message unread only — what the nav badge shows. Room traffic is
   *  everybody's and badging it would make the number meaningless. */
  dmUnread: number
  send: (body: string, peer: number) => void
  edit: (id: number, body: string) => void
  remove: (id: number) => void
  /** Marks everything currently known in a conversation as read. */
  markRead: (peer: number) => void
}

const Ctx = createContext<ChatState | null>(null)

/** Where the last-read mark lives.
 *
 *  ponytail: localStorage, not a chat_reads table. It survives a reload, costs
 *  no migration and no write per view, and the one thing it loses is agreement
 *  between two browsers. A server-side cursor is the upgrade when people start
 *  reading on a phone and a laptop at once.
 */
const SEEN_KEY = 'devforge.chat.seen'

function loadSeen(): Record<number, number> {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    return raw ? (JSON.parse(raw) as Record<number, number>) : {}
  } catch {
    // A corrupt or unavailable store must not take the chat down with it.
    return {}
  }
}

function saveSeen(seen: Record<number, number>) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen))
  } catch {
    // Private mode, quota, whatever. Unread counts are not worth an error.
  }
}

/** Holds the one socket for the whole app.
 *
 *  Up here rather than in the chat screen because a notification that only
 *  arrives while you are already looking at the conversation is not a
 *  notification. One connection per tab, reused by every page. */
export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [status, setStatus] = useState<ChatStatus>('connecting')
  const [live, setLive] = useState<Record<number, ChatMessage[]>>({})
  const [seen, setSeen] = useState<Record<number, number>>(loadSeen)
  const ws = useRef<WebSocket | null>(null)
  // Read inside the socket callback, which is created once — state would be
  // captured at its first value and every message would be counted unread.
  const seenRef = useRef(seen)
  seenRef.current = seen

  const bucketOf = useCallback(
    (m: ChatMessage): number => {
      if (m.peer_id == null) return ROOM
      return m.user_id === user?.id ? m.peer_id : (m.user_id ?? ROOM)
    },
    [user?.id],
  )

  useEffect(() => {
    // No socket for a signed-out visitor: the handshake would 401 and the retry
    // loop would hammer it once a second.
    if (!user) {
      ws.current?.close()
      setStatus('closed')
      return
    }

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
        let ev: ChatEvent
        try {
          ev = JSON.parse(e.data) as ChatEvent
        } catch {
          return
        }
        const key = bucketOf(ev.message)

        setLive((prev) => {
          const bucket = prev[key] ?? []
          // Replace in place on an update, append on a new message. Matching by
          // id also stops a message appearing twice when it arrives on the
          // socket after already being in the history fetch.
          const at = bucket.findIndex((m) => m.id === ev.message.id)
          const next =
            at >= 0
              ? bucket.map((m, i) => (i === at ? ev.message : m))
              : [...bucket, ev.message]
          return { ...prev, [key]: next }
        })

        if (ev.kind !== 'message') return

        // Your own message is read by definition — you just wrote it.
        if (ev.message.user_id === user.id) {
          setSeen((prev) => {
            const next = { ...prev, [key]: ev.message.id }
            saveSeen(next)
            return next
          })
          return
        }

        if (ev.message.peer_id != null) {
          // A direct message can create a conversation the sidebar has never
          // seen, and reorders the ones it has.
          qc.invalidateQueries({ queryKey: ['chat-conversations'] })
          notify(ev.message)
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
  }, [user, bucketOf, qc])

  const markRead = useCallback((peer: number) => {
    setLive((current) => {
      const last = current[peer]?.at(-1)?.id
      if (last != null && last > (seenRef.current[peer] ?? 0)) {
        setSeen((prev) => {
          const next = { ...prev, [peer]: last }
          saveSeen(next)
          return next
        })
      }
      return current
    })
  }, [])

  const call = (payload: Record<string, unknown>) => {
    if (ws.current?.readyState !== WebSocket.OPEN) return
    ws.current.send(JSON.stringify(payload))
  }

  const unread = useMemo(() => {
    const out: Record<number, number> = {}
    for (const [k, msgs] of Object.entries(live)) {
      const key = Number(k)
      const mark = seen[key] ?? 0
      out[key] = msgs.filter(
        (m) => m.id > mark && m.user_id !== user?.id && m.deleted_at == null,
      ).length
    }
    return out
  }, [live, seen, user?.id])

  const dmUnread = useMemo(
    () =>
      Object.entries(unread)
        .filter(([k]) => Number(k) !== ROOM)
        .reduce((n, [, v]) => n + v, 0),
    [unread],
  )

  const value: ChatState = {
    status,
    live,
    unread,
    dmUnread,
    send: (body, peer) => call({ kind: 'send', body, peer_id: peer }),
    edit: (id, body) => call({ kind: 'edit', id, body }),
    remove: (id) => call({ kind: 'delete', id }),
    markRead,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useChat() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useChat must be used within ChatProvider')
  return v
}
