import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import Discord from "next-auth/providers/discord"

// Edge-compatible config (no Node.js-only imports like pg adapter)
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/auth",
    error: "/auth",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id
      }
      return token
    },
    session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId as string
      }
      return session
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isAuthPage = nextUrl.pathname === "/auth"
      const isPublicPath = ["/", "/about", "/privacy", "/error", "/terms"].some(
        path => nextUrl.pathname === path || nextUrl.pathname.startsWith(path + "/")
      )
      const isAuthApi = nextUrl.pathname.startsWith("/api/auth")

      // Allow auth API routes
      if (isAuthApi) return true

      // Allow public paths
      if (isPublicPath) return true

      // Redirect logged-in users away from auth page
      if (isAuthPage && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl))
      }

      // Allow auth page for non-logged-in users
      if (isAuthPage) return true

      // Require login for everything else
      return isLoggedIn
    },
  },
}
