import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  output: "standalone",
};

// withSentryConfig only wraps route handlers / server components at build time so
// uncaught errors are reported — Next 15.4's onRequestError hook misses route
// handlers in production. No source-map upload, no build plugin auth needed.
export default withSentryConfig(nextConfig, {
  silent: true,
  sourcemaps: { disable: true },
  telemetry: false,
});
