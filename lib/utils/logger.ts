type LogLevel = "info" | "warn" | "error" | "debug";

type LogContext = Record<string, unknown>;

const REDACT_KEYS = /^(password|passwd|secret|token|authorization|cookie|api[_-]?key|refresh[_-]?token|access[_-]?token)$/i;

function redactValue(key: string, value: unknown): unknown {
  if (REDACT_KEYS.test(key)) {
    return "[redacted]";
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return redactContext(value as LogContext);
  }
  return value;
}

function redactContext(context: LogContext): LogContext {
  const out: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    out[key] = redactValue(key, value);
  }
  return out;
}

function getBetterStackEndpoint(): string | null {
  const explicit = process.env.BETTERSTACK_INGEST_URL?.trim();
  if (explicit) return explicit;
  // Default Logtail / Better Stack HTTP source host
  return "https://in.logs.betterstack.com";
}

function shipToBetterStack(
  level: LogLevel,
  message: string,
  context?: LogContext,
): void {
  const token = process.env.BETTERSTACK_SOURCE_TOKEN?.trim();
  if (!token) return;

  const endpoint = getBetterStackEndpoint();
  if (!endpoint) return;

  const body = JSON.stringify({
    dt: new Date().toISOString(),
    level,
    message,
    service: "naija-jollof",
    ...(context ? redactContext(context) : {}),
  });

  // Fire-and-forget; never block request path on log shipping.
  void fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body,
  }).catch(() => {
    // Swallow — logging must not crash the app.
  });
}

function log(level: LogLevel, message: string, context?: LogContext) {
  const safeContext = context ? redactContext(context) : undefined;
  const payload = safeContext ? { message, ...safeContext } : { message };

  switch (level) {
    case "error":
      console.error(`[${level}]`, payload);
      break;
    case "warn":
      console.warn(`[${level}]`, payload);
      break;
    case "debug":
      if (process.env.NODE_ENV !== "production") {
        console.debug(`[${level}]`, payload);
      }
      break;
    default:
      console.info(`[${level}]`, payload);
  }

  if (level !== "debug") {
    shipToBetterStack(level, message, safeContext);
  }
}

export const logger = {
  info: (message: string, context?: LogContext) => log("info", message, context),
  warn: (message: string, context?: LogContext) => log("warn", message, context),
  error: (message: string, context?: LogContext) => log("error", message, context),
  debug: (message: string, context?: LogContext) => log("debug", message, context),
};
