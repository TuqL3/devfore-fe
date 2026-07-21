# syntax=docker/dockerfile:1

# ---------- build ----------
FROM node:22-alpine AS build
WORKDIR /src
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
# Caddy serves the SPA; no nginx needed since Caddy is already the edge proxy.
FROM caddy:2-alpine AS prod
COPY --from=build /src/dist /srv
COPY Caddyfile.static /etc/caddy/Caddyfile
EXPOSE 80
