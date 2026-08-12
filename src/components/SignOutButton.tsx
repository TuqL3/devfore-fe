import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { ApiError } from '@/lib/api'
import { ErrorBox } from '@/components/ui'
import { useT } from '@/lib/i18n'
import { AlertIcon, LogOutIcon } from '@/components/icons'

/**
 * Signing out used to be a bare onClick that swallowed its own errors: no
 * confirmation before it fired, nothing on screen while it ran, and silence
 * when it failed — the header just sat there still signed in.
 *
 * Both places that offer it now share this button, so the confirm step and the
 * pending and error states cannot drift apart between the header and /profile.
 */
export function SignOutButton({
  className,
  title,
  children,
}: {
  className: string
  title?: string
  children: ReactNode
}) {
  const { logout } = useAuth()
  const t = useT()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)

  const mut = useMutation({
    mutationFn: logout,
    // The cache is already cleared by then, so the current route would bounce
    // through ProtectedRoute anyway — going straight to /login skips the flash.
    onSuccess: () => {
      setOpen(false)
      nav('/login', { replace: true })
    },
  })

  // showModal() is what puts the dialog in the top layer and gives it the
  // backdrop, focus trap and Esc handling — the open attribute alone does not.
  useEffect(() => {
    const el = dialog.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  function ask() {
    mut.reset()
    setOpen(true)
  }

  return (
    <>
      <button onClick={ask} title={title} aria-label={title} className={className}>
        {children}
      </button>

      <dialog
        ref={dialog}
        // Esc closes the dialog natively; this keeps our state from drifting.
        onClose={() => setOpen(false)}
        aria-labelledby="signout-title"
        className={
          'm-auto w-[min(26rem,calc(100vw-2rem))] rounded-xl border border-border ' +
          'bg-surface p-0 text-fg backdrop:bg-black/50'
        }
      >
        <div className="space-y-4 p-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 rounded-full bg-danger/10 p-2 text-danger">
              <AlertIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 id="signout-title" className="font-semibold text-fg-strong">
                {t('signOut.title')}
              </h2>
              <p className="mt-1 text-sm text-fg-muted">
                {t('signOut.body')}
              </p>
            </div>
          </div>

          {mut.isError && (
            <ErrorBox>
              {mut.error instanceof ApiError
                ? mut.error.message
                : t('signOut.failed')}
            </ErrorBox>
          )}

          <div className="flex justify-end gap-3">
            {/* Cancel takes the initial focus: a stray Enter should not sign
                anyone out. */}
            <button
              autoFocus
              onClick={() => setOpen(false)}
              disabled={mut.isPending}
              className="rounded-md border border-border-strong px-4 py-2 font-medium text-fg transition hover:border-accent hover:text-accent-soft disabled:opacity-40"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={() => mut.mutate()}
              disabled={mut.isPending}
              className="inline-flex items-center gap-2 rounded-md bg-danger px-4 py-2 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <LogOutIcon className="h-4 w-4" />
              {mut.isPending ? t('signOut.pending') : t('menu.signOut')}
            </button>
          </div>
        </div>
      </dialog>
    </>
  )
}
