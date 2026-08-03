import { request } from '@/lib/api'
import { terminalURL } from '@/api/labs'
import type { ChatConversation, ChatHistory, ChatPerson } from '@/lib/types'

export const chatApi = {
  /** Một trang tin nhắn của cuộc trò chuyện. Không truyền `peer` là phòng chung.
   *
   *  `before` là id tin cũ nhất đang giữ — bỏ trống để lấy trang mới nhất. Cuộn
   *  ngược lên thì gọi lại với id đó, nên màn hình không phải tải cả lịch sử.
   *
   *  Là GET thường chứ không phải frame đầu của websocket: vẫn chạy khi upgrade
   *  thất bại, và giữ cho giao thức trên socket chỉ có đúng một dạng. */
  messages: (peer?: number, before?: number) => {
    const q = new URLSearchParams()
    if (peer) q.set('peer', String(peer))
    if (before) q.set('before', String(before))
    const s = q.toString()
    return request<ChatHistory>('/api/chat/messages' + (s ? `?${s}` : ''))
  },

  conversations: () =>
    request<{ conversations: ChatConversation[] }>('/api/chat/conversations'),

  people: (q: string) =>
    request<{ people: ChatPerson[] }>(
      `/api/chat/people?q=${encodeURIComponent(q)}`,
    ),
}

/** Cùng cách dựng URL với terminal lab — scheme bám theo https, nếu không trang
 *  đã deploy sẽ mở ws:// từ origin bảo mật và trình duyệt chặn thẳng. */
export const chatSocketURL = () => terminalURL('/ws/chat')
