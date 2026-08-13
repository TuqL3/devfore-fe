import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { Avatar } from '@/components/Avatar'
import { SignOutButton } from '@/components/SignOutButton'
import { ChartIcon, LogOutIcon, UsersIcon } from '@/components/icons'
import { useT } from '@/lib/i18n'
import type { User } from '@/lib/types'

/** Menu tài khoản: hồ sơ, quản trị, giao diện, đăng xuất.
 *
 *  Bốn thứ này trước nằm rải trên thanh nav và ăn mất chỗ của phần điều hướng
 *  thật. Chúng có chung một điểm: **không ai bấm chúng nhiều lần trong một
 *  phiên**. Đổi giao diện là việc làm một lần rồi quên; mở trang quản trị cũng
 *  vậy. Thứ dùng thường xuyên thì để ngoài, thứ dùng một lần thì để sau một cú
 *  bấm — đó là cách hàng nav có chỗ cho Khoá học, Lịch sử, Mô phỏng, War Room và
 *  Chat mà không cần thanh cuộn. */
export function UserMenu({ user, isAdmin }: { user: User; isAdmin: boolean }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()
  const t = useT()

  // Đổi trang là đóng. Không có dòng này thì bấm "Quản trị" xong menu vẫn treo
  // trên trang mới, che đúng chỗ vừa mở ra.
  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    function onDown(e: PointerEvent) {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    // pointerdown chứ không phải click: bấm ra ngoài phải đóng ngay lúc ngón tay
    // chạm xuống, không đợi nhả ra.
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-lg border border-border bg-surface p-1 transition hover:border-accent sm:pr-3"
      >
        <Avatar user={user} />
        <span className="hidden text-sm text-fg sm:inline">
          {user.username}
          {isAdmin && (
            <span className="ml-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase text-accent-soft">
              admin
            </span>
          )}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-lg border border-border bg-surface shadow-lg"
        >
          <Link
            to="/profile"
            role="menuitem"
            className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-fg transition hover:bg-muted hover:text-fg-strong"
          >
            <UsersIcon className="h-4 w-4 text-fg-subtle" />
            {t('menu.profile')}
          </Link>

          {isAdmin && (
            <Link
              to="/admin"
              role="menuitem"
              className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-fg transition hover:bg-muted hover:text-fg-strong"
            >
              <ChartIcon className="h-4 w-4 text-fg-subtle" />
              {t('menu.admin')}
            </Link>
          )}

          {/* Giao diện không ở đây: nó là cài đặt của người dùng, nên nó nằm
              trong Hồ sơ → Thông tin, cạnh tên và ảnh đại diện. Menu này chỉ
              chứa những chỗ để đi tới. */}

          <div className="border-t border-border">
            <SignOutButton
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-fg-muted transition hover:bg-muted hover:text-danger"
            >
              <LogOutIcon className="h-4 w-4" />
              {t('menu.signOut')}
            </SignOutButton>
          </div>
        </div>
      )}
    </div>
  )
}
