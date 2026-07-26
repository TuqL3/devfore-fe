import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { tokens } from "@/lib/tokens";
import { useAuth } from "@/context/AuthContext";

export default function AuthCallback() {
  const nav = useNavigate();
  const { refreshUser } = useAuth();
  const [error, setError] = useState("");
  const ran = useRef(false);

  const mut = useMutation({
    mutationFn: refreshUser,
    onSuccess: () => nav("/", { replace: true }),
    onError: () => {
      tokens.clear();
      setError("Không lấy được thông tin người dùng");
    },
  });

  // Google redirects here with tokens in the URL fragment. Parse once (StrictMode
  // double-invoke guarded by ran), store them, then load the user via mutation.
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const frag = new URLSearchParams(window.location.hash.slice(1));
    const access = frag.get("access_token");
    const refresh = frag.get("refresh_token");
    if (!access || !refresh) {
      setError("Thiếu token trong phản hồi");
      return;
    }
    tokens.set(access, refresh);
    mut.mutate();
  }, [mut]);

  return (
    <div className="flex min-h-screen items-center justify-center text-slate-400">
      {error ? (
        <div className="text-center">
          <p className="text-red-400">{error}</p>
          <a href="/login" className="text-violet-400 hover:underline">
            Về trang đăng nhập
          </a>
        </div>
      ) : (
        "Đang đăng nhập…"
      )}
    </div>
  );
}
