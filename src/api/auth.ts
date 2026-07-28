import { request } from '@/lib/api'
import type { Session, User } from '@/lib/types'

export const authApi = {
  register: (body: { username: string; email: string; password: string }) =>
    request<User>('/api/auth/register', { body, auth: false }),

  login: (body: { login: string; password: string }) =>
    request<User>('/api/auth/login', { body, auth: false }),

  // Ends this browser's session. auth:false because an expired access token is
  // the most ordinary reason to be logging out — retrying would be pointless.
  logout: () =>
    request<void>('/api/auth/logout', { method: 'POST', auth: false }),

  // Ends every session on the account, on every device.
  logoutAll: () => request<void>('/api/auth/logout-all', { method: 'POST' }),

  sessions: () => request<Session[]>('/api/auth/sessions'),

  revokeSession: (id: string) =>
    request<void>(`/api/auth/sessions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  me: () => request<User>('/api/me'),

  updateMe: (body: {
    username: string
    email: string
    avatar_url?: string
  }) => request<User>('/api/me', { method: 'PATCH', body }),

  uploadAvatar: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<User>('/api/me/avatar', { method: 'POST', body: form })
  },

  changePassword: (body: {
    current_password: string
    new_password: string
  }) => request<void>('/api/me/password', { method: 'PATCH', body }),

  deleteMe: (body: { password: string }) =>
    request<void>('/api/me', { method: 'DELETE', body }),

  googleUrl: () => (import.meta.env.VITE_API_URL ?? 'http://localhost:8080') + '/api/auth/google',
}
