import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import Discord from "next-auth/providers/discord"
import { createLogger } from "@/lib/logger"

const logger = createLogger("Auth")

// The GitHub provider takes the primary (or first) address from /user/emails
// without looking at `verified`, so ask GitHub whether this exact address is
// verified. Any failure counts as unverified.
export async function isVerifiedGitHubEmail(
  accessToken: string | undefined,
  email: string | null | undefined
): Promise<boolean> {
  if (!accessToken || !email) return false
  try {
    const res = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "mockingbird-auth",
      },
    })
    if (!res.ok) {
      logger.warn("GitHub /user/emails failed", { status: res.status })
      return false
    }
    const emails = (await res.json()) as { email?: string; verified?: boolean }[]
    if (!Array.isArray(emails)) return false
    const wanted = email.toLowerCase()
    return emails.some((e) => e.verified === true && e.email?.toLowerCase() === wanted)
  } catch (error) {
    logger.error("GitHub e-mail verification failed", error)
    return false
  }
}

// Edge-compatible config (no Node.js-only imports like pg adapter)
export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  pages: {
    signIn: "/auth",
    error: "/auth",
  },
  callbacks: {
    // allowDangerousEmailAccountLinking links an OAuth login to the existing
    // user with the same e-mail, so only accept e-mails the provider verified.
    // Auth.js runs this before it links or creates the account.
    async signIn({ user, account, profile }) {
      if (account?.provider === "discord") return profile?.verified === true
      if (account?.provider === "google") return profile?.email_verified === true
      if (account?.provider === "github") {
        return isVerifiedGitHubEmail(account.access_token, user?.email)
      }
      // Credentials has no profile.
      return true
    },
    jwt({ token, user }) {
      if (user) {
        // Store user ID in both userId and sub for compatibility
        token.userId = user.id
        token.sub = user.id
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        // Use userId or fall back to sub
        session.user.id = (token.userId || token.sub) as string
      }
      return session
    },
  },
}
