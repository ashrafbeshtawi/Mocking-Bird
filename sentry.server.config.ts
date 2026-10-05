import * as Sentry from '@sentry/nextjs';

// Server-side error reporting to GlitchTip (Sentry-compatible). Loaded by
// src/instrumentation.ts in the Node.js runtime only. With SENTRY_DSN unset the
// SDK is initialised disabled and never sends anything. The environment tag
// defaults to "production"; override with SENTRY_ENVIRONMENT if needed.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  // Logged objects (e.g. an API's error response body) are kept this many levels deep.
  normalizeDepth: 6,
  integrations: [
    // API routes catch their errors and log them via createLogger (console.error),
    // so those are reported from here; an Error argument becomes a full exception event.
    Sentry.captureConsoleIntegration({ levels: ['error'] }),
    // Adds an error's own fields (HTTP code, response body) to the event.
    Sentry.extraErrorDataIntegration({ depth: 5 }),
  ],
});
