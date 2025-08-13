import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, errors } from 'jose';
import { JWTExpired } from 'jose/errors';

export async function middleware(req: NextRequest) {
  // 1. Read JWT from cookie instead of Authorization header
  const token = req.cookies.get('jwt')?.value;

  if (!token) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized: No token provided' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 2. Retrieve the secret key for verification
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);

    // 3. Verify and decode the JWT
    const { payload } = await jwtVerify(token, secret);

    // 4. Extract user ID from payload
    const userId = payload.userId;
    if (typeof userId !== 'string' && typeof userId !== 'number') {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized: Invalid user ID in token payload' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
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
      return new NextResponse(JSON.stringify({ error: 'Unauthorized: Token expired' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (err instanceof errors.JWSSignatureVerificationFailed) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized: Invalid token signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fallback for any other JWT issues
    return new NextResponse(JSON.stringify({ error: 'Unauthorized: Invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Only protect API routes except the listed exceptions
export const config = {
  matcher: [
    '/api((?!/login|/register|/twitter/login|/twitter/callback).*)',
  ],
};
