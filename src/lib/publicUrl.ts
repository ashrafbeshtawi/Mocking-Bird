/**
 * Absolute URL on the public origin.
 *
 * Behind a reverse proxy (Docker + Traefik) Next.js builds `request.url` from its own
 * bind address (https://0.0.0.0:3000), so anything that leaves the server — OAuth
 * callbacks, redirect Locations — must use the configured public base URL instead.
 * Falls back to the request origin when NEXTAUTH_URL is unset.
 */
export function publicUrl(path: string, req: { url: string }): URL {
  return new URL(path, process.env.NEXTAUTH_URL ?? req.url);
}
