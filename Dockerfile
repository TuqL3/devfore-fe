# syntax=docker/dockerfile:1

# ---------- build ----------
FROM node:22-alpine AS build
WORKDIR /src
# Empty on purpose, and not a build-arg. Vite bakes this value into the bundle,
# so any non-empty value makes the image environment-bound: the one built for
# staging can never be the one promoted to production, and "build once, promote
# many" turns into a label rather than a fact.
#
# Empty means every call goes out relative — src/lib/api.ts does fetch(BASE +
# "/api/...") and terminalURL resolves against location.origin — and the edge
# already routes /api, /ws and /uploads to the API on the same origin
# (deploy/nginx/devforge.conf in devforge-be). Same origin also means no CORS
# and no cross-subdomain cookie problem.
#
# It is an ENV rather than an ARG so there is nothing left to forget: Docker
# silently drops a build-arg a stage never declares, which is exactly how this
# file once shipped a production bundle pointing at http://localhost:8080.
ENV VITE_API_URL=""
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---------- dev ----------
FROM node:22-alpine AS dev
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ---------- runtime ----------
# nginx, not Caddy. The line here used to read "no nginx needed since Caddy is
# already the edge proxy" — true until devforge-be moved the edge to nginx, and
# what was left was a base image chosen for a reason that had expired.
#
# Trivy is what made that visible: caddy:2-alpine is the newest Caddy there is,
# and its binary still carries 17 HIGH CVEs from the Go modules it was built
# against, none of which this container can reach — it serves files. nginx:alpine
# has no Go binary to scan, so the finding goes away rather than being ignored,
# and the box already pulls this image for the edge.
FROM nginx:1.31-alpine AS prod
# Alpine publishes package fixes days or weeks before nginx rebuilds its image,
# and Trivy fails the build on any fixable HIGH (2026-10: libexpat, pcre2 in
# nginx:1.31-alpine). Upgrading here ships those fixes now. It also means two
# builds of the same commit can differ in patch versions — which is fine,
# because a release promotes the image dev ran rather than rebuilding it.
RUN apk upgrade --no-cache
COPY --from=build /src/dist /usr/share/nginx/html
COPY nginx.static.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
