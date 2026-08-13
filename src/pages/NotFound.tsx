import { Link, useLocation } from 'react-router-dom'

import { Card } from '@/components/ui'
import { SearchIcon } from '@/components/icons'
import { useT } from '@/lib/i18n'

/** Đường dẫn không khớp route nào.
 *
 *  Trước đó không có trang này: mọi URL sai — gõ nhầm, link cũ, trang đã gỡ —
 *  đều ra một khung trắng, thứ đọc như trang web hỏng chứ không như địa chỉ sai.
 *
 *  Nó nằm bên trong `Layout` (và bên trong `AdminLayout` cho nhánh quản trị) nên
 *  thanh điều hướng vẫn còn: người lạc đường cần đường ra, mà đường ra thì đã ở
 *  sẵn trên đầu màn hình.
 *
 *  `variant` chỉ đổi mấy cái link gợi ý. Người lạc trong khu quản trị không cần
 *  được mời về trang chủ.
 */
export function NotFound({ variant = 'site' }: { variant?: 'site' | 'admin' }) {
  const t = useT()
  const { pathname } = useLocation()

  const links =
    variant === 'admin'
      ? [
          { to: '/admin/dashboard', label: t('notFound.overview') },
          { to: '/admin/courses', label: t('nav.courses') },
          { to: '/admin/users', label: t('notFound.users') },
        ]
      : [
          { to: '/', label: t('footer.home') },
          { to: '/courses', label: t('nav.courses') },
          { to: '/sim', label: t('nav.sim') },
        ]

  return (
    <Card className="mx-auto max-w-lg px-6 py-14 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted text-fg-subtle">
        <SearchIcon className="h-5 w-5" />
      </span>
      <p className="mt-4 font-mono text-sm text-fg-subtle">404</p>
      <h1 className="mt-1 text-lg font-bold text-fg-strong">
        {t('notFound.title')}
      </h1>
      {/* In lại đúng đường dẫn: phần lớn lỗi loại này là gõ nhầm hoặc link cũ,
          và nhìn thấy nó là biết ngay sai ở đâu. */}
      <p className="mt-2 break-all font-mono text-xs text-fg-muted">{pathname}</p>
      <p className="mt-3 text-sm text-fg-muted">
        {t('notFound.body')}
      </p>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="rounded-md border border-border-strong px-3 py-1.5 text-sm text-fg transition hover:border-accent hover:text-fg-strong"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </Card>
  )
}
