import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
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

/** Chỗ quay về sau khi đăng nhập: trang `ProtectedRoute` vừa chặn, hoặc trang
 *  chủ khi họ tự vào /login.
 *
 *  Chỉ nhận đường dẫn tương đối bắt đầu bằng một dấu gạch chéo. `state` do
 *  router giữ chứ không phải người dùng gõ, nhưng một trang đăng nhập nhảy sang
 *  URL lấy từ dữ liệu ngoài là đúng hình dạng của open redirect, và cái chặn nó
 *  rẻ hơn cái phải giải thích về sau. */
function useReturnTo(): string {
  const { state } = useLocation()
  const from = (state as { from?: unknown } | null)?.from
  if (typeof from !== 'string') return '/'
  if (!from.startsWith('/') || from.startsWith('//')) return '/'
  return from
}

export default function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const returnTo = useReturnTo()
  const [params] = useSearchParams()
  const [form, setForm] = useState({ login: '', password: '' })
  // Set when the password was right and the account has a second factor. The
  // password step is done at that point and is not repeated — this screen swaps
  // for the code one rather than adding a field to it.
  const [challenge, setChallenge] = useState<string | null>(null)

  const mut = useMutation({
    mutationFn: () => login(form.login, form.password),
    onSuccess: (mfa) => {
      if (mfa) {
        setChallenge(mfa.challenge)
        return
      }
      nav(returnTo, { replace: true })
    },
    // The password was right but the account never finished signing up. They
    // have nothing to fix here, so hand them straight to the code screen.
    onError: (e) => {
      if (e instanceof ApiError && e.code === 'email_not_verified') {
        nav(`/verify-email?email=${encodeURIComponent(form.login)}`)
      }
    },
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

  if (challenge) {
    return <MFAStep challenge={challenge} onBack={() => setChallenge(null)} />
  }

  return (
    <AuthShell cmd="login">
      {/* Reset revokes every session, so they land back here — say why. */}
      {params.get('reset') === '1' && !mut.isError && (
        <p className="font-mono text-sm text-success">
          ✓ đã đổi mật khẩu, đăng nhập lại
        </p>
      )}
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
        <TermField
          flag="password"
          hint={
            <Link
              to="/forgot-password"
              className="text-accent-soft hover:underline"
            >
              # quên mật khẩu?
            </Link>
          }
        >
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

/** The second step, for accounts with a second factor. A screen of its own
 *  rather than a field appended to the first: the password is already accepted
 *  by the time this renders, and showing it again invites re-typing something
 *  the server is no longer asking for.
 *
 *  A challenge is spent on the first submission whatever the answer, so a wrong
 *  code means going back for a new one. That is deliberate on the server side —
 *  it caps one token at one guess — and this screen says so rather than looking
 *  broken. */
function MFAStep({
  challenge,
  onBack,
}: {
  challenge: string
  onBack: () => void
}) {
  const { loginMFA } = useAuth()
  const nav = useNavigate()
  const returnTo = useReturnTo()
  const [code, setCode] = useState('')

  const mut = useMutation({
    mutationFn: () => loginMFA(challenge, code),
    onSuccess: () => nav(returnTo, { replace: true }),
  })

  const error = mut.isError
    ? mut.error instanceof ApiError
      ? mut.error.message
      : 'xác thực thất bại'
    : ''

  return (
    <AuthShell cmd="login --mfa">
      <p className="font-mono text-sm text-fg-subtle">
        # mở ứng dụng xác thực và nhập mã 6 số, hoặc dán một recovery code
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          mut.mutate()
        }}
        className="space-y-4"
      >
        <TermField flag="code">
          <Input
            variant="terminal"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            // One-time-code tells a phone keyboard to offer the code it just
            // saw, which is the difference between typing six digits and not.
            autoComplete="one-time-code"
            inputMode="text"
            autoFocus
            placeholder="123456"
            required
          />
        </TermField>
        {error && <TermError>{error}</TermError>}
        <TermButton type="submit" disabled={mut.isPending || code.trim() === ''}>
          {mut.isPending ? 'verifying…' : './verify'}
        </TermButton>
      </form>

      <button
        type="button"
        onClick={onBack}
        className="font-mono text-sm text-accent-soft hover:underline"
      >
        # nhập sai? quay lại đăng nhập để lấy mã mới
      </button>
    </AuthShell>
  )
}
