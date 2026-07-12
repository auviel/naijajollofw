import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NODE_ENV,
  sendDefaultPii: true,
  tracesSampler: ({ name, inheritOrSampleWith }) => {
    if (name.includes("/monitoring") || name.includes("/api/health")) {
      return 0;
    }
    if (
      name.includes("/checkout") ||
      name.includes("/api/checkout") ||
      name.includes("/api/diner") ||
      name.includes("/api/cart")
    ) {
      return 1;
    }
    return inheritOrSampleWith(
      process.env.NODE_ENV === "development" ? 1.0 : 0.1,
    );
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
