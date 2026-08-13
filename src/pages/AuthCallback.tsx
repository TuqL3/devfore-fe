import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useT } from "@/lib/i18n";

export default function AuthCallback() {
  const nav = useNavigate();
  const t = useT();
  const { refreshUser } = useAuth();
  const [error, setError] = useState("");
  const ran = useRef(false);

  // The server set the session cookies on the redirect, so there is nothing in
  // the URL to read — this page only has to find out who we now are.
  // Guarded by ran because StrictMode invokes effects twice in development.
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    refreshUser()
      .then(() => nav("/", { replace: true }))
      .catch(() => setError(t("auth.callbackFailed")));
  }, [refreshUser, nav, t]);

  return (
    <div className="flex min-h-screen items-center justify-center text-fg-muted">
      {error ? (
        <div className="text-center">
          <p className="text-danger">{error}</p>
          <a href="/login" className="text-accent-soft hover:underline">
            {t("auth.backToLogin")}
          </a>
        </div>
      ) : (
        t("auth.signingIn")
      )}
    </div>
  );
}
