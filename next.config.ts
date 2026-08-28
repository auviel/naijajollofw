import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
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

function r2RemotePattern(base: string): NonNullable<
  NonNullable<NextConfig["images"]>["remotePatterns"]
>[number] {
  const url = new URL(base);
  return {
    protocol: url.protocol.replace(":", "") as "http" | "https",
    hostname: url.hostname,
    port: url.port || "",
    pathname: "/**",
  };
}

function r2RemotePatterns(): NonNullable<
  NonNullable<NextConfig["images"]>["remotePatterns"]
> {
  const bases = [
    process.env.R2_PUBLIC_BASE_URL?.trim(),
    process.env.R2_LEGACY_PUBLIC_BASE_URL?.trim(),
  ].filter((value): value is string => Boolean(value));

  const patterns: NonNullable<
    NonNullable<NextConfig["images"]>["remotePatterns"]
  > = [];
  const seenHostnames = new Set<string>();

  for (const base of bases) {
    try {
      const pattern = r2RemotePattern(base);
      if (seenHostnames.has(pattern.hostname)) {
        continue;
      }
      seenHostnames.add(pattern.hostname);
      patterns.push(pattern);
    } catch {
      // Skip invalid base URLs at build time.
    }
  }

  // Fallback for dev DBs / caches that still reference legacy r2.dev URLs.
  if (!seenHostnames.has("pub-a89a3e110634439d96e35518678ffd25.r2.dev")) {
    patterns.push({
      protocol: "https",
      hostname: "pub-a89a3e110634439d96e35518678ffd25.r2.dev",
      port: "",
      pathname: "/**",
    });
  }

  return patterns;
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  serverExternalPackages: [
    "@prisma/client",
    ".prisma/client",
    "@prisma/adapter-pg",
    "pg",
    "pg-cloudflare",
  ],
  env: {
    NEXT_PUBLIC_VERCEL_ENV:
      process.env.APP_ENV ?? process.env.CLOUDFLARE_ENV ?? process.env.VERCEL_ENV ?? "",
    NEXT_PUBLIC_CLOUDFLARE_ENV:
      process.env.APP_ENV ?? process.env.CLOUDFLARE_ENV ?? "",
    NEXT_PUBLIC_APP_ENV: process.env.APP_ENV ?? process.env.CLOUDFLARE_ENV ?? "",
    NEXT_PUBLIC_STORE_TIMEZONE:
      process.env.STORE_TIMEZONE ?? "America/Toronto",
  },
  images: {
    remotePatterns: [
      ...r2RemotePatterns(),
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        pathname: "/images/**",
      },
    ],
  },
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
  widenClientFileUpload: false,
  tunnelRoute: "/monitoring",
  silent: !process.env.CI,
});

// Optional: OPENNEXT_DEV=1 npm run dev — use Wrangler bindings (Hyperdrive) in Next.dev.
if (process.env.OPENNEXT_DEV === "1") {
  initOpenNextCloudflareForDev();
}
