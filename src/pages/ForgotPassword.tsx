import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { ApiError } from '@/lib/api'
import { Input } from '@/components/ui'
import {
  AuthShell,
  TermButton,
  TermError,
  TermField,
} from '@/components/AuthShell'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')

  const mut = useMutation({
    mutationFn: () => authApi.forgotPassword({ email }),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    mut.mutate()
  }

  // Deliberately worded as "if that address has an account": the server answers
  // the same way either way, and a confident "sent!" would turn this form into
  // a way to find out who is registered.
  if (mut.isSuccess) {
    return (
      <AuthShell cmd="forgot-password">
        <p className="font-mono text-sm text-success">✓ đã xử lý</p>
        <p className="font-mono text-sm text-fg-muted">
          # nếu <span className="text-fg-strong">{email}</span> có tài khoản,
          link đặt lại mật khẩu vừa được gửi tới đó. Link hết hạn sau 1 giờ.
        </p>
        <p className="font-mono text-sm text-fg-subtle">
          # không thấy mail? kiểm tra hộp thư spam, hoặc{' '}
          <button
            onClick={() => mut.reset()}
            className="text-accent-soft hover:underline"
          >
            thử địa chỉ khác
          </button>
          .
        </p>
        <p className="font-mono text-sm text-fg-subtle">
          <Link to="/login" className="text-accent-soft hover:underline">
            ./login
          </Link>
        </p>
      </AuthShell>
    )
  }

  const error = mut.isError
    ? mut.error instanceof ApiError
      ? mut.error.message
      : 'gửi mail thất bại'
    : ''

  return (
    <AuthShell cmd="forgot-password">
      <p className="font-mono text-sm text-fg-muted">
        # nhập email đã đăng ký, chúng tôi gửi link đặt lại mật khẩu.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <TermField flag="email">
          <Input
            variant="terminal"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="lukas@example.com"
            required
            autoFocus
          />
        </TermField>
        {error && <TermError>{error}</TermError>}
        <TermButton type="submit" disabled={mut.isPending}>
          {mut.isPending ? 'sending…' : './send-reset-link'}
        </TermButton>
      </form>

      <p className="font-mono text-sm text-fg-subtle">
        # nhớ ra rồi?{' '}
        <Link to="/login" className="text-accent-soft hover:underline">
          ./login
        </Link>
      </p>
    </AuthShell>
  )
}
