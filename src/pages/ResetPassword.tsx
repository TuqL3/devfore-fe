import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { ApiError } from '@/lib/api'
import { PasswordInput } from '@/components/ui'
import {
  AuthShell,
  TermButton,
  TermError,
  TermField,
} from '@/components/AuthShell'

export default function ResetPassword() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [form, setForm] = useState({ password: '', confirm: '' })

  const mut = useMutation({
    mutationFn: () => authApi.resetPassword({ token, password: form.password }),
    // Resetting drops every session on the account, so there is nothing to be
    // signed into afterwards — they log in with the new password.
    onSuccess: () =>
      nav('/login?reset=1', { replace: true }),
  })

  // A link with no token is a mangled URL, not a form to fill in.
  if (!token) return <Navigate to="/forgot-password" replace />

  const mismatch = form.confirm !== '' && form.confirm !== form.password

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (mismatch) return
    mut.mutate()
  }

  const error = mismatch
    ? 'hai mật khẩu không khớp'
    : mut.isError
      ? mut.error instanceof ApiError
        ? mut.error.message
        : 'đặt lại mật khẩu thất bại'
      : ''

  return (
    <AuthShell cmd="reset-password">
      <p className="font-mono text-sm text-fg-muted">
        # đặt mật khẩu mới. Mọi thiết bị đang đăng nhập sẽ bị thoát.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <TermField flag="new-password" hint="tối thiểu 8 ký tự">
          <PasswordInput
            variant="terminal"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            autoComplete="new-password"
            placeholder="••••••••"
            minLength={8}
            required
            autoFocus
          />
        </TermField>
        <TermField flag="confirm">
          <PasswordInput
            variant="terminal"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            autoComplete="new-password"
            placeholder="••••••••"
            minLength={8}
            required
          />
        </TermField>
        {error && <TermError>{error}</TermError>}
        <TermButton type="submit" disabled={mut.isPending || mismatch}>
          {mut.isPending ? 'saving…' : './set-password'}
        </TermButton>
      </form>

      <p className="font-mono text-sm text-fg-subtle">
        # link hết hạn?{' '}
        <Link to="/forgot-password" className="text-accent-soft hover:underline">
          ./forgot-password
        </Link>
      </p>
    </AuthShell>
  )
}
