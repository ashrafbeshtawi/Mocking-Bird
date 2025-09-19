// app/api/twitter/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Utility to generate PKCE code verifier & challenge
function generatePKCE() {
  const codeVerifier = crypto.randomBytes(32).toString('hex');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url'); // Node 20+ supports 'base64url'
  return { codeVerifier, codeChallenge };
}

export async function GET(req: NextRequest) {
  try {
    const { codeVerifier, codeChallenge } = generatePKCE();

    // Store codeVerifier in a secure httpOnly cookie (needed for token exchange)
    const res = NextResponse.redirect(
      `https://twitter.com/i/oauth2/authorize?` +
        new URLSearchParams({
          response_type: 'code',
          client_id: process.env.X_CLIENT_ID!,
          redirect_uri: process.env.X_CALLBACK_URL!,
          scope: 'tweet.read tweet.write users.read offline.access media.write', // adjust scopes
          state: crypto.randomBytes(16).toString('hex'),
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
        }).toString()
    );

    res.cookies.set('twitter_pkce_verifier', codeVerifier, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60, // 15 minutes
    });
    res.cookies.set('temp_jwt', req.cookies.get('jwt')?.value ?? '', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60, // 15 minutes
    });

    return res;
  } catch (err) {
    console.error('Twitter OAuth2 login error:', err);
    return NextResponse.json({ error: 'Failed to start Twitter OAuth2 login' }, { status: 500 });
  }
}


