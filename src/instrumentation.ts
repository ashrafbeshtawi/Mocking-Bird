import * as Sentry from '@sentry/nextjs';
import type { Instrumentation } from 'next';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }
}

// Errors thrown in route handlers and server components (Next.js 15 hook).
export const onRequestError: Instrumentation.onRequestError = Sentry.captureRequestError;
