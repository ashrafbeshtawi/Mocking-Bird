import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, errors } from 'jose';
import { JWTExpired } from 'jose/errors';

export async function middleware(req: NextRequest) {
  // 1. Read JWT from cookie instead of Authorization header
  const token = req.cookies.get('jwt')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/error?statusCode=401&message=Unauthorized: No token provided', req.url));
  }

  try {
    // 2. Retrieve the secret key for verification
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);

    // 3. Verify and decode the JWT
    const { payload } = await jwtVerify(token, secret);

    // 4. Extract user ID from payload
    const userId = payload.userId;
    if (typeof userId !== 'string' && typeof userId !== 'number') {
      return NextResponse.redirect(new URL('/error?statusCode=401&message=Unauthorized: Invalid user ID in token payload', req.url));
    }

    // 5. Forward request with user ID in headers
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-user-id', String(userId));

    return NextResponse.next({
      request: { headers: requestHeaders },
    });

  } catch (err) {
    console.error('Middleware JWT processing error:', err);

    // Specific JOSE error handling
    if (err instanceof JWTExpired) {
      return NextResponse.redirect(new URL('/error?statusCode=401&message=Unauthorized: Token expired', req.url));
    }
    if (err instanceof errors.JWSSignatureVerificationFailed) {
      return NextResponse.redirect(new URL('/error?statusCode=401&message=Unauthorized: Invalid token signature', req.url));
    }

    // Fallback for any other JWT issues
    return NextResponse.redirect(new URL('/error?statusCode=401&message=Unauthorized: Invalid token', req.url));
  }
}

// Only protect API routes except the listed exceptions
export const config = {
  matcher: [
    '/api((?!/login|/register|/auth/check|/twitter/login|/twitter/callback|/twitter-v1.1/auth/callback).*)',
  ],
};
