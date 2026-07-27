import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
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

export default function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [form, setForm] = useState({ login: '', password: '' })

  const mut = useMutation({
    mutationFn: () => login(form.login, form.password),
    onSuccess: () => nav('/', { replace: true }),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    mut.mutate()
  }

  // Mutation error wins; otherwise fall back to the ?error= from Google redirect.
  const error = mut.isError
    ? mut.error instanceof ApiError
      ? mut.error.message
      : 'đăng nhập thất bại'
    : (params.get('error') ?? '')

  return (
    <AuthShell cmd="login">
      <form onSubmit={onSubmit} className="space-y-4">
        <TermField flag="user">
          <Input
            variant="terminal"
            value={form.login}
            onChange={(e) => setForm({ ...form, login: e.target.value })}
            autoComplete="username"
            placeholder="email hoặc username"
            required
          />
        </TermField>
        <TermField flag="password">
          <PasswordInput
            variant="terminal"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            autoComplete="current-password"
            placeholder="••••••••"
            required
          />
        </TermField>
        {error && <TermError>{error}</TermError>}
        <TermButton type="submit" disabled={mut.isPending}>
          {mut.isPending ? 'authenticating…' : './authenticate'}
        </TermButton>
      </form>

      <Divider />
      <GoogleButton />

      <p className="font-mono text-sm text-fg-subtle">
        # chưa có tài khoản?{' '}
        <Link to="/register" className="text-accent-soft hover:underline">
          ./register
        </Link>
      </p>
    </AuthShell>
  )
}
