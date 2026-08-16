
const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  status: number;
  /** Stable token from the server for cases where the status alone is ambiguous
   *  — an unverified account and a banned one are both 403 but lead to
   *  different screens. Absent on most errors. */
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type Options = {
  method?: string;
  body?: unknown;
  auth?: boolean; // refresh-and-retry on 401? default true
};

// FormData must go out untouched: the browser sets the multipart boundary, so
// this must never be JSON-encoded or given a Content-Type header.
const isForm = (b: unknown): b is FormData => b instanceof FormData;

// request = one HTTP call to the API. If it 401s, refresh once and retry.
// auth:false skips that for the refresh call itself (no point) and for public
// endpoints (a 401 there means something other than an expired token).
export async function request<T>(path: string, opts: Options = {}): Promise<T> {
  let res = await send(path, opts);
  if (res.status === 401 && opts.auth !== false && (await refresh())) {
    res = await send(path, opts);
  }
  return parse<T>(res);
}

function send(path: string, opts: Options): Promise<Response> {
  const headers: Record<string, string> = {};
  // The server answers errors in this language. Read per request, not captured
  // once: switching language mid-session must change the very next reply, and
  // this module is imported long before anyone picks one.
  headers["Accept-Language"] = "en";
  if (opts.body !== undefined && !isForm(opts.body))
    headers["Content-Type"] = "application/json";
  return fetch(BASE + path, {
    method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
    headers,
    // The session is two HttpOnly cookies this code cannot read, so every call
    // has to opt into sending them — including the cross-origin ones in dev.
    credentials: "include",
    body: isForm(opts.body)
      ? opts.body
      : opts.body !== undefined
        ? JSON.stringify(opts.body)
        : undefined,
  });
}

async function parse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T; // No Content
  const data = await res.json().catch(() => null);
  if (!res.ok)
    throw new ApiError(res.status, data?.error ?? `HTTP ${res.status}`, data?.code);
  return data as T;
}

// The refresh cookie goes up on its own and the replacement comes back the same
// way — nothing here to read or store.
//
// Sessions now rotate on every refresh, so two racing calls would burn each
// other's cookie and sign the user out. inFlight collapses them into the one
// request every caller awaits.
let inFlight: Promise<boolean> | null = null;

function refresh(): Promise<boolean> {
  inFlight ??= send("/api/auth/refresh", { method: "POST", auth: false })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}
