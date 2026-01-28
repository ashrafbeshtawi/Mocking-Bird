import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth.config"

// Use edge-compatible config (no adapter)
export const { auth: middleware } = NextAuth(authConfig)

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}
