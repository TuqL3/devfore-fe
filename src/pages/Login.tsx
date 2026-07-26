import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { ApiError } from '@/lib/api'
import { Button, Field, Input } from '@/components/ui'
import { GoogleButton } from '@/components/GoogleButton'

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
      : 'Đăng nhập thất bại'
    : (params.get('error') ?? '')

  return (
    <AuthShell title="Đăng nhập">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email hoặc username">
          <Input
            value={form.login}
            onChange={(e) => setForm({ ...form, login: e.target.value })}
            autoComplete="username"
            required
          />
        </Field>
        <Field label="Mật khẩu">
          <Input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            autoComplete="current-password"
            required
          />
        </Field>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" className="w-full" disabled={mut.isPending}>
          {mut.isPending ? 'Đang xử lý…' : 'Đăng nhập'}
        </Button>
      </form>
      <Divider />
      <GoogleButton />
      <p className="text-center text-sm text-slate-400">
        Chưa có tài khoản?{' '}
        <Link to="/register" className="text-violet-400 hover:underline">
          Đăng ký
        </Link>
      </p>
    </AuthShell>
  )
}

export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-slate-800 bg-slate-900/50 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">DevForge</h1>
          <p className="mt-1 text-sm text-slate-400">{title}</p>
        </div>
        {children}
      </div>
    </div>
  )
}

function Divider() {
  return (
    <div className="flex items-center gap-3 text-xs text-slate-600">
      <span className="h-px flex-1 bg-slate-800" />
      hoặc
      <span className="h-px flex-1 bg-slate-800" />
    </div>
  )
}
