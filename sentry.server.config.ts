import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NODE_ENV,
  sendDefaultPii: true,
  includeLocalVariables: true,
  tracesSampler: ({ name, inheritOrSampleWith }) => {
    if (name.includes("/monitoring") || name.includes("/api/health")) {
      return 0;
    }
    if (
      name.includes("/api/checkout") ||
      name.includes("/api/diner") ||
      name.includes("/api/cart") ||
      name.includes("/api/webhooks")
    ) {
      return 1;
    }
    return inheritOrSampleWith(
      process.env.NODE_ENV === "development" ? 1.0 : 0.1,
    );
  },
});
