import { createHmac, timingSafeEqual } from "crypto";
import {
  getSquareWebhookNotificationUrlCandidates,
  getSquareWebhookSignatureKey,
} from "@/lib/integrations/payments/square/config";
import { AppError } from "@/lib/utils/errors";

export function publicSquareWebhookUrl(request: Request): string | null {
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host")?.trim();
  if (!host) {
    return null;
  }
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const path = new URL(request.url).pathname;
  return `${proto}://${host}${path}`;
}

export function verifySquareWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  requestUrl?: string | null,
): void {
  if (!signatureHeader) {
    throw new AppError("UNAUTHORIZED", "Missing Square signature.", 401);
  }

  const signatureKey = getSquareWebhookSignatureKey();
  const candidates = getSquareWebhookNotificationUrlCandidates(requestUrl);
  if (candidates.length === 0) {
    throw new AppError(
      "INTERNAL_ERROR",
      "Set NEXT_PUBLIC_APP_URL or SQUARE_WEBHOOK_NOTIFICATION_URL for Square webhooks.",
      503,
    );
  }

  const valid = candidates.some((notificationUrl) =>
    isValidSquareSignature({
      notificationUrl,
      requestBody: rawBody,
      signatureKey,
      signatureHeader,
    }),
  );

  if (!valid) {
    throw new AppError("UNAUTHORIZED", "Invalid Square webhook signature.", 401);
  }
}

export function isValidSquareSignature(input: {
  notificationUrl: string;
  requestBody: string;
  signatureKey: string;
  signatureHeader: string;
}): boolean {
  const expected = createHmac("sha256", input.signatureKey)
    .update(input.notificationUrl + input.requestBody, "utf8")
    .digest("base64");
  const received = input.signatureHeader.trim();
  const expectedBuf = Buffer.from(expected);
  const receivedBuf = Buffer.from(received);
  if (expectedBuf.length !== receivedBuf.length) {
    return false;
  }
  return timingSafeEqual(expectedBuf, receivedBuf);
}

export type SquareWebhookPayment = {
  id?: string;
  status?: string;
  referenceId?: string | null;
};

export type SquareWebhookEvent = {
  type?: string;
  event_id?: string;
  data?: {
    object?: {
      payment?: SquareWebhookPayment;
    };
  };
};

export function parseSquareWebhookEvent(rawBody: string): SquareWebhookEvent {
  try {
    return JSON.parse(rawBody) as SquareWebhookEvent;
  } catch {
    throw new AppError("VALIDATION_ERROR", "Invalid Square webhook body.", 400);
  }
}
