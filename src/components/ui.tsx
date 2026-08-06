import {
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
} from 'react'
import { AlertIcon, EyeIcon, EyeOffIcon } from '@/components/icons'
import { parseJsonObject } from '@/lib/json'

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

/** A JSON object typed by hand. The parsed value goes up to the form; the text
 *  being typed stays here, because `JSON.stringify(JSON.parse(x))` is not `x`
 *  and round-tripping every keystroke would rewrite the author's indentation
 *  under their cursor.
 *
 *  Broken JSON reports here and clears the value rather than sending it: the
 *  server would refuse it anyway, and the message it sends back arrives after a
 *  save the author thought had worked.
 *
 *  ponytail: a textarea, not an editor — this is one pasted object per lab, and
 *  a JSON editor is a dependency plus a bundle for a box used twice. */
export function JsonField({
  label,
  hint,
  value,
  onChange,
  rows = 8,
  placeholder,
}: {
  label: string
  hint?: string
  value: Record<string, unknown> | null
  onChange: (v: Record<string, unknown> | null) => void
  rows?: number
  placeholder?: string
}) {
  const [text, setText] = useState(() =>
    value ? JSON.stringify(value, null, 2) : '',
  )
  const [error, setError] = useState('')

  const edit = (next: string) => {
    setText(next)
    const { value, error } = parseJsonObject(next)
    setError(error)
    onChange(value)
  }

  return (
    <Field label={label} hint={error || hint}>
      <textarea
        rows={rows}
        spellCheck={false}
        value={text}
        onChange={(e) => edit(e.target.value)}
        placeholder={placeholder}
        className={
          'w-full resize-y rounded-md border bg-bg px-3 py-2.5 font-mono text-sm text-fg outline-none ' +
          'field-sizing-content max-h-[60vh] transition placeholder:text-fg-subtle ' +
          (error
            ? 'border-danger focus:ring-2 focus:ring-danger/25'
            : 'border-border-strong focus:border-accent focus:ring-2 focus:ring-accent/25')
        }
      />
    </Field>
  )
}

/** The raised surface every admin block sits on. One depth for the whole app:
 *  a card is `surface`, anything nested inside it stays `muted` and flat, so
 *  "is this a block or part of a block" reads without counting borders. */
export function Card({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={
        'rounded-xl border border-border bg-surface shadow-sm ' + className
      }
      {...props}
    />
  )
}

/** A number worth putting at the top of a screen: icon chip, label, the figure,
 *  and a short rule in the same hue. `tint` is a Tailwind colour name rather
 *  than a theme token — these four accents exist only here, and four one-off
 *  tokens would cost more than they explain.
 *  ponytail: literal classes, not `bg-${tint}-500/10` — Tailwind only ships
 *  classes it can see in the source. */
const TINTS = {
  amber: 'bg-amber-500/12 text-amber-600 dark:text-amber-400',
  emerald: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
  sky: 'bg-sky-500/12 text-sky-600 dark:text-sky-400',
  violet: 'bg-violet-500/12 text-violet-600 dark:text-violet-400',
} as const

const RULES = {
  amber: 'bg-amber-500',
  emerald: 'bg-emerald-500',
  sky: 'bg-sky-500',
  violet: 'bg-violet-500',
} as const

export function StatCard({
  label,
  value,
  icon: Icon,
  tint,
}: {
  label: string
  value: React.ReactNode
  icon: (p: { className?: string }) => React.ReactElement
  tint: keyof typeof TINTS
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <span
          className={'grid h-7 w-7 place-items-center rounded-md ' + TINTS[tint]}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-xs font-medium text-fg-muted">{label}</span>
      </div>
      <p className="mt-3 text-3xl font-bold tabular-nums text-fg-strong">
        {value}
      </p>
      <span
        className={'mt-2 block h-1 w-10 rounded-full ' + RULES[tint]}
        aria-hidden="true"
      />
    </Card>
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
