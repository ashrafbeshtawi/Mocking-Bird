import * as Sentry from '@sentry/nextjs';

// Server-side error reporting to GlitchTip (Sentry-compatible). Loaded by
// src/instrumentation.ts in the Node.js runtime only. With SENTRY_DSN unset the
// SDK is initialised disabled and never sends anything. The environment tag
// defaults to "production"; override with SENTRY_ENVIRONMENT if needed.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  integrations: [
    // API routes catch their errors and log them via createLogger (console.error),
    // so those are reported from here; an Error argument becomes a full exception event.
    Sentry.captureConsoleIntegration({ levels: ['error'] }),
  ],
});
