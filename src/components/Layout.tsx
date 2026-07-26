import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

function navClass({ isActive }: { isActive: boolean }) {
  return isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
}

export default function Layout() {
  const { user, isAdmin, logout } = useAuth()
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-lg font-bold text-violet-400">
              DevForge
            </Link>
            <NavLink to="/courses" className={navClass}>
              Khoá học
            </NavLink>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {user ? (
              <>
                <span className="text-slate-400">
                  {user.username}
                  {isAdmin && <span className="text-violet-400"> (admin)</span>}
                </span>
                <button onClick={logout} className="text-slate-400 hover:text-slate-200">
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-slate-400 hover:text-slate-200">
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="rounded-md bg-violet-600 px-3 py-1.5 font-medium text-white hover:bg-violet-500"
                >
                  Đăng ký
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10">
        <Outlet />
      </main>
    </div>
  )
}
