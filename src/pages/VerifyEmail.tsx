import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { authApi } from '@/api/auth'
import { ApiError } from '@/lib/api'
import { Input } from '@/components/ui'
import {
  AuthShell,
  TermButton,
  TermError,
  TermField,
} from '@/components/AuthShell'

const RESEND_SECONDS = 60

export default function VerifyEmail() {
  const { verifyEmail } = useAuth()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const email = params.get('email') ?? ''
  const [code, setCode] = useState('')
  const [cooldown, setCooldown] = useState(0)

  const mut = useMutation({
    mutationFn: () => verifyEmail(email, code),
    // The code is what creates the session, so there is nothing else to do
    // afterwards — land them signed in.
    onSuccess: () => nav('/', { replace: true }),
  })

  const resend = useMutation({
    mutationFn: () => authApi.resendCode({ email }),
    onSuccess: () => setCooldown(RESEND_SECONDS),
    // The server enforces its own cooldown; mirroring it locally keeps the
    // button from inviting a request that is going to be refused.
    onError: (e) => {
      if (e instanceof ApiError && e.status === 429) setCooldown(RESEND_SECONDS)
    },
  })

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown((n) => n - 1), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  // Landing here without an address means a hand-typed or truncated URL; there
  // is no screen to show, so send them back to where the address comes from.
  if (!email) return <Navigate to="/register" replace />

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    mut.mutate()
  }

  const error = mut.isError
    ? mut.error instanceof ApiError
      ? mut.error.message
      : 'verification failed'
    : ''

  return (
    <AuthShell cmd="verify-email">
      <p className="font-mono text-sm text-fg-muted">
        # a 6-digit code was sent to{' '}
        <span className="text-fg-strong">{email}</span>
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <TermField flag="code" hint="6 digits">
          <Input
            variant="terminal"
            value={code}
            // Strip everything that is not a digit: people paste the code with
            // spaces, and the server rejects anything that is not six digits.
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            className="text-center text-2xl tracking-[0.5em]"
            required
            autoFocus
          />
        </TermField>
        {error && <TermError>{error}</TermError>}
        <TermButton type="submit" disabled={mut.isPending || code.length !== 6}>
          {mut.isPending ? 'verifying…' : './verify'}
        </TermButton>
      </form>

      <div className="space-y-1 font-mono text-sm text-fg-subtle">
        <p># no email? check your spam folder too.</p>
        <p>
          {cooldown > 0 ? (
            <span># {`resend in ${cooldown}s`}</span>
          ) : (
            <button
              onClick={() => resend.mutate()}
              disabled={resend.isPending}
              className="text-accent-soft hover:underline disabled:opacity-50"
            >
              ./resend-code
            </button>
          )}
          {resend.isSuccess && cooldown > 0 && (
            <span className="ml-2 text-success">✓ sent again</span>
          )}
        </p>
        <p>
          # wrong address?{' '}
          <Link to="/register" className="text-accent-soft hover:underline">
            ./register
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}
