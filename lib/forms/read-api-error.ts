export type ApiFieldErrors = Record<string, string>;

export type FieldErrorPair = {
  key: string;
  message: string;
};

const UNSAFE_OBJECT_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export function isSafeFieldKey(key: string): boolean {
  return key.length > 0 && !UNSAFE_OBJECT_KEYS.has(key);
}

export function fieldErrorsFromPairs(pairs: Iterable<FieldErrorPair>): ApiFieldErrors {
  const result: ApiFieldErrors = Object.create(null);
  for (const pair of pairs) {
    const trimmed = pair.message.trim();
    if (!isSafeFieldKey(pair.key) || !trimmed) {
      continue;
    }
    Object.defineProperty(result, pair.key, {
      value: trimmed,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return result;
}

type ApiErrorBody = {
  error?: string;
  code?: string;
  details?:
    | Record<string, string[] | string | undefined>
    | {
        fieldErrors?: Record<string, string[] | string | undefined>;
        formErrors?: string[];
      };
};

function firstMessage(
  value: string[] | string | undefined,
): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  if (Array.isArray(value)) {
    const message = value.find((item) => typeof item === "string" && item.trim());
    return message?.trim();
  }
  return undefined;
}

function firstOwnStringValue(record: ApiFieldErrors): string | undefined {
  for (const message of Object.values(record)) {
    if (message.trim()) {
      return message;
    }
  }
  return undefined;
}

export function flattenApiFieldErrors(details: ApiErrorBody["details"]): ApiFieldErrors {
  if (!details || typeof details !== "object") {
    return {};
  }

  const source =
    "fieldErrors" in details && details.fieldErrors
      ? details.fieldErrors
      : (details as Record<string, string[] | string | undefined>);

  const pairs: FieldErrorPair[] = [];
  for (const [key, value] of Object.entries(source)) {
    if (key === "fieldErrors" || key === "formErrors") {
      continue;
    }
    const message = firstMessage(value);
    if (message) {
      pairs.push({ key, message });
    }
  }
  return fieldErrorsFromPairs(pairs);
}

export async function readApiErrorResponse(
  response: Response,
  fallback = "Something went wrong. Please try again.",
): Promise<{ message: string; fieldErrors: ApiFieldErrors }> {
  const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
  const fieldErrors = flattenApiFieldErrors(body.details);
  const firstField = firstOwnStringValue(fieldErrors);
  const message =
    body.error === "Validation failed" && firstField
      ? firstField
      : body.error?.trim() || firstField || fallback;
  return { message, fieldErrors };
}

export async function readApiError(
  response: Response,
  fallback = "Something went wrong. Please try again.",
): Promise<string> {
  const { message } = await readApiErrorResponse(response, fallback);
  return message;
}
