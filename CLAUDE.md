# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mockingbird is a social media automation platform for cross-posting content from Facebook to Twitter/X, Instagram, and Telegram. It provides analytics, scheduling, and AI-powered content transformation. Single Next.js 15 application (not a monorepo).

## Commands

```bash
npm run dev              # Dev server with Turbopack
npm run dev:https        # HTTPS dev server (uses cert/ directory)
npm run build            # Production build
npm run start            # Production server
npm run lint             # ESLint
npm run migrate          # Run PostgreSQL migrations from migrations/
npx jest                 # Run all tests
npx jest tests/path.test.ts  # Run a single test
```

## Tech Stack

- **Framework:** Next.js 15 (App Router) with React 19 and TypeScript 5 (strict mode)
- **UI:** Material-UI 7 + Tailwind CSS v4
- **Database:** PostgreSQL via `pg` driver (no ORM)
- **Auth:** NextAuth v5 beta (JWT strategy, Google/GitHub/Discord OAuth)
- **Media:** Cloudinary for upload/processing
- **AI:** OpenAI and Claude for content transformation
- **Testing:** Jest + ts-jest + React Testing Library
- **Path alias:** `@/*` maps to `./src/*`

## Architecture

### App Router Structure (`src/app/`)
- `middleware.ts` — Protects routes via NextAuth JWT, injects `x-user-id` header into API requests
- `api/` — Backend API routes organized by domain: `publish/`, `facebook/`, `twitter/`, `twitter-v1.1/`, `instagram/`, `telegram/`, `ai/`, `auth/`
- Pages: `dashboard/`, `publish/`, `history/`, `ai/`, `auth/`, `about/`, `privacy/`

### Library Layer (`src/lib/`)
- `db.ts` — PostgreSQL connection pool (uses `DATABASE_STRING` env var)
- `auth.config.ts` — NextAuth configuration
- `api-auth.ts` — Session/user ID extraction helper for API routes
- `logger.ts` — Standardized logging via `createLogger`
- `platformConfig.ts` — Platform metadata (labels, icons, colors)
- `publish/orchestrator.ts` — Core publishing pipeline: validate → process media → fetch tokens → publish in parallel → map results → log report
- `publish/` — Sub-modules: `validators/`, `services/`, `mappers/`, `types.ts`
- `publishers/` — Platform-specific posting: `facebook.ts`, `twitterv1.1.ts`, `instagram.ts`, `telegram.ts`
- `ai/transformService.ts` — AI content transformation
- `twitter-auth/twitter-client.ts` — Twitter API client

### Database
- Raw SQL with `pg` driver (no ORM). Migrations in `migrations/` run alphabetically via `scripts/migrate.js`.
- Key tables: `users`, `connected_facebook_pages`, `connected_x_accounts`, `connected_x_accounts_v1.1`, `connected_instagram_accounts`, `connected_telegram_channels`, `publish_history`, `ai_prompts`, `ai_providers`, `openai_api_keys`, `scheduled_posts`, `oauth_auth_system`

### API Patterns
- Status codes: 200 (success), 207 (partial success across platforms), 400 (validation), 401 (auth), 404 (not found), 500 (error)
- Publishing endpoint (`/api/publish/`) supports SSE progress streaming via `/api/publish/stream/`
- All publish operations logged to `publish_history` with detailed report entries

## Conventions

- **Commit messages:** Conventional commits format (`feat:`, `fix:`, `refactor:`, `perf:`, `docs:`)
- **Logging:** Use `createLogger` from `@/lib/logger` (not `console.*`)
- **Environment:** Copy `.example.env` to `.env` for required variables (database, OAuth, API keys, Cloudinary)
