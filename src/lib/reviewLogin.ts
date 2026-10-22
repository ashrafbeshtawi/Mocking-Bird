import { createHash, timingSafeEqual } from "crypto"
import Credentials from "next-auth/providers/credentials"
import pool from "@/lib/db"

// Temporary username/password login for the TikTok app reviewer; enabled only while
// REVIEW_LOGIN_USERNAME and REVIEW_LOGIN_PASSWORD are set. See the tracking issue for removal.

const digest = (value: string) => createHash("sha256").update(value).digest()
const matches = (given: unknown, expected: string) =>
  typeof given === "string" && timingSafeEqual(digest(given), digest(expected))

export async function authorizeReviewer(credentials: Partial<Record<string, unknown>>) {
  const username = process.env.REVIEW_LOGIN_USERNAME
  const password = process.env.REVIEW_LOGIN_PASSWORD
  if (!username || !password) return null
  if (!matches(credentials.username, username) || !matches(credentials.password, password)) return null

  const { rows } = await pool.query(
    `INSERT INTO users (name, email) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [username, `${username}@review.invalid`]
  )
  return { id: String(rows[0].id), name: username, email: `${username}@review.invalid` }
}

export const reviewLoginProviders =
  process.env.REVIEW_LOGIN_USERNAME && process.env.REVIEW_LOGIN_PASSWORD
    ? [
        Credentials({
          id: "review-login",
          name: "Username and password",
          credentials: { username: {}, password: {} },
          authorize: authorizeReviewer,
        }),
      ]
    : []
