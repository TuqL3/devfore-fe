# devforge-fe

SPA của [DevForge](../devforge-be/README.md) — Vite + React + TypeScript + Tailwind.
Repo này chỉ có frontend; API, database và toàn bộ phần triển khai nằm ở
`devforge-be`: `README.md` là nguồn sự thật cho kiến trúc, `INFRA.md` cho hạ tầng
và CI/CD.

## Chạy local

```bash
cp .env.example .env      # VITE_API_URL=http://localhost:8080
npm ci
npm run dev               # :5173
npx lefthook install      # git hook, 1 lần
```

Cần backend chạy song song: `cd ../devforge-be && make migrate && make air`.

## Kiểm trước khi push

```bash
npx tsc --noEmit && npx oxlint && npm run check
```

`npm run check` chạy 8 file assert bằng `node --experimental-strip-types`, không
framework. Cả tám đều nằm trong CI.

## Build và triển khai

Image `devforge-web` build trong GitHub Actions, quét bằng Trivy, đẩy lên GHCR
dưới `:sha-<short>`; tag `v*` đổi tên nó thành `:v1.2.0`. Repo này **không có job
deploy** — chỉ tồn tại một đường vào máy chủ và nó nằm ở `devforge-be`.

⚠️ `Dockerfile` ghim `ENV VITE_API_URL=""`, không phải `ARG`. Bundle vì thế không
mang môi trường nào trong người và mọi lời gọi đi ra tương đối, nên **một image
chạy được cả staging lẫn production**. Đừng biến nó lại thành build-arg: giá trị
bake vào sẽ khoá image vào một môi trường, và đúng lớp lỗi đó từng đẩy một bản
production gọi vào `http://localhost:8080`.

Chi tiết: `devforge-be/INFRA.md` §8 (CI/CD) và §9.1.1 (vì sao cùng origin).
