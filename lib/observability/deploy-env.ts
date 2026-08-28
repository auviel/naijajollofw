/**
 * Host-agnostic deploy environment for Sentry and public config.
 * Prefers Cloudflare, then Vercel, then NODE_ENV so a dual-running cutover
 * still labels events correctly.
 */
export function deployEnvironment(): string {
  return (
    process.env.APP_ENV ??
    process.env.NEXT_PUBLIC_APP_ENV ??
    process.env.CLOUDFLARE_ENV ??
    process.env.NEXT_PUBLIC_CLOUDFLARE_ENV ??
    process.env.VERCEL_ENV ??
    process.env.NEXT_PUBLIC_VERCEL_ENV ??
    process.env.NODE_ENV ??
    "development"
  );
}
