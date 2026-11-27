import NextAuth from "next-auth"
import PostgresAdapter from "@auth/pg-adapter"
import pool from "@/lib/db"
import { authConfig } from "./auth.config"

// Full config with adapter (for API routes - Node.js runtime)
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PostgresAdapter(pool),
})
