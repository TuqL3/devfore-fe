import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { authApi } from '@/api/auth'
import { ApiError } from '@/lib/api'
import { Button, ErrorBox, Field, Input, PasswordInput } from '@/components/ui'
import { useT } from '@/lib/i18n'

const KEY = ['totp-status'] as const

function errText(e: unknown, fallback: string) {
  return e instanceof ApiError ? e.message : fallback
}

/** Enrolling in, and turning off, the second factor.
 *
 *  Three states rather than a form that is always visible: off, mid-enrolment,
 *  and on. The middle one exists because scanning a secret is not proof anything
 *  scanned it — until a code comes back, nothing about signing in changes, so a
 *  person who closes the tab halfway is not locked out of their own account. */
export function TwoFactor() {
  const t = useT()
  const qc = useQueryClient()
  const status = useQuery({ queryKey: KEY, queryFn: authApi.totpStatus })
  const [setup, setSetup] = useState<{
    secret: string
    uri: string
    qr: string
  } | null>(null)
  const [codes, setCodes] = useState<string[] | null>(null)

  const start = useMutation({
    mutationFn: authApi.totpStart,
    onSuccess: setSetup,
  })

  const done = () => {
    setSetup(null)
    qc.invalidateQueries({ queryKey: KEY })
  }

  if (status.isLoading) {
    return <p className="text-sm text-fg-subtle">{t('common.loading')}</p>
  }

  // Shown once, after confirming. There is no endpoint that returns these
  // again — they are stored hashed — so this panel stays until it is dismissed
  // on purpose rather than closing itself on the next render.
  if (codes) {
    return <RecoveryCodes codes={codes} onDone={() => { setCodes(null); done() }} />
  }

  if (setup) {
    return (
      <Enrol
        secret={setup.secret}
        uri={setup.uri}
        qr={setup.qr}
        onCancel={done}
        onConfirmed={setCodes}
      />
    )
  }

  if (status.data?.enabled) {
    return <Enabled left={status.data.recovery_left} onDisabled={done} />
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-semibold text-fg-strong">{t('twoFactor.title')}</h2>
        <p className="mt-1 text-sm text-fg-muted">
          {t('twoFactor.intro')}
        </p>
      </div>
      {start.isError && <ErrorBox>{errText(start.error, t('twoFactor.enableFailed'))}</ErrorBox>}
      <Button onClick={() => start.mutate()} disabled={start.isPending}>
        {start.isPending ? t('twoFactor.creating') : t('twoFactor.enable')}
      </Button>
    </section>
  )
}

function Enrol({
  secret,
  uri,
  qr,
  onCancel,
  onConfirmed,
}: {
  secret: string
  uri: string
  /** PNG data URI. Rendered inline — no request leaves the page for it. */
  qr: string
  onCancel: () => void
  onConfirmed: (codes: string[]) => void
}) {
  const t = useT()
  const [code, setCode] = useState('')
  const confirm = useMutation({
    mutationFn: () => authApi.totpConfirm(code),
    onSuccess: (r) => onConfirmed(r.recovery_codes),
  })

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-semibold text-fg-strong">{t('twoFactor.step1')}</h2>
        <p className="mt-1 text-sm text-fg-muted">
          {t('twoFactor.step1Hint')}
        </p>
      </div>

      {/* Three ways in, same secret: scan it, tap it, or type it. The QR is a
          data URI, so nothing leaves the page to fetch it — and an enrolment
          screen that depended on a second request would break in exactly the
          offline-ish conditions people set this up in. */}
      <div className="flex flex-wrap items-start gap-4 rounded-lg border border-border bg-muted/40 p-3">
        <img
          src={qr}
          alt={t('twoFactor.qrAlt')}
          width={168}
          height={168}
          // White plate under it: a QR inverted by a dark theme does not scan.
          className="h-[168px] w-[168px] shrink-0 rounded-md bg-white p-2"
          style={{ imageRendering: 'pixelated' }}
        />
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="text-xs text-fg-muted">
              {t('twoFactor.cannotScan')}
            </p>
            <p className="mt-1 font-mono text-sm break-all text-fg-strong select-all">
              {secret}
            </p>
          </div>
          <a
            href={uri}
            className="inline-block font-mono text-xs text-accent-soft hover:underline"
          >
            → {t('twoFactor.openApp')}
          </a>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          confirm.mutate()
        }}
        className="space-y-3"
      >
        <h2 className="font-semibold text-fg-strong">{t('twoFactor.step2')}</h2>
        <Field label={t('twoFactor.codeLabel')}>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            required
          />
        </Field>
        {confirm.isError && (
          <ErrorBox>{errText(confirm.error, t('twoFactor.confirmFailed'))}</ErrorBox>
        )}
        <div className="flex gap-2">
          <Button type="submit" disabled={confirm.isPending || code.trim() === ''}>
            {confirm.isPending ? t('twoFactor.confirming') : t('twoFactor.confirmEnable')}
          </Button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border-strong px-4 py-2.5 font-medium text-fg-muted transition hover:text-fg-strong"
          >
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </section>
  )
}

