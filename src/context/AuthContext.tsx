import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import { ApiError } from "@/lib/api";
import { isMFAChallenge } from "@/lib/types";
import type { MFAChallenge, User } from "@/lib/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  setSession: (user: User) => void;
  /** Resolves to a challenge when the account has a second factor, and to null
   *  when the password alone was enough and the session is already live. The
   *  caller has to handle both — a challenge is not a session. */
  login: (login: string, password: string) => Promise<MFAChallenge | null>;
  /** Second half of a two-factor login. Creates the session. */
  loginMFA: (challenge: string, code: string) => Promise<void>;
  /** Entering the signup code is what creates the session — registering alone
   *  does not, so that step lives here and register() does not. */
  verifyEmail: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutEverywhere: () => Promise<void>;
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

  // The current user IS the ['me'] query. It always runs now: the session is a
  // cookie this code cannot see, so asking the server is the only way to find
  // out whether anyone is signed in. Login/logout write the cache directly; the
  // staleTime keeps that from costing a request on every mount.
  //
  // It still has to re-ask on focus, because the session can die on someone
  // else's screen — revoked from another device, or logged out everywhere — and
  // this tab would otherwise keep rendering a signed-in UI off a cache no
  // request ever contradicts.
  const { data, isLoading, error } = useQuery({
    queryKey: ME,
    queryFn: authApi.me,
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
  // react-query keeps the last good data on error, which is right for a flaky
  // network and wrong for a 401: that one is the server saying the session is
  // gone, so it must win over the cache.
  const user =
    error instanceof ApiError && error.status === 401 ? null : (data ?? null);

  function setSession(u: User) {
    qc.setQueryData(ME, u);
  }

  async function login(login: string, password: string) {
    const out = await authApi.login({ login, password });
    if (isMFAChallenge(out)) return out;
    setSession(out);
    return null;
  }

  async function loginMFA(challenge: string, code: string) {
    setSession(await authApi.loginMFA({ challenge, code }));
  }

  async function verifyEmail(email: string, code: string) {
    setSession(await authApi.verifyEmail({ email, code }));
  }

  // Only the server can clear an HttpOnly cookie, so signing out is a request,
  // not a local delete — and the cache is cleared only once that request lands.
  // Clearing it on failure would show a signed-out UI while the cookies, and
  // therefore the session, are still very much alive.
  async function logout() {
    await authApi.logout();
    qc.setQueryData(ME, null);
  }

  // Drops the sessions on every other device too — the "I left myself logged in
  // somewhere" path. Same rule: the cache follows the server, not the click.
  async function logoutEverywhere() {
    await authApi.logoutAll();
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

  // The account is gone server-side and its sessions went with it, so there is
  // nothing left to revoke — only the cache to clear.
  async function deleteAccount(password: string) {
    await authApi.deleteMe({ password });
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
    loginMFA,
    verifyEmail,
    logout,
    logoutEverywhere,
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
