import type { NextConfig } from "next";

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
      "font-src 'self' data: https://fonts.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      [
        "script-src",
        "'self'",
        "'unsafe-inline'",
        "https://challenges.cloudflare.com",
        "https://web.squarecdn.com",
        "https://sandbox.web.squarecdn.com",
      ].join(" "),
      [
        "frame-src",
        "'self'",
        "https://challenges.cloudflare.com",
        "https://web.squarecdn.com",
        "https://sandbox.web.squarecdn.com",
      ].join(" "),
      [
        "connect-src",
        "'self'",
        "https://challenges.cloudflare.com",
        "https://api.square.com",
        "https://connect.squareupsandbox.com",
        "https://api.mapbox.com",
        "https://events.mapbox.com",
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

export default nextConfig;
