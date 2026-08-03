import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

/** A yes/no dialog for the things that cannot be undone: ending a container,
 *  handing a lab in. Rendered into body rather than in place — the tab content
 *  it sits under is animated with a transform, and a transformed ancestor
 *  becomes the containing block for position:fixed, which puts the backdrop
 *  over one column instead of the viewport. */
export function ConfirmModal({
  title,
  children,
  confirmLabel,
  cancelLabel = 'Huỷ',
  tone = 'accent',
  busy = false,
  onConfirm,
  onClose,
}: {
  title: string
  children: React.ReactNode
  confirmLabel: string
  cancelLabel?: string
  /** `danger` for the ones that throw work away. */
  tone?: 'accent' | 'danger'
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  // Focus lands on Cancel, not Confirm: a dialog that appears under a finger
  // already on Enter should not take that as a yes.
  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={() => !busy && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-2xl"
      >
        <h2 id="confirm-title" className="text-lg font-bold text-fg-strong">
          {title}
        </h2>
        <div className="mt-3 space-y-2 text-sm leading-relaxed text-fg-muted">
          {children}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            ref={cancelRef}
            onClick={onClose}
            disabled={busy}
            className="rounded-md px-4 py-2 text-sm text-fg-muted transition hover:text-fg-strong disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={
              'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition disabled:cursor-wait disabled:opacity-70 ' +
              (tone === 'danger'
                ? 'bg-danger hover:brightness-110'
                : 'bg-accent hover:bg-accent-hover')
            }
          >
            {busy && (
              <span
                aria-hidden="true"
                className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
              />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
