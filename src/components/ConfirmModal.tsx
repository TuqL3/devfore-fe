import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/** Khung chung của mọi hộp thoại: nền mờ, thoát bằng Escape hoặc bấm ra ngoài.
 *
 *  Vẽ vào `body` chứ không vẽ tại chỗ — nội dung tab bên dưới có animation dùng
 *  `transform`, mà một tổ tiên đã transform sẽ trở thành khối chứa của
 *  `position: fixed`, khiến nền mờ chỉ phủ một cột thay vì cả màn hình. */
function Modal({
  title,
  titleID,
  busy,
  onClose,
  children,
}: {
  title: string
  titleID: string
  busy: boolean
  onClose: () => void
  children: React.ReactNode
}) {
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
        aria-labelledby={titleID}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-2xl"
      >
        <h2 id={titleID} className="text-lg font-bold text-fg-strong">
          {title}
        </h2>
        {children}
      </div>
    </div>,
    document.body,
  )
}

/** A yes/no dialog for the things that cannot be undone: ending a container,
 *  handing a lab in. */
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

  return (
    <Modal title={title} titleID="confirm-title" busy={busy} onClose={onClose}>
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
    </Modal>
  )
}

/** Hỏi một dòng chữ. Thay cho `prompt()` của trình duyệt, thứ hiện ra kèm dòng
 *  "localhost:5173 cho biết" và không theo giao diện của trang.
 *
 *  Khác `ConfirmModal` ở chỗ focus: ở đây con trỏ vào thẳng ô nhập và Enter là
 *  đồng ý — người dùng mở hộp này ra để gõ, không phải để cân nhắc. */
export function PromptModal({
  title,
  label,
  hint,
  initialValue = '',
  confirmLabel = 'Lưu',
  placeholder,
  onConfirm,
  onClose,
}: {
  title: string
  label: string
  /** Một dòng dưới ô nhập, tính theo cái đang gõ — ví dụ "sẽ ghi đè mẫu cùng tên". */
  hint?: (value: string) => string
  initialValue?: string
  confirmLabel?: string
  placeholder?: string
  onConfirm: (value: string) => void
  onClose: () => void
}) {
  const [value, setValue] = useState(initialValue)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])

  const trimmed = value.trim()
  const note = hint?.(trimmed) ?? ''

  return (
    <Modal title={title} titleID="prompt-title" busy={false} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (trimmed) onConfirm(trimmed)
        }}
      >
        <label className="mt-3 block space-y-1.5">
          <span className="text-sm text-fg-muted">{label}</span>
          <input
            ref={ref}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-md border border-border-strong bg-bg px-3 py-2.5 text-fg outline-none transition placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
        </label>
        {note && <p className="mt-1.5 text-xs text-fg-subtle">{note}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm text-fg-muted transition hover:text-fg-strong"
          >
            Huỷ
          </button>
          <button
            type="submit"
            disabled={!trimmed}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  )
}
