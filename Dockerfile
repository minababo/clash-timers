# Build stage: install dependencies and build the static site.
# Node major matches .nvmrc.
FROM node:24.22.1-alpine3.24 AS build
WORKDIR /app

# Dependencies first, so this layer is reused until package files change.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Serve stage: unprivileged nginx (runs as a non-root user, listens on 8080).
FROM nginxinc/nginx-unprivileged:1.30.6-alpine3.24

LABEL org.opencontainers.image.title="Clash Timers" \
      org.opencontainers.image.description="Paste a Clash of Clans village export and track upgrade countdowns. Static site served by nginx." \
      org.opencontainers.image.source="https://github.com/minababo/clash-timers"

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/healthz"]
