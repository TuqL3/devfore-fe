import { NavLink, Outlet } from 'react-router-dom'

import { BookIcon, ChartIcon, UsersIcon } from '@/components/icons'

type Section = {
  to: string
  label: string
  hint: string
  icon: (p: { className?: string }) => React.ReactElement
  /** Sections without a screen yet. Shown, but not linked: hiding them loses the
   *  shape of the admin area, and linking them promises a page that 404s. */
  soon?: boolean
}

const SECTIONS: Section[] = [
  {
    to: '/admin/dashboard',
    label: 'Tổng quan',
    hint: 'số liệu học viên, lượt làm lab',
    icon: ChartIcon,
    soon: true,
  },
  {
    to: '/admin/courses',
    label: 'Khoá học',
    hint: 'khoá, lab và nhiệm vụ',
    icon: BookIcon,
  },
  {
    to: '/admin/users',
    label: 'Người dùng',
    hint: 'tài khoản, phân quyền',
    icon: UsersIcon,
    soon: true,
  },
]

/** Frame around every admin screen: the sections on the left, the screen on the
 *  right. One layout rather than a header repeated per page, so adding the next
 *  section is a route plus one entry above. */
export default function AdminLayout() {
  return (
    <div className="mx-auto flex max-w-7xl gap-6 px-4 py-8">
      <aside className="hidden w-56 shrink-0 lg:block">
        <p className="px-3 pb-2 font-mono text-xs uppercase tracking-wide text-fg-subtle">
          Quản trị
        </p>
        <nav className="space-y-1">
          {SECTIONS.map((s) => (
            <SectionLink key={s.to} section={s} />
          ))}
        </nav>
      </aside>

      {/* Same list on narrow screens, as a scrolling row above the content. */}
      <div className="min-w-0 flex-1">
        <nav className="mb-4 flex gap-2 overflow-x-auto lg:hidden">
          {SECTIONS.map((s) => (
            <SectionLink key={s.to} section={s} compact />
          ))}
        </nav>
        <Outlet />
      </div>
    </div>
  )
}

function SectionLink({
  section,
  compact = false,
}: {
  section: Section
  compact?: boolean
}) {
  const { icon: Icon, label, hint, soon, to } = section

  if (soon) {
    return (
      <span
        title="chưa làm"
        aria-disabled="true"
        className={
          'flex cursor-not-allowed items-center gap-2.5 rounded-md px-3 py-2 text-sm text-fg-subtle ' +
          (compact ? 'shrink-0 whitespace-nowrap' : '')
        }
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="min-w-0">
          <span className="block truncate">{label}</span>
          {!compact && <span className="block text-xs">sắp có</span>}
        </span>
      </span>
    )
  }

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition ' +
        (compact ? 'shrink-0 whitespace-nowrap ' : '') +
        (isActive
          ? 'bg-muted font-medium text-fg-strong'
          : 'text-fg-muted hover:bg-muted hover:text-fg-strong')
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0">
        <span className="block truncate">{label}</span>
        {!compact && <span className="block text-xs text-fg-subtle">{hint}</span>}
      </span>
    </NavLink>
  )
}
