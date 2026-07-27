import { request } from '@/lib/api'
import type { AuthResponse, User } from '@/lib/types'

export const authApi = {
  register: (body: { username: string; email: string; password: string }) =>
    request<AuthResponse>('/api/auth/register', { body, auth: false }),

  login: (body: { login: string; password: string }) =>
    request<AuthResponse>('/api/auth/login', { body, auth: false }),

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
