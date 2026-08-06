import type { ChatMessage } from '@/lib/types'

/** The shared room's bucket. Direct threads are keyed by the other person's id,
 *  which is never zero, so there is no collision. */
export const ROOM = 0

export type ChatStatus = 'connecting' | 'open' | 'closed'

/** A desktop notification, only when the tab is not the one being looked at.
 *  Callers decide what deserves one; this only knows how to show it. */
export function notify(m: ChatMessage) {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return
  if (!document.hidden) return
  try {
    new Notification(`Tin nhắn từ ${m.username}`, {
      body: m.body.slice(0, 120),
      // Same tag per sender, so five messages replace one another instead of
      // stacking five notifications.
      tag: `devforge-chat-${m.user_id}`,
    })
  } catch {
    // Some browsers throw here on mobile. Not worth breaking the room over.
  }
}

/** Asks for notification permission. Called when somebody sends their first
 *  message, never on load: a prompt that appears before anyone has done
 *  anything is the prompt every browser has trained people to dismiss, and a
 *  dismissal is permanent. Returns the standing answer without prompting once
 *  it has one. */
export async function askNotifyPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'denied'
  if (Notification.permission !== 'default') return Notification.permission
  return Notification.requestPermission()
}
