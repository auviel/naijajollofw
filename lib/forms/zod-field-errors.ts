import type { ZodError } from "zod";
import {
  fieldErrorsFromPairs,
  isSafeFieldKey,
  type ApiFieldErrors,
  type FieldErrorPair,
} from "@/lib/forms/read-api-error";

export function zodErrorToFieldErrors(error: ZodError): ApiFieldErrors {
  const pairs: FieldErrorPair[] = [];
  const seen = new Set<string>();

  for (const issue of error.issues) {
    const key = issue.path.at(0);
    if (typeof key !== "string" || !isSafeFieldKey(key) || seen.has(key)) {
      continue;
    }
    const message = issue.message.trim();
    if (!message) {
      continue;
    }
    seen.add(key);
    pairs.push({ key, message });
  }

  return fieldErrorsFromPairs(pairs);
}
