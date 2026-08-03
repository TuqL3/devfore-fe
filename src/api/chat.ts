import { request } from '@/lib/api'
import { terminalURL } from '@/api/labs'
import type { ChatHistory } from '@/lib/types'

export const chatApi = {
  /** Đọc phần đuôi của phòng trước khi mở socket. Là GET thường chứ không phải
   *  frame đầu tiên của websocket: nó vẫn chạy khi upgrade thất bại, và giữ cho
   *  giao thức trên socket chỉ có đúng một dạng message. */
  history: () => request<ChatHistory>('/api/chat/messages'),
}

/** Cùng cách dựng URL với terminal lab — scheme bám theo https, nếu không trang
 *  đã deploy sẽ mở ws:// từ origin bảo mật và trình duyệt chặn thẳng. */
export const chatSocketURL = () => terminalURL('/ws/chat')
