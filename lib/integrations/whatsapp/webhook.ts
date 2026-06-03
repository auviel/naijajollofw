import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

const whatsAppTextMessageSchema = z.object({
  from: z.string().min(1),
  id: z.string().min(1),
  timestamp: z.string().optional(),
  type: z.literal("text"),
  text: z.object({
    body: z.string(),
  }),
});

const whatsAppWebhookValueSchema = z.object({
  messaging_product: z.literal("whatsapp").optional(),
  metadata: z
    .object({
      display_phone_number: z.string().optional(),
      phone_number_id: z.string().optional(),
    })
    .optional(),
  messages: z.array(whatsAppTextMessageSchema).optional(),
  statuses: z.array(z.unknown()).optional(),
});

const whatsAppWebhookChangeSchema = z.object({
  field: z.string(),
  value: whatsAppWebhookValueSchema,
});

const whatsAppWebhookEntrySchema = z.object({
  id: z.string().optional(),
  changes: z.array(whatsAppWebhookChangeSchema),
});

export const whatsAppWebhookPayloadSchema = z.object({
  object: z.string(),
  entry: z.array(whatsAppWebhookEntrySchema),
});

export type WhatsAppIncomingMessage = {
  from: string;
  messageId: string;
  text: string;
  phoneNumberId: string;
  timestamp?: string;
};

export function verifyWebhookChallenge(input: {
  mode: string | null;
  verifyToken: string | null;
  challenge: string | null;
  expectedVerifyToken: string;
}): string | null {
  if (
    input.mode === "subscribe" &&
    input.verifyToken === input.expectedVerifyToken &&
    input.challenge
  ) {
    return input.challenge;
  }

  return null;
}

/** Verify X-Hub-Signature-256 HMAC-SHA256 of the raw request body. */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  if (!signatureHeader?.startsWith("sha256=")) {
    return false;
  }

  const received = signatureHeader.slice("sha256=".length).trim();
  const expected = createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex");

  if (expected.length !== received.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

export function parseIncomingMessages(rawBody: string): WhatsAppIncomingMessage[] {
  const json = JSON.parse(rawBody) as unknown;
  const payload = whatsAppWebhookPayloadSchema.parse(json);
  const messages: WhatsAppIncomingMessage[] = [];

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      if (change.field !== "messages" || !change.value.messages?.length) {
        continue;
      }

      const phoneNumberId = change.value.metadata?.phone_number_id;
      if (!phoneNumberId) {
        continue;
      }

      for (const message of change.value.messages) {
        messages.push({
          from: message.from,
          messageId: message.id,
          text: message.text.body,
          phoneNumberId,
          timestamp: message.timestamp,
        });
      }
    }
  }

  return messages;
}
