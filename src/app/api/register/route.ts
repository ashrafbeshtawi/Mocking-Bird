import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcrypt';

// Validation constants
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 50;
const USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;
const BCRYPT_ROUNDS = 10; // Keep at 10 for compatibility with existing users

interface ValidationError {
  field: string;
  message: string;
}

function validateUsername(username: string): ValidationError | null {
  if (!username || typeof username !== 'string') {
    return { field: 'username', message: 'Username is required' };
  }

  const trimmed = username.trim();

  if (trimmed.length < USERNAME_MIN_LENGTH) {
    return { field: 'username', message: `Username must be at least ${USERNAME_MIN_LENGTH} characters` };
  }

  if (trimmed.length > USERNAME_MAX_LENGTH) {
    return { field: 'username', message: `Username must be at most ${USERNAME_MAX_LENGTH} characters` };
  }

  if (!USERNAME_PATTERN.test(trimmed)) {
    return { field: 'username', message: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }

  return null;
}

function validateEmail(email: string): ValidationError | null {
  if (!email || typeof email !== 'string') {
    return { field: 'email', message: 'Email is required' };
  }

  const trimmed = email.trim().toLowerCase();

  if (!EMAIL_PATTERN.test(trimmed)) {
    return { field: 'email', message: 'Please enter a valid email address' };
  }

  if (trimmed.length > 255) {
    return { field: 'email', message: 'Email is too long' };
  }

  return null;
}

function validatePassword(password: string): ValidationError | null {
  if (!password || typeof password !== 'string') {
    return { field: 'password', message: 'Password is required' };
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return { field: 'password', message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` };
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    return { field: 'password', message: `Password must be at most ${PASSWORD_MAX_LENGTH} characters` };
  }

  // Check for at least one letter and one number
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasLetter || !hasNumber) {
    return { field: 'password', message: 'Password must contain at least one letter and one number' };
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, email, password } = body;

    // Validate all fields
    const usernameError = validateUsername(username);
    if (usernameError) {
      return NextResponse.json({ error: usernameError.message, field: usernameError.field }, { status: 400 });
    }

    const emailError = validateEmail(email);
    if (emailError) {
      return NextResponse.json({ error: emailError.message, field: emailError.field }, { status: 400 });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError.message, field: passwordError.field }, { status: 400 });
    }

    // Sanitize inputs
    const sanitizedUsername = username.trim();
    const sanitizedEmail = email.trim().toLowerCase();

    // Hash password with increased rounds
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const client = await pool.connect();
    try {
      await client.query(
        'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)',
        [sanitizedUsername, sanitizedEmail, hashedPassword]
      );
    } finally {
      client.release();
    }

    return NextResponse.json({ success: true, message: 'Registration successful' });

  } catch (error) {
    console.error('Registration error:', error);

    // Handle duplicate key constraint
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      // Check which field caused the duplicate
      const detail = (error as { detail?: string }).detail || '';
      if (detail.includes('username')) {
        return NextResponse.json({ error: 'Username already exists', field: 'username' }, { status: 409 });
      }
      if (detail.includes('email')) {
        return NextResponse.json({ error: 'Email already exists', field: 'email' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Username or email already exists' }, { status: 409 });
    }

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
