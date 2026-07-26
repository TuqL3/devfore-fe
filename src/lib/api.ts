import { tokens } from "./tokens";
import type { TokenPair } from "./types";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Options = {
  method?: string;
  body?: unknown;
  auth?: boolean; // attach access token? default true
};

// request = one HTTP call to the API. If it 401s and we have a refresh token,
// refresh once and retry. auth:false skips the token (login/public endpoints).
export async function request<T>(path: string, opts: Options = {}): Promise<T> {
  let res = await send(path, opts);
  if (res.status === 401 && opts.auth !== false && (await refresh())) {
    res = await send(path, opts);
  }
  return parse<T>(res);
}

function send(path: string, opts: Options): Promise<Response> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.auth !== false && tokens.access())
    headers.Authorization = `Bearer ${tokens.access()}`;
  return fetch(BASE + path, {
    method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}

async function parse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T; // No Content
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.error ?? `HTTP ${res.status}`);
  return data as T;
}

// refresh swaps the token pair. Returns false (and clears tokens) if there's no
// refresh token or the server rejects it — the caller then surfaces the 401.
// Concurrent refreshes are safe: the backend re-issues stateless JWTs, so two
// racing calls both get valid tokens (no rotation to invalidate each other).
async function refresh(): Promise<boolean> {
  if (!tokens.refresh()) return false;
  const res = await send("/api/auth/refresh", {
    body: { refresh_token: tokens.refresh() },
    auth: false,
  });
  if (!res.ok) {
    tokens.clear();
    return false;
  }
  const tp = (await res.json()) as TokenPair;
  tokens.set(tp.access_token, tp.refresh_token);
  return true;
}
