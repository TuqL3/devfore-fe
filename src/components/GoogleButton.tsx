import { authApi } from "@/api/auth";

export function GoogleButton() {
  return (
    <a
      href={authApi.googleUrl()}
      className="flex w-full items-center justify-center gap-2 rounded-md border border-border-strong bg-bg px-4 py-2.5 font-mono text-sm text-fg transition hover:border-accent hover:bg-muted"
    >
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path
          fill="#FFC107"
          d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 8.1 29.3 6 24 6 14.1 6 6 14.1 6 24s8.1 18 18 18 18-8.1 18-18c0-1.2-.1-2.3-.4-3.5z"
        />
        <path
          fill="#FF3D00"
          d="M8.3 14.7l6.6 4.8C16.7 15.1 20 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 8.1 29.3 6 24 6 16.3 6 9.7 10.3 8.3 14.7z"
        />
        <path
          fill="#4CAF50"
          d="M24 42c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 32.9 26.7 34 24 34c-5.2 0-9.6-3.3-11.2-8l-6.5 5C7.7 37.6 15.3 42 24 42z"
        />
        <path
          fill="#1976D2"
          d="M43.6 20.5H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.4l6.2 5.2C41.1 36 44 30.5 44 24c0-1.2-.1-2.3-.4-3.5z"
        />
      </svg>
      auth --provider google
    </a>
  );
}
