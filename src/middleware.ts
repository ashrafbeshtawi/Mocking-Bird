import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

// Public paths that don't require authentication
const PUBLIC_PATHS = ["/", "/about", "/privacy", "/error", "/auth", "/terms"]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow NextAuth API routes (critical - don't interfere with auth flow)
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next()
  }

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // Check for session token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  // Redirect to auth if not logged in
  if (!token) {
    const url = new URL("/auth", request.url)
    return NextResponse.redirect(url)
  }

  // For API routes, add user ID header
  if (pathname.startsWith("/api/") && token.userId) {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set("x-user-id", String(token.userId))
    return NextResponse.next({
      request: { headers: requestHeaders },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}
