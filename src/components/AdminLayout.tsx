import { NavLink, Outlet } from 'react-router-dom'

import { BookIcon, ChartIcon, ClockIcon, UsersIcon } from '@/components/icons'

type Section = {
  to: string
  label: string
  hint: string
  icon: (p: { className?: string }) => React.ReactElement
}

const SECTIONS: Section[] = [
  {
    to: '/admin/dashboard',
    label: 'Tổng quan',
    hint: 'số liệu học viên, lượt làm lab',
    icon: ChartIcon,
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
  },
  {
    to: '/admin/audit',
    label: 'Nhật ký',
    hint: 'ai làm gì, lúc nào',
    icon: ClockIcon,
  },
]

/** Frame around every admin screen: the sections on the left, the screen on the
 *  right. One layout rather than a header repeated per page, so adding the next
 *  section is a route plus one entry above. */
export default function AdminLayout() {
  return (
    <div className="mx-auto flex max-w-7xl gap-6 px-4 py-8">
      {/* The nav is a card like every other block, and it sticks: the course
          list is long enough that scrolling to it should not scroll away the
          way back out. */}
      <aside className="hidden w-56 shrink-0 lg:block">
        <div className="sticky top-8 rounded-xl border border-border bg-surface p-2 shadow-sm">
          <p className="px-3 pt-1 pb-2 font-mono text-xs uppercase tracking-wide text-fg-subtle">
            Quản trị
          </p>
          <nav className="space-y-1">
            {SECTIONS.map((s) => (
              <SectionLink key={s.to} section={s} />
            ))}
          </nav>
        </div>
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
  const { icon: Icon, label, hint, to } = section

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ' +
        (compact ? 'shrink-0 whitespace-nowrap ' : '') +
        (isActive
          ? 'bg-accent font-medium text-accent-fg shadow-sm'
          : 'text-fg-muted hover:bg-muted hover:text-fg-strong')
      }
    >
      {({ isActive }) => (
        <>
          <Icon className="h-4 w-4 shrink-0" />
          <span className="min-w-0">
            <span className="block truncate">{label}</span>
            {!compact && (
              <span
                className={
                  'block text-xs ' +
                  (isActive ? 'text-accent-fg/75' : 'text-fg-subtle')
                }
              >
                {hint}
              </span>
            )}
          </span>
        </>
      )}
    </NavLink>
  )
}
