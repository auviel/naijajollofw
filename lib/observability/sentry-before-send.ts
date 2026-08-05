import type { ErrorEvent, EventHint } from "@sentry/core";

function isExpectedClientAppError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as {
    name?: string;
    code?: string;
    status?: number;
  };
  if (candidate.name !== "AppError") return false;
  if (typeof candidate.status !== "number" || candidate.status >= 500) {
    return false;
  }
  return (
    candidate.code === "NOT_FOUND" ||
    candidate.code === "UNAUTHORIZED" ||
    candidate.code === "VALIDATION_ERROR" ||
    candidate.code === "FORBIDDEN"
  );
}

/** Drop expected / non-actionable noise so real diner/staff bugs stay visible. */
export function sentryBeforeSend(
  event: ErrorEvent,
  hint: EventHint,
): ErrorEvent | null {
  const error = hint.originalException;
  const message =
    (typeof error === "object" &&
    error &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
      ? (error as { message: string }).message
      : null) ??
    event.message ??
    event.exception?.values?.[0]?.value ??
    "";

  if (isExpectedClientAppError(error)) {
    return null;
  }

  if (/Restaurant is not set up yet/i.test(message)) {
    return null;
  }

  if (
    /useSession must be wrapped in a <SessionProvider/i.test(message) ||
    /Hydration failed because the server rendered text didn't match/i.test(
      message,
    ) ||
    /The destination stream closed early/i.test(message)
  ) {
    return null;
  }

  return event;
}
