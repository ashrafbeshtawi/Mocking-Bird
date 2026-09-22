# syntax=docker/dockerfile:1.7

# ---- deps: install node_modules ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build: compile Next.js (standalone output) ----
FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* values are inlined into the client bundle at build time, so they
# must be passed as build args (CI: GitHub repository variables). Not secrets —
# the Cloudinary cloud name + unsigned upload preset ship in the browser anyway.
ARG NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
ARG NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
# `next build` imports the API route modules to collect page data, and src/lib/db.ts
# fails fast when DATABASE_STRING is unset. No connection is opened at build time;
# this placeholder only lives in the build stage.
ENV DATABASE_STRING=postgresql://build:build@localhost:5432/build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- runtime: minimal image with only the standalone bundle ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S app && adduser -S app -G app

# Standalone server (+ the traced node_modules it needs, incl. `pg`), static assets, public folder.
COPY --from=build --chown=app:app /app/public ./public
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static

# SQL migrations + runner, applied by the entrypoint on every start (idempotent).
COPY --from=build --chown=app:app /app/migrations ./migrations
COPY --from=build --chown=app:app /app/scripts/migrate.js ./scripts/migrate.js

COPY --chown=app:app docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER app
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
