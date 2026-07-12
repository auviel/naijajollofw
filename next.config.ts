import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

/**
 * CSP tuned for Square Web Payments + Cloudflare Turnstile.
 * Missing pci-connect / squarecdn fonts causes “card form failed to load”
 * especially under Firefox’s stricter third-party checks.
 * @see https://developer.squareup.com/docs/web-payments/content-security-policy
 *
 * Dev-only `'unsafe-eval'`: React 19 + Turbopack need eval for debug callstacks.
 * Never ship that in production.
 */
const isDev = process.env.NODE_ENV !== "production";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "img-src 'self' data: blob: https:",
      [
        "font-src",
        "'self'",
        "data:",
        "https://fonts.gstatic.com",
        "https://square-fonts-production-f.squarecdn.com",
        "https://d1g145x70srn7h.cloudfront.net",
      ].join(" "),
      [
        "style-src",
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://web.squarecdn.com",
        "https://sandbox.web.squarecdn.com",
      ].join(" "),
      [
        "script-src",
        "'self'",
        "'unsafe-inline'",
        ...(isDev ? ["'unsafe-eval'"] : []),
        "https://challenges.cloudflare.com",
        "https://web.squarecdn.com",
        "https://sandbox.web.squarecdn.com",
        "https://js.squareup.com",
        "https://js.squareupsandbox.com",
      ].join(" "),
      [
        "frame-src",
        "'self'",
        "https://challenges.cloudflare.com",
        "https://web.squarecdn.com",
        "https://sandbox.web.squarecdn.com",
        "https://connect.squareup.com",
        "https://connect.squareupsandbox.com",
        "https://api.squareup.com",
        "https://api.squareupsandbox.com",
      ].join(" "),
      [
        "connect-src",
        "'self'",
        "https://challenges.cloudflare.com",
        "https://api.square.com",
        "https://api.squareup.com",
        "https://api.squareupsandbox.com",
        "https://connect.squareup.com",
        "https://connect.squareupsandbox.com",
        "https://pci-connect.squareup.com",
        "https://pci-connect.squareupsandbox.com",
        "https://web.squarecdn.com",
        "https://sandbox.web.squarecdn.com",
        "https://o160250.ingest.sentry.io",
        "https://api.mapbox.com",
        "https://events.mapbox.com",
        "https://*.ingest.sentry.io",
        "https://*.ingest.us.sentry.io",
      ].join(" "),
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG ?? "naija-jollof-waterloo",
  project: process.env.SENTRY_PROJECT ?? "naijajollofw-web",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  silent: !process.env.CI,
});
