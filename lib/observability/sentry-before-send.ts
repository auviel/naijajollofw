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

function eventMessage(event: ErrorEvent, hint: EventHint): string {
  const error = hint.originalException;
  if (
    typeof error === "object" &&
    error &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  if (typeof error === "string") {
    return error;
  }
  return (
    event.message ??
    event.exception?.values?.[0]?.value ??
    ""
  );
}

/**
 * Injected scripts / extensions often monkey-patch EventTarget.addEventListener
 * (e.g. `addEL_hook`) and recurse until the stack overflows. Stacks are anonymous
 * with no in-app frames — not actionable app bugs.
 */
function isInjectedAddEventListenerStackOverflow(
  event: ErrorEvent,
  message: string,
  exceptionType: string,
): boolean {
  if (
    exceptionType !== "RangeError" ||
    !/Maximum call stack size exceeded/i.test(message)
  ) {
    return false;
  }

  const frames =
    event.exception?.values?.[0]?.stacktrace?.frames?.map(
      (frame) => `${frame.function ?? ""} ${frame.filename ?? ""}`,
    ) ?? [];
  const joined = frames.join("\n");

  return /addEL_hook/i.test(joined) || /(?:^|\W)(?:top\.)?addEventListener/i.test(joined);
}

/** Drop expected / non-actionable noise so real diner/staff bugs stay visible. */
export function sentryBeforeSend(
  event: ErrorEvent,
  hint: EventHint,
): ErrorEvent | null {
  const error = hint.originalException;
  const message = eventMessage(event, hint);
  const exceptionType = event.exception?.values?.[0]?.type ?? "";

  if (isExpectedClientAppError(error)) {
    return null;
  }

  // Next.js RSC often rethrows / serializes AppError so originalException is not AppError.
  if (
    exceptionType === "AppError" ||
    /Authentication required/i.test(message) ||
    /Store manager access required/i.test(message) ||
    /Restaurant is not set up yet/i.test(message)
  ) {
    return null;
  }

  if (
    /useSession must be wrapped in a <SessionProvider/i.test(message) ||
    /Hydration failed because the server rendered text didn't match/i.test(
      message,
    ) ||
    /The destination stream closed early/i.test(message) ||
    /Cookies can only be modified in a Server Action or Route Handler/i.test(
      message,
    ) ||
    /Switched to client rendering because the server rendering errored/i.test(
      message,
    ) ||
    /TypeError: Load failed/i.test(message) ||
    /^Load failed$/i.test(message) ||
    /Can't find variable: X/i.test(message) ||
    /Module build failed/i.test(message) ||
    /Unexpected end of JSON input/i.test(message)
  ) {
    return null;
  }

  if (isInjectedAddEventListenerStackOverflow(event, message, exceptionType)) {
    return null;
  }

  return event;
}
