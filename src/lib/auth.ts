import NextAuth from "next-auth"
import PostgresAdapter from "@auth/pg-adapter"
import pool from "@/lib/db"
import { authConfig } from "./auth.config"
import { reviewLoginProviders } from "./reviewLogin"

// Full config with adapter (for API routes - Node.js runtime)
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [...authConfig.providers, ...reviewLoginProviders],
  adapter: PostgresAdapter(pool),
})
