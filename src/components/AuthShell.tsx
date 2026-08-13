import { Link } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ArrowLeftIcon } from '@/components/icons'
import { useT } from '@/lib/i18n'

/**
 * Terminal chrome around a plain HTML form. The shell look is CSS only — the
 * fields stay real inputs with real autocomplete, so password managers, mobile
 * keyboards and browser validation keep working.
 */
export function AuthShell({
  cmd,
  children,
}: {
  /** Shown in the title bar and as the opening prompt line. */
  cmd: string
  children: React.ReactNode
}) {
  const t = useT()
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/4 h-96 w-[36rem] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl"
      />
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface shadow-2xl shadow-black/10 dark:shadow-black/50">
        <div className="flex items-center gap-2 border-b border-border bg-muted px-4 py-2.5">
          <span className="term-dot bg-red-400" />
          <span className="term-dot bg-amber-400" />
          <span className="term-dot bg-emerald-400" />
          <span className="ml-2 flex items-center gap-2 font-mono text-xs text-fg-muted">
            <Logo className="h-4 w-4" />
            devforge — {cmd}
          </span>
        </div>

        <div className="space-y-5 p-6">
          <p className="font-mono text-sm text-fg-muted">
            <span className="text-success">$</span> ./devforge {cmd}
          </p>
          {children}
        </div>

        {/* Kept inside the window: floating above the card it read as a stray
            link with nothing to anchor it. */}
        <Link
          to="/"
          className="flex items-center gap-1.5 border-t border-border bg-muted px-4 py-2.5 font-mono text-xs text-fg-muted transition hover:text-accent-soft"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          cd ~ <span className="text-fg-subtle"># {t('auth.backHome')}</span>
        </Link>
      </div>
    </div>
  )
}

/** Label rendered as a shell flag: `$ --user`. */
export function TermField({
  flag,
  hint,
  children,
}: {
  flag: string
  /** Node, not string: some hints are links ("quên?" next to the password). */
  hint?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-baseline justify-between gap-2 font-mono text-sm">
        <span className="text-accent-soft">--{flag}</span>
        {hint && <span className="text-xs text-fg-subtle"># {hint}</span>}
      </span>
      {children}
    </label>
  )
}

export function TermError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="font-mono text-sm text-danger">
      ✗ error: {children}
    </p>
  )
}

export function TermButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className="w-full rounded-md bg-accent px-4 py-2.5 font-mono font-semibold text-accent-fg transition hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
      {...props}
    >
      {children}
    </button>
  )
}

export function Divider({ text }: { text?: string }) {
  const t = useT()
  return (
    <div className="flex items-center gap-3 font-mono text-xs text-fg-subtle">
      <span className="h-px flex-1 bg-border" /># {text ?? t('common.or')}
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}
