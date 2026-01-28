# OAuth Authentication System Design

**Date:** 2026-01-28
**Status:** Approved

## Overview

Replace the current custom JWT email/password authentication with a unified OAuth-based system supporting Google, GitHub, and Discord providers.

## Goals

- Simplify user onboarding (one-click sign in)
- Remove password management responsibility
- Merge sign-in and sign-up into a single page
- Leverage NextAuth.js for battle-tested OAuth handling

## Architecture

```
User clicks "Sign in with Google"
        ↓
NextAuth.js redirects to Google OAuth
        ↓
User authorizes → Google redirects back with code
        ↓
NextAuth.js exchanges code for tokens
        ↓
NextAuth.js creates/updates user in PostgreSQL
        ↓
JWT session cookie set → User is logged in
```

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth library | NextAuth.js (Auth.js) | Built for Next.js, supports all 3 providers, PostgreSQL adapter available |
| Session strategy | JWT | No DB lookup per request, simpler (no sessions table), already familiar pattern |
| Database approach | Clean slate | Only one test user exists, simplifies migration |
| Providers | Google, GitHub, Discord | Covers mainstream users, developers, and communities |

## Database Schema

### Migration: `018_oauth_auth_system.sql`

```sql
-- Drop existing auth tables (clean slate)
DROP TABLE IF EXISTS users CASCADE;

-- Create new users table (NextAuth compatible)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  email_verified TIMESTAMPTZ,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create accounts table (OAuth provider links)
CREATE TABLE accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(255) NOT NULL,
  provider VARCHAR(255) NOT NULL,
  provider_account_id VARCHAR(255) NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  token_type VARCHAR(255),
  scope VARCHAR(255),
  id_token TEXT,
  UNIQUE(provider, provider_account_id)
);

CREATE INDEX idx_accounts_user_id ON accounts(user_id);
```

## File Changes

### Create

| File | Purpose |
|------|---------|
| `migrations/018_oauth_auth_system.sql` | Database migration |
| `src/app/api/auth/[...nextauth]/route.ts` | NextAuth API handler |
| `src/app/auth/page.tsx` | Unified auth page |
| `src/lib/auth.ts` | Auth utilities export |

### Update

| File | Change |
|------|--------|
| `src/middleware.ts` | Use NextAuth session validation |
| `src/app/hooks/AuthProvider.tsx` | Wrap NextAuth SessionProvider |
| `src/app/layout.tsx` | Update provider import if needed |
| `.env` | Add OAuth credentials |
| `package.json` | Add next-auth, @auth/pg-adapter |

### Delete

| File | Reason |
|------|--------|
| `src/app/login/page.tsx` | Replaced by `/auth` |
| `src/app/register/page.tsx` | Replaced by `/auth` |
| `src/app/api/login/route.ts` | Replaced by NextAuth |
| `src/app/api/register/route.ts` | Replaced by NextAuth |
| `src/app/api/logout/route.ts` | Replaced by NextAuth |
| `src/app/api/auth/check/route.ts` | Replaced by NextAuth |
| `src/lib/auth-utils.ts` | No longer needed |

## Auth Page UI

Single page at `/auth`:

```
┌─────────────────────────────────────────┐
│                                         │
│            Mocking Bird                 │
│                                         │
│         Sign in to continue             │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │     Continue with Google          │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │     Continue with GitHub          │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │     Continue with Discord         │  │
│  └───────────────────────────────────┘  │
│                                         │
│     By continuing, you agree to our     │
│        Terms and Privacy Policy         │
│                                         │
└─────────────────────────────────────────┘
```

## NextAuth Configuration

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import Discord from "next-auth/providers/discord"
import PostgresAdapter from "@auth/pg-adapter"
import pool from "@/lib/db"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PostgresAdapter(pool),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: "/auth",
    error: "/auth",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.userId = user.id
      return token
    },
    session({ session, token }) {
      session.user.id = token.userId
      return session
    },
  },
})

export { handlers as GET, handlers as POST }
```

## Environment Variables

```env
# Google (console.cloud.google.com)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# GitHub (github.com/settings/developers)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Discord (discord.com/developers)
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=  # openssl rand -base64 32
```

## Middleware

```typescript
// src/middleware.ts
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isAuthPage = req.nextUrl.pathname === "/auth"
  const isPublicPath = ["/", "/about", "/privacy", "/error"].includes(req.nextUrl.pathname)
  const isApiAuth = req.nextUrl.pathname.startsWith("/api/auth")

  if (isPublicPath || isApiAuth) return NextResponse.next()

  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL("/auth", req.url))
  }

  if (req.nextUrl.pathname.startsWith("/api/") && req.auth?.user?.id) {
    const headers = new Headers(req.headers)
    headers.set("x-user-id", String(req.auth.user.id))
    return NextResponse.next({ headers })
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
```

## AuthProvider

```typescript
// src/app/hooks/AuthProvider.tsx
"use client"
import { SessionProvider, useSession, signOut } from "next-auth/react"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}

export function useAuth() {
  const { data: session, status } = useSession()

  return {
    isLoggedIn: !!session,
    isLoading: status === "loading",
    user: session?.user ?? null,
    userId: session?.user?.id ?? null,
    logout: () => signOut({ callbackUrl: "/auth" }),
  }
}
```

## OAuth Provider Setup (Manual Steps)

### Google
1. Go to console.cloud.google.com
2. Create new project or select existing
3. APIs & Services → Credentials → Create OAuth 2.0 Client ID
4. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
5. Copy Client ID and Client Secret to `.env`

### GitHub
1. Go to github.com/settings/developers
2. New OAuth App
3. Set callback URL: `http://localhost:3000/api/auth/callback/github`
4. Copy Client ID and Client Secret to `.env`

### Discord
1. Go to discord.com/developers/applications
2. New Application
3. OAuth2 → Add redirect: `http://localhost:3000/api/auth/callback/discord`
4. Copy Client ID and Client Secret to `.env`

## Dependencies

```bash
npm install next-auth@beta @auth/pg-adapter
```

Note: Using next-auth@beta for App Router support (Auth.js v5).
