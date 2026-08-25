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
        <p className="font-mono text-sm text-success">✓ done</p>
        <p className="font-mono text-sm text-fg-muted">
          # if{' '}
          <span className="text-fg-strong">{email}</span>{' '}
          has an account, a reset link was just sent there. The link expires in 1 hour.
        </p>
        <p className="font-mono text-sm text-fg-subtle">
          # no email? check your spam folder, or{' '}
          <button
            onClick={() => mut.reset()}
            className="text-accent-soft hover:underline"
          >
            try another address
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
      : 'could not send the email'
    : ''

  return (
    <AuthShell cmd="forgot-password">
      <p className="font-mono text-sm text-fg-muted">
        # enter your registered email and we will send a reset link.
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
        # remembered it?{' '}
        <Link to="/login" className="text-accent-soft hover:underline">
          ./login
        </Link>
      </p>
    </AuthShell>
  )
}