function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const t = useT()
  const [saved, setSaved] = useState(false)

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-semibold text-success">✓ {t('twoFactor.enabled')}</h2>
        <p className="mt-1 text-sm text-fg-muted">
          {t('twoFactor.codesIntro')}
        </p>
      </div>

      <ul className="grid gap-1.5 rounded-lg border border-border bg-muted/40 p-3 font-mono text-sm sm:grid-cols-2">
        {codes.map((c) => (
          <li key={c} className="text-fg-strong select-all">
            {c}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(codes.join('\n'))}
          className="rounded-md border border-border-strong px-4 py-2.5 text-sm font-medium text-fg-muted transition hover:text-fg-strong"
        >
          {t('twoFactor.copyAll')}
        </button>
        <label className="flex items-center gap-2 text-sm text-fg">
          <input
            type="checkbox"
            checked={saved}
            onChange={(e) => setSaved(e.target.checked)}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          {t('twoFactor.codesSaved')}
        </label>
        {/* Gated on the checkbox on purpose: dismissing this panel is the last
            moment the codes exist anywhere readable. */}
        <Button onClick={onDone} disabled={!saved}>
          {t('twoFactor.done')}
        </Button>
      </div>
    </section>
  )
}

function Enabled({ left, onDisabled }: { left: number; onDisabled: () => void }) {
  const t = useT()
  const [password, setPassword] = useState('')
  const [confirming, setConfirming] = useState(false)

  const disable = useMutation({
    mutationFn: () => authApi.totpDisable(password),
    onSuccess: onDisabled,
  })

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-semibold text-fg-strong">
          {t('twoFactor.title')}{' '}
          <span className="ml-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
            {t('twoFactor.on')}
          </span>
        </h2>
        <p className="mt-1 text-sm text-fg-muted">
          {t('twoFactor.leftBefore')}{' '}
          <strong className={left === 0 ? 'text-danger' : 'text-fg-strong'}>
            {left}
          </strong>{' '}
          {t('twoFactor.leftAfter')}
          {left === 0 && t('twoFactor.noneLeft')}
        </p>
      </div>

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-md border border-danger/50 px-4 py-2.5 text-sm font-medium text-danger transition hover:bg-danger/10"
        >
          {t('twoFactor.disable')}
        </button>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            disable.mutate()
          }}
          className="space-y-3 rounded-lg border border-danger/40 bg-danger/5 p-4"
        >
          <p className="text-sm text-fg">
            {t('twoFactor.disableWarn')}
          </p>
          <Field label={t('twoFactor.currentPassword')}>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>
          {disable.isError && (
            <ErrorBox>{errText(disable.error, t('twoFactor.disableFailed'))}</ErrorBox>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={disable.isPending}
              className="rounded-md bg-danger px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {disable.isPending ? t('twoFactor.disabling') : t('twoFactor.disableShort')}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-md border border-border-strong px-4 py-2.5 text-sm font-medium text-fg-muted transition hover:text-fg-strong"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
