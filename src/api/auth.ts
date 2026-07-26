import { request } from '@/lib/api'
import type { AuthResponse, User } from '@/lib/types'

export const authApi = {
  register: (body: { username: string; email: string; password: string }) =>
    request<AuthResponse>('/api/auth/register', { body, auth: false }),

  login: (body: { login: string; password: string }) =>
    request<AuthResponse>('/api/auth/login', { body, auth: false }),

  me: () => request<User>('/api/me'),

  googleUrl: () => (import.meta.env.VITE_API_URL ?? 'http://localhost:8080') + '/api/auth/google',
}
