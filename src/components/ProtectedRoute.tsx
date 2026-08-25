import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function ProtectedRoute({ adminOnly = false }: { adminOnly?: boolean }) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-fg-subtle">
        Loading…
      </div>
    );
  }
  // Mang theo chỗ họ đang muốn tới. Nav giờ hiện cả mấy mục cần đăng nhập, nên
  // "bấm Mô phỏng → đăng nhập → rơi về trang chủ" là đường đi thường xuyên chứ
  // không phải ca hiếm; không giữ lại thì người ta phải tự bấm lại lần nữa.
  if (!user)
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}
