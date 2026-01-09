import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('jwt')?.value;

    if (!token) {
      return NextResponse.json({
        authenticated: false,
        message: 'No token provided'
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not defined');
      return NextResponse.json({
        authenticated: false,
        message: 'Server configuration error'
      }, { status: 500 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    const userId = payload.userId;
    if (typeof userId !== 'string' && typeof userId !== 'number') {
      return NextResponse.json({
        authenticated: false,
        message: 'Invalid token payload'
      });
    }

    return NextResponse.json({
      authenticated: true,
      userId: userId
    });

  } catch (error) {
    // Token is invalid or expired
    console.error('Auth check error:', error);
    return NextResponse.json({
      authenticated: false,
      message: 'Invalid or expired token'
    });
  }
}
