import {
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
} from 'react'
import { AlertIcon, EyeIcon, EyeOffIcon } from '@/components/icons'

export function Button({
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={
        'inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 ' +
        'font-medium text-accent-fg transition hover:bg-accent-hover ' +
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ' +
        'disabled:cursor-not-allowed disabled:opacity-60 ' +
        className
      }
      {...props}
    />
  )
}

/** `terminal` is the same field in monospace on a recessed surface — it follows
    the theme, a permanently dark box looked out of place on a light page. */
export type InputVariant = 'default' | 'terminal'

const VARIANTS: Record<InputVariant, string> = {
  default:
    'border-border-strong bg-bg text-fg placeholder:text-fg-subtle ' +
    'focus:border-accent focus:ring-2 focus:ring-accent/25',
  terminal:
    'border-border-strong bg-bg font-mono text-fg placeholder:text-fg-subtle ' +
    'focus:border-accent focus:ring-2 focus:ring-accent/25',
}

const inputClass = (v: InputVariant) =>
  'w-full rounded-md border px-3 py-2.5 outline-none transition ' + VARIANTS[v]

export function Input({
  className = '',
  variant = 'default',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { variant?: InputVariant }) {
  return <input className={inputClass(variant) + ' ' + className} {...props} />
}

/** Password field with a reveal toggle — typing a long password blind is a
    common reason people bounce off a signup form. */
export function PasswordInput({
  className = '',
  variant = 'default',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { variant?: InputVariant }) {
  const [shown, setShown] = useState(false)
  return (
    <div className="relative">
      <input
        type={shown ? 'text' : 'password'}
        className={inputClass(variant) + ' pr-11 ' + className}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShown(!shown)}
        title={shown ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        aria-label={shown ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        className={
          'absolute inset-y-0 right-0 flex items-center px-3 transition ' +
          'text-fg-subtle hover:text-fg-strong'
        }
      >
        {shown ? (
          <EyeOffIcon className="h-4 w-4" />
        ) : (
          <EyeIcon className="h-4 w-4" />
        )}
      </button>
    </div>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-fg">{label}</span>
        {hint && <span className="text-xs text-fg-subtle">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

export function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
    >
      <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  )
}
