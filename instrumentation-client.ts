import * as Sentry from "@sentry/nextjs";
import { sentryBeforeSend } from "@/lib/observability/sentry-before-send";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const environment =
  process.env.NEXT_PUBLIC_VERCEL_ENV ??
  process.env.VERCEL_ENV ??
  process.env.NODE_ENV;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment,
  sendDefaultPii: true,
  beforeSend: sentryBeforeSend,
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
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
