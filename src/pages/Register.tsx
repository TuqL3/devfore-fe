import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { ApiError } from '@/lib/api'
import { Button, Field, Input } from '@/components/ui'
import { GoogleButton } from '@/components/GoogleButton'
import { AuthShell } from './Login'

export default function Register() {
  const { register } = useAuth()
  const nav = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '' })

  const mut = useMutation({
    mutationFn: () => register(form.username, form.email, form.password),
    onSuccess: () => nav('/', { replace: true }),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    mut.mutate()
  }

  const error = mut.isError
    ? mut.error instanceof ApiError
      ? mut.error.message
      : 'Đăng ký thất bại'
    : ''

  return (
    <AuthShell title="Tạo tài khoản">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Username">
          <Input
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            autoComplete="username"
            minLength={3}
            required
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            autoComplete="email"
            required
          />
        </Field>
        <Field label="Mật khẩu (tối thiểu 8 ký tự)">
          <Input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" className="w-full" disabled={mut.isPending}>
          {mut.isPending ? 'Đang xử lý…' : 'Đăng ký'}
        </Button>
      </form>
      <GoogleButton />
      <p className="text-center text-sm text-slate-400">
        Đã có tài khoản?{' '}
        <Link to="/login" className="text-violet-400 hover:underline">
          Đăng nhập
        </Link>
      </p>
    </AuthShell>
  )
}
