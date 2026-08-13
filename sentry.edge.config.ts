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
  beforeSend: sentryBeforeSend,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
});
