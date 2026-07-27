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
  updateProfile: (input: {
    username: string;
    email: string;
    avatar_url?: string;
  }) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  changePassword: (current: string, next: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
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

  // The response is the updated user, so write it straight into the cache
  // instead of triggering another GET /api/me.
  async function updateProfile(input: {
    username: string;
    email: string;
    avatar_url?: string;
  }) {
    qc.setQueryData(ME, await authApi.updateMe(input));
  }

  async function uploadAvatar(file: File) {
    qc.setQueryData(ME, await authApi.uploadAvatar(file));
  }

  async function changePassword(current: string, next: string) {
    await authApi.changePassword({
      current_password: current,
      new_password: next,
    });
  }

  // The account is gone server-side, so the local session must go too.
  async function deleteAccount(password: string) {
    await authApi.deleteMe({ password });
    logout();
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
    updateProfile,
    uploadAvatar,
    changePassword,
    deleteAccount,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
