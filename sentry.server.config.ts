import * as Sentry from "@sentry/nextjs";
import { sentryBeforeSend } from "@/lib/observability/sentry-before-send";
import { deployEnvironment } from "@/lib/observability/deploy-env";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
const environment = deployEnvironment();

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment,
  sendDefaultPii: true,
  includeLocalVariables: true,
  beforeSend: sentryBeforeSend,
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
