import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import { tokens } from "@/lib/tokens";
import type { AuthResponse, User } from "@/lib/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  setSession: (res: AuthResponse) => void;
  login: (login: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string,
  ) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

const ME = ["me"] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();

  // The current user IS the ['me'] query. Enabled only when a token exists;
  // staleTime Infinity means it hydrates once and then lives in the cache,
  // written directly by login/logout below.
  const { data, isLoading } = useQuery({
    queryKey: ME,
    queryFn: authApi.me,
    enabled: !!tokens.access(),
    retry: false,
    staleTime: Infinity,
  });
  const user = data ?? null;

  function setSession(res: AuthResponse) {
    tokens.set(res.access_token, res.refresh_token);
    qc.setQueryData(ME, res.user);
  }

  async function login(login: string, password: string) {
    setSession(await authApi.login({ login, password }));
  }

  async function register(username: string, email: string, password: string) {
    setSession(await authApi.register({ username, email, password }));
  }

  function logout() {
    tokens.clear();
    qc.setQueryData(ME, null);
  }

  // Fetch me() through the query so the result lands in the cache. Used after
  // the Google OAuth redirect, where the query started disabled (no token yet).
  async function refreshUser() {
    await qc.fetchQuery({ queryKey: ME, queryFn: authApi.me, staleTime: 0 });
  }

  const value: AuthState = {
    user,
    loading: isLoading,
    isAdmin: !!user?.roles?.includes("admin"),
    setSession,
    login,
    register,
    logout,
    refreshUser,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
