import { WebhooksHelper } from "square";
import {
  getSquareWebhookNotificationUrl,
  getSquareWebhookSignatureKey,
} from "@/lib/integrations/payments/square/config";
import { AppError } from "@/lib/utils/errors";

export async function verifySquareWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): Promise<void> {
  if (!signatureHeader) {
    throw new AppError("UNAUTHORIZED", "Missing Square signature.", 401);
  }

  const valid = await WebhooksHelper.verifySignature({
    requestBody: rawBody,
    signatureHeader,
    signatureKey: getSquareWebhookSignatureKey(),
    notificationUrl: getSquareWebhookNotificationUrl(),
  });

  if (!valid) {
    throw new AppError("UNAUTHORIZED", "Invalid Square webhook signature.", 401);
  }
}

export type SquareWebhookPayment = {
  id?: string;
  status?: string;
  referenceId?: string | null;
};

export type SquareWebhookEvent = {
  type?: string;
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
