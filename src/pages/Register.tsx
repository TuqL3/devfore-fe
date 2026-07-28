import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { ApiError } from '@/lib/api'
import { Input, PasswordInput } from '@/components/ui'
import { GoogleButton } from '@/components/GoogleButton'
import {
  AuthShell,
  Divider,
  TermButton,
  TermError,
  TermField,
} from '@/components/AuthShell'

export default function Register() {
  const nav = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '' })

  const mut = useMutation({
    mutationFn: () => authApi.register(form),
    // No session yet — the account is pending until the emailed code comes
    // back. The server echoes the address it stored, so the next screen works
    // off that rather than whatever casing was typed here.
    onSuccess: ({ email }) =>
      nav(`/verify-email?email=${encodeURIComponent(email)}`, { replace: true }),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    mut.mutate()
  }

  const error = mut.isError
    ? mut.error instanceof ApiError
      ? mut.error.message
      : 'đăng ký thất bại'
    : ''

  return (
    <AuthShell cmd="register">
      <form onSubmit={onSubmit} className="space-y-4">
        <TermField flag="username" hint="tối thiểu 3 ký tự">
          <Input
            variant="terminal"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            autoComplete="username"
            placeholder="lukas"
            minLength={3}
            required
          />
        </TermField>
        <TermField flag="email">
          <Input
            variant="terminal"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            autoComplete="email"
            placeholder="lukas@example.com"
            required
          />
        </TermField>
        <TermField flag="password" hint="tối thiểu 8 ký tự">
          <PasswordInput
            variant="terminal"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            autoComplete="new-password"
            placeholder="••••••••"
            minLength={8}
            required
          />
        </TermField>
        {error && <TermError>{error}</TermError>}
        <TermButton type="submit" disabled={mut.isPending}>
          {mut.isPending ? 'creating account…' : './create-account'}
        </TermButton>
        <p className="font-mono text-xs text-fg-subtle">
          # sẽ gửi mã xác thực 6 số tới email của bạn
        </p>
      </form>

      <Divider />
      <GoogleButton />

      <p className="font-mono text-sm text-fg-subtle">
        # đã có tài khoản?{' '}
        <Link to="/login" className="text-accent-soft hover:underline">
          ./login
        </Link>
      </p>
    </AuthShell>
  )
}
