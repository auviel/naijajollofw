import { AppError } from "@/lib/utils/errors";
import type { DoorDashErrorResponse } from "./types";

export function mapDoorDashApiError(status: number, body: unknown): AppError {
  const error = (body ?? {}) as DoorDashErrorResponse;
  const message = error.message ?? "DoorDash Drive request failed";
  const fieldErrors = error.field_errors
    ?.map((entry) => `${entry.field ?? "field"}: ${entry.error ?? "invalid"}`)
    .join("; ");

  if (status === 401 || status === 403) {
    return new AppError(
      "PROVIDER_ERROR",
      "DoorDash Drive authentication failed. Check your API credentials.",
      502,
    );
  }

  const normalized = message.toLowerCase();
  if (
    normalized.includes("quote") &&
    (normalized.includes("expired") || normalized.includes("invalid"))
  ) {
    return new AppError(
      "QUOTE_EXPIRED",
      "The delivery quote has expired. Please request a new quote.",
      400,
    );
  }

  if (status === 400) {
    const combined = `${message} ${fieldErrors ?? ""}`.toLowerCase();
    if (combined.includes("same country") && combined.includes("default store")) {
      return new AppError(
        "VALIDATION_ERROR",
        "DoorDash is not available for Canadian addresses yet.",
        400,
      );
    }

    return new AppError(
      "VALIDATION_ERROR",
      fieldErrors ? `DoorDash rejected the request: ${fieldErrors}` : message,
      400,
    );
  }

  if (status === 404) {
    return new AppError("NOT_FOUND", "Delivery not found in DoorDash Drive.", 404);
  }

  if (
    normalized.includes("serviceable") ||
    normalized.includes("coverage") ||
    normalized.includes("distance")
  ) {
    return new AppError(
      "VALIDATION_ERROR",
      "This address is outside DoorDash delivery coverage.",
      400,
    );
  }

  return new AppError(
    "PROVIDER_ERROR",
    fieldErrors ? `${message} (${fieldErrors})` : message,
    status >= 500 ? 502 : 400,
  );
}
