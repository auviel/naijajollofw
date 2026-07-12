import { AppError } from "@/lib/utils/errors";

export type SquareEnvironmentName = "sandbox" | "production";

export function getSquareEnvironment(): SquareEnvironmentName {
  const value = process.env.SQUARE_ENVIRONMENT?.trim().toLowerCase();
  return value === "production" ? "production" : "sandbox";
}

export function getSquareAccessToken(): string {
  const token = process.env.SQUARE_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new AppError(
      "INTERNAL_ERROR",
      "Square payments are not configured. Set SQUARE_ACCESS_TOKEN.",
      500,
    );
  }
  return token;
}

export function getSquareLocationId(): string {
  const locationId =
    process.env.SQUARE_LOCATION_ID?.trim() ||
    process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID?.trim();
  if (!locationId) {
    throw new AppError(
      "INTERNAL_ERROR",
      "Square payments are not configured. Set SQUARE_LOCATION_ID.",
      500,
    );
  }
  return locationId;
}

export function getSquareApplicationId(): string {
  const applicationId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID?.trim();
  if (!applicationId) {
    throw new AppError(
      "INTERNAL_ERROR",
      "Square payments are not configured. Set NEXT_PUBLIC_SQUARE_APPLICATION_ID.",
      500,
    );
  }
  return applicationId;
}

export function getSquareWebhookSignatureKey(): string {
  const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY?.trim();
  if (!key) {
    throw new AppError(
      "INTERNAL_ERROR",
      "Square webhooks are not configured. Set SQUARE_WEBHOOK_SIGNATURE_KEY.",
      500,
    );
  }
  return key;
}

export function getSquareWebhookNotificationUrl(): string {
  const explicit = process.env.SQUARE_WEBHOOK_NOTIFICATION_URL?.trim();
  if (explicit) {
    return explicit;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (!appUrl) {
    throw new AppError(
      "INTERNAL_ERROR",
      "Set NEXT_PUBLIC_APP_URL or SQUARE_WEBHOOK_NOTIFICATION_URL for Square webhooks.",
      500,
    );
  }

  return `${appUrl}/api/webhooks/square`;
}

/** Ontario HST default — override with TAX_RATE_BPS (basis points, 1300 = 13%). */
export function getTaxRateBps(): number {
  const raw = process.env.TAX_RATE_BPS?.trim();
  if (!raw) {
    return 1300;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 50_000) {
    return 1300;
  }
  return parsed;
}

export function isSquareConfigured(): boolean {
  return Boolean(
    process.env.SQUARE_ACCESS_TOKEN?.trim() &&
      (process.env.SQUARE_LOCATION_ID?.trim() ||
        process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID?.trim()) &&
      process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID?.trim(),
  );
}

/**
 * Skip Square and create paid orders when Square is not configured.
 * Ignored whenever Square credentials are present (live/sandbox).
 */
export function isCheckoutSimulatePayments(): boolean {
  const flag =
    process.env.CHECKOUT_SIMULATE_PAYMENTS?.trim().toLowerCase() === "true";
  return flag && !isSquareConfigured();
}
