# devforge-fe

SPA của [DevForge](../devforge-be/README.md) — Vite + React + TypeScript + Tailwind.
Repo này chỉ có frontend; API và database nằm ở `devforge-be`, và `README.md` ở đó
là nguồn sự thật cho kiến trúc.

> **DevOps đang dựng lại từ đầu.** Dockerfile, CI và cấu hình liên quan đã gỡ ngày
> 2026-10-07; bản cũ ở tag `devops-reference` (`git show devops-reference:Dockerfile`).

## Chạy local

```bash
cp .env.example .env      # VITE_API_URL=http://localhost:8080
npm ci
npm run dev               # :5173
```

Cần backend chạy song song — xem `devforge-be/README.md` §12.

## Kiểm trước khi push

```bash
npx tsc --noEmit && npx oxlint && npm run check
```

`npm run check` chạy 8 file assert bằng `node --experimental-strip-types`, không
framework. Chưa có CI: chạy tay trước khi push.
