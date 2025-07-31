import { NextRequest, NextResponse } from 'next/server';
// 💡 Corrected import for JWTExpired and errors
import { jwtVerify, errors } from 'jose';
import { JWTExpired } from 'jose/errors'; // Correct import path for JWTExpired

export async function middleware(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];

  // 1. Check for token presence
  if (!token) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized: No token provided' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 2. Retrieve the secret key for verification
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);

    // 3. Verify and Decode the JWT
    const { payload } = await jwtVerify(token, secret, {
      // Optional: Add audience or issuer checks if your tokens have them
      // audience: 'your-app-audience',
      // issuer: 'your-token-issuer',
    });

    // 4. Extract user ID from payload
    const userId = payload.userId; // Adjust 'userId' if your JWT payload uses a different key (e.g., 'sub', 'id')

    if (typeof userId !== 'string' && typeof userId !== 'number') {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized: Invalid user ID in token payload' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 5. Clone the request and add a custom header with the user ID
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-user-id', String(userId));

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

  } catch (err) {
    console.error('Middleware JWT processing error:', err);

    // Handle specific JOSE errors for clearer messages
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
    // Catch-all for other JWT errors (e.g., malformed token, invalid claims)
    return new NextResponse(JSON.stringify({ error: 'Unauthorized: Invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
// add exception for login & register routes
export const config = {
  matcher: [
    // Match all /api/* routes except login and register
    '/api((?!/login|/register|/twitter).*)',
  ],
};

