import { jwtVerify, errors } from 'jose';
import { JWTExpired } from 'jose/errors';

export async function verifyAuthToken(token: string): Promise<string | number> {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables.');
  }
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);

  try {
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId;

    if (typeof userId !== 'string' && typeof userId !== 'number') {
      throw new Error('Invalid user ID in token payload');
    }
    return userId;
  } catch (err) {
    if (err instanceof JWTExpired) {
      throw new Error('Token expired');
    }
    if (err instanceof errors.JWSSignatureVerificationFailed) {
      throw new Error('Invalid token signature');
    }
    throw new Error('Invalid token');
  }
}
