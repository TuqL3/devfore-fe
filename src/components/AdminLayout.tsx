import { NavLink, Outlet } from 'react-router-dom'

import {
  AlertIcon,
  BookIcon,
  ChartIcon,
  LayersIcon,
  ClockIcon,
  TerminalIcon,
  UsersIcon,
} from '@/components/icons'

type Section = {
  to: string
  label: string
  hint: string
  icon: (p: { className?: string }) => React.ReactElement
}

// Thứ tự là thứ tự cần biết, không phải thứ tự làm ra: cái gì đang chạy và
// đang hỏng trước, rồi nội dung nào hỏng, rồi mới tới sửa nội dung.
const SECTIONS: Section[] = [
  {
    to: '/admin/dashboard',
    label: 'Happening now',
    hint: 'live containers, system failures',
    icon: ChartIcon,
  },
  {
    to: '/admin/analysis',
    label: 'Analysis',
    hint: 'broken tasks, abandoned labs',
    icon: LayersIcon,
  },
  {
    to: '/admin/moderation',
    label: 'Moderation',
    hint: 'chat, public reports',
    icon: AlertIcon,
  },
  {
    to: '/admin/courses',
    label: 'Courses',
    hint: 'courses, labs and tasks',
    icon: BookIcon,
  },
  {
    to: '/admin/war-room',
    label: 'War Room',
    hint: 'drills and incident scenarios',
    icon: TerminalIcon,
  },
  {
    to: '/admin/users',
    label: 'Users',
    hint: 'accounts and roles',
    icon: UsersIcon,
  },
  {
    to: '/admin/audit',
    label: 'Audit log',
    hint: 'who did what, and when',
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
            Admin
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
