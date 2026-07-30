import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Logo } from '@/components/Logo'
import { RouteProgress } from '@/components/RouteProgress'
import { Avatar } from '@/components/Avatar'
import { SignOutButton } from '@/components/SignOutButton'
import { BookIcon, LogOutIcon } from '@/components/icons'
import { useLevels } from '@/lib/levels'

function navClass({ isActive }: { isActive: boolean }) {
  return (
    'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition ' +
    (isActive
      ? 'bg-muted font-medium text-fg-strong'
      : 'text-fg-muted hover:bg-muted hover:text-fg-strong')
  )
}

export default function Layout() {
  const { user, isAdmin } = useAuth()
  const { pathname } = useLocation()

  // BrowserRouter keeps the old scroll offset across navigations; a new page
  // should start at the top.
  // Braces matter: a concise arrow would return scrollTo's value and React
  // would treat it as a cleanup function.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div id="top" className="flex min-h-screen flex-col">
      <RouteProgress />
      <header className="sticky top-0 z-40 border-b border-border bg-bg">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2 sm:gap-6">
            <Link to="/" className="flex items-center gap-2.5">
              <Logo className="h-8 w-8 shrink-0" />
              <span className="text-lg font-bold tracking-tight text-fg-strong">
                Dev<span className="text-accent-soft">Forge</span>
              </span>
            </Link>
            <NavLink to="/courses" className={navClass}>
              <BookIcon className="h-4 w-4" />
              Khoá học
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin" className={navClass}>
                Quản trị
              </NavLink>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <ThemeToggle />
            <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
            {user ? (
              <>
                <Link
                  to="/profile"
                  className="flex items-center gap-2 rounded-lg border border-border bg-surface py-1 pl-1 pr-1 transition hover:border-accent sm:pr-3"
                >
                  <Avatar user={user} />
                  <span className="hidden text-fg sm:inline">
                    {user.username}
                    {isAdmin && (
                      <span className="ml-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase text-accent-soft">
                        admin
                      </span>
                    )}
                  </span>
                </Link>
                <SignOutButton
                  title="Đăng xuất"
                  className="rounded-md p-2 text-fg-subtle transition hover:bg-muted hover:text-danger"
                >
                  <LogOutIcon className="h-4 w-4" />
                </SignOutButton>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-md px-3 py-1.5 text-fg-muted transition hover:bg-muted hover:text-fg-strong"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="rounded-md bg-accent px-3 py-1.5 font-medium text-accent-fg transition hover:bg-accent-hover"
                >
                  Đăng ký
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>
      <main key={pathname} className="page-enter mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <Outlet />
      </main>
      <Footer loggedIn={!!user} />
    </div>
  )
}

function FooterCol({
  label,
  title,
  links,
}: {
  label: string
  title: string
  links: { to: string; text: string }[]
}) {
  return (
    <div>
      <p className="font-mono text-xs text-fg-subtle">// {label}</p>
      <h3 className="mt-1 font-semibold text-fg-strong">{title}</h3>
      <ul className="mt-2 space-y-1.5 text-sm">
        {links.map((l) => (
          <li key={l.to + l.text}>
            <Link to={l.to} className="text-fg-muted hover:text-accent-soft">
              {l.text}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Footer({ loggedIn }: { loggedIn: boolean }) {
  const { levels } = useLevels()
  return (
    <footer className="mt-12 border-t border-border bg-bg">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link to="/" className="flex items-center gap-2.5">
            <Logo className="h-8 w-8 shrink-0" />
            <span className="text-lg font-bold tracking-tight text-fg-strong">
              Dev<span className="text-accent-soft">Forge</span>
            </span>
          </Link>
          <p className="mt-2 text-sm text-fg-muted">
            Học DevOps bằng lab thực hành trên container Linux thật, chạy ngay
            trong trình duyệt.
          </p>
        </div>

        <FooterCol
          label="content"
          title="Nội dung"
          links={[
            { to: '/', text: 'Trang chủ' },
            { to: '/courses', text: 'Tất cả khoá học' },
          ]}
        />
        <FooterCol
          label="levels"
          title="Trình độ"
          links={levels.map((l) => ({
            to: `/courses?level=${l.slug}`,
            text: l.label,
          }))}
        />
        <FooterCol
          label="account"
          title="Tài khoản"
          links={
            loggedIn
              ? [
                  { to: '/profile', text: 'Hồ sơ' },
                  { to: '/courses', text: 'Khoá học' },
                ]
              : [
                  { to: '/login', text: 'Đăng nhập' },
                  { to: '/register', text: 'Đăng ký' },
                ]
          }
        />
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 font-mono text-xs text-fg-muted">
          <span>
            <span className="text-success">$</span> echo &quot;©{' '}
            {new Date().getFullYear()} DevForge&quot;
          </span>
          <a href="#top" className="hover:text-accent-soft">
            <span className="text-success">$</span> cd ~ <span>↑</span>
          </a>
        </div>
      </div>
    </footer>
  )
}
