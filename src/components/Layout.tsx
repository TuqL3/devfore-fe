import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useChat } from '@/context/ChatContext'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Logo } from '@/components/Logo'
import { RouteProgress } from '@/components/RouteProgress'
import { UserMenu } from '@/components/UserMenu'
import {
  BookIcon,
  ClockIcon,
  LayersIcon,
  TerminalIcon,
  UsersIcon,
} from '@/components/icons'
import { useLevels } from '@/lib/levels'

function navClass({ isActive }: { isActive: boolean }) {
  return (
    // whitespace-nowrap: "Khoá học", "Mô phỏng", "War Room" đều có dấu cách, và
    // khi thanh nav chật thì chúng xuống dòng thành hai hàng chữ trong một ô cao
    // 14 — đọc ra là vỡ bố cục. Thà cả hàng nav tràn ngang rồi thu gọn ở màn hẹp
    // còn hơn từng mục tự gãy đôi.
    'flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition ' +
    (isActive
      ? 'bg-muted font-medium text-fg-strong'
      : 'text-fg-muted hover:bg-muted hover:text-fg-strong')
  )
}

/** Một mục nav: icon luôn hiện, chữ chỉ hiện khi đủ rộng.
 *
 *  Đó là cách hàng nav vừa mà không cần thanh cuộn và không xuống dòng. Icon
 *  không đứng một mình về mặt ngữ nghĩa: `title` và nhãn cho trình đọc màn hình
 *  vẫn nói đủ tên, kể cả lúc chữ bị ẩn. */
function NavItem({
  to,
  label,
  icon,
}: {
  to: string
  label: string
  icon: React.ReactNode
}) {
  return (
    <NavLink to={to} className={navClass} title={label}>
      {icon}
      <span className="hidden lg:inline">{label}</span>
      <span className="sr-only lg:hidden">{label}</span>
    </NavLink>
  )
}

/** The chat link, carrying the count of unread direct messages.
 *
 *  Direct only. The shared room is everybody's traffic, and a badge that ticks
 *  up every time anyone says anything is a badge people learn to ignore. */
function ChatLink() {
  const { dmUnread } = useChat()
  return (
    <NavLink to="/chat" className={navClass} title="Chat">
      <span className="relative">
        <UsersIcon className="h-4 w-4" />
        {dmUnread > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1.5 -right-2 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-fg"
          >
            {dmUnread > 9 ? '9+' : dmUnread}
          </span>
        )}
      </span>
      {/* Cùng luật với NavItem: chữ ẩn ở màn hẹp, icon và huy hiệu ở lại. */}
      <span className="hidden lg:inline">Chat</span>
      <span className="sr-only lg:hidden">Chat</span>
      {dmUnread > 0 && (
        <span className="sr-only">{dmUnread} tin nhắn chưa đọc</span>
      )}
    </NavLink>
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
          {/* Không cuộn, không xuống dòng: chữ của từng mục tự ẩn ở màn hẹp và
              chỉ còn icon (xem `NavItem`), nên hàng này luôn vừa. Thanh cuộn ở
              header là thứ người ta không tìm thấy — nó nằm dưới đáy một dải cao
              14 mà mắt đang nhìn chỗ khác. */}
          <div className="flex items-center gap-1 sm:gap-2 lg:gap-4">
            <Link to="/" className="flex shrink-0 items-center gap-2.5">
              <Logo className="h-8 w-8 shrink-0" />
              <span className="text-lg font-bold tracking-tight text-fg-strong">
                Dev<span className="text-accent-soft">Forge</span>
              </span>
            </Link>
            <NavItem to="/courses" label="Khoá học" icon={<BookIcon className="h-4 w-4" />} />
            {/* Hiện cả khi chưa đăng nhập. Giấu đi thì khách không biết trang
                này có gì, và "đăng ký để dùng cái gì?" là câu không ai trả lời
                được từ một thanh nav trống. Bấm vào thì `ProtectedRoute` đưa
                sang /login rồi quay lại đúng đây. */}
            <NavItem to="/history" label="Lịch sử" icon={<ClockIcon className="h-4 w-4" />} />
            {/* Trình mô phỏng không thuộc khoá nào, nên nó là mục riêng chứ
                không nằm trong Khoá học — khoá học để dạy, chỗ này để nghịch. */}
            <NavItem to="/sim" label="Mô phỏng" icon={<LayersIcon className="h-4 w-4" />} />
            {/* Thử thách có hạn giờ, không thuộc khoá nào và không cần đăng ký
                — nên nó đứng cạnh Mô phỏng, không nằm trong Khoá học. */}
            <NavItem
              to="/war-room"
              label="War Room"
              icon={<TerminalIcon className="h-4 w-4" />}
            />
            <ChatLink />
            {/* Quản trị không ở đây: nó nằm trong menu tài khoản. Thanh nav là
                chỗ của những gì mọi người dùng hằng ngày, còn màn quản trị là
                thứ một người mở vài lần một tuần. */}
          </div>
          {/* shrink-0: phần tài khoản là thứ cuối cùng được phép co. Hàng nav
              bên trái trượt ngang được, khối này thì không — tên và nút đăng
              xuất bị bóp là hỏng hẳn. */}
          <div className="flex shrink-0 items-center gap-2 text-sm">
            {user ? (
              // Hồ sơ, quản trị, giao diện và đăng xuất gom vào một menu: cả
              // bốn đều là thứ bấm một lần rồi thôi, nên chúng không đáng chiếm
              // chỗ thường trực của phần điều hướng.
              <UserMenu user={user} isAdmin={isAdmin} />
            ) : (
              <>
                {/* Khách chưa đăng nhập không có menu tài khoản, nên nút đổi
                    giao diện phải ở ngoài — nếu không họ không đổi được. */}
                <ThemeToggle />
                <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
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
