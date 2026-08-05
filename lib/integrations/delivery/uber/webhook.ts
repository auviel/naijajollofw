import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

const uberStatusChangedMetaSchema = z.object({
  status: z.string().min(1),
  external_order_id: z.string().optional(),
  order_id: z.string().optional(),
  courier_trip_id: z.string().optional(),
  is_returning: z.boolean().optional(),
});

export const uberStatusChangedWebhookSchema = z.object({
  event_id: z.string().min(1),
  event_type: z.string().min(1),
  event_time: z.number().optional(),
  resource_href: z.string().optional(),
  meta: uberStatusChangedMetaSchema,
});

export type UberStatusChangedWebhook = z.infer<typeof uberStatusChangedWebhookSchema>;

const uberDaasDeliveryStatusSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("event.delivery_status"),
  status: z.string().min(1),
  delivery_id: z.string().optional(),
  data: z
    .object({
      id: z.string().optional(),
      status: z.string().optional(),
      external_id: z.string().optional(),
      uuid: z.string().optional(),
      tracking_url: z.string().optional(),
    })
    .passthrough()
    .optional(),
});

export const UBER_STATUS_CHANGED_EVENT = "dapi.status_changed";
export const UBER_DAAS_DELIVERY_STATUS_EVENT = "event.delivery_status";

export type ParsedUberDeliveryWebhook = {
  eventId: string;
  eventType: string;
  status: string;
  providerDeliveryId?: string;
  providerOrderId?: string;
  externalOrderId?: string;
  resourceHref?: string;
};

/** Primary webhook signing key from dashboard, or client secret as fallback. */
export function getUberWebhookSigningSecret(): string | null {
  return (
    process.env.UBER_WEBHOOK_SIGNING_SECRET?.trim() ||
    process.env.UBER_CLIENT_SECRET?.trim() ||
    null
  );
}

/** Verify X-Uber-Signature HMAC-SHA256 of the raw request body. */
export function verifyUberWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex")
    .toLowerCase();

  const received = signatureHeader.trim().toLowerCase();

  if (expected.length !== received.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

export function parseUberStatusChangedWebhook(rawBody: string): UberStatusChangedWebhook {
  const json = JSON.parse(rawBody) as unknown;
  return uberStatusChangedWebhookSchema.parse(json);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Parse Uber Direct DaaS `event.delivery_status` or Eats Direct `dapi.status_changed`. */
export function parseUberDeliveryWebhook(
  rawBody: string,
): ParsedUberDeliveryWebhook | { ignore: true; eventType: string } {
  const json = JSON.parse(rawBody) as unknown;
  if (!isRecord(json)) {
    throw new Error("Invalid webhook payload");
  }

  const kind = typeof json.kind === "string" ? json.kind : undefined;
  const eventType =
    typeof json.event_type === "string" ? json.event_type : kind;

  if (
    kind === "event.courier_update" ||
    kind === "event.refund" ||
    eventType === "event.courier_update" ||
    eventType === "event.refund"
  ) {
    return { ignore: true, eventType: eventType ?? kind ?? "unknown" };
  }

  if (kind === UBER_DAAS_DELIVERY_STATUS_EVENT || eventType === UBER_DAAS_DELIVERY_STATUS_EVENT) {
    const payload = uberDaasDeliveryStatusSchema.parse(json);
    return {
      eventId: payload.id,
      eventType: UBER_DAAS_DELIVERY_STATUS_EVENT,
      status: payload.status,
      providerDeliveryId: payload.delivery_id ?? payload.data?.id,
      providerOrderId: payload.data?.uuid,
      externalOrderId: payload.data?.external_id,
    };
  }

  if (eventType === UBER_STATUS_CHANGED_EVENT || isRecord(json.meta)) {
    const payload = uberStatusChangedWebhookSchema.parse(json);
    return {
      eventId: payload.event_id,
      eventType: payload.event_type,
      status: payload.meta.status,
      providerDeliveryId: payload.meta.order_id,
      providerOrderId: payload.meta.order_id,
      externalOrderId: payload.meta.external_order_id,
      resourceHref: payload.resource_href,
    };
  }

  return { ignore: true, eventType: eventType ?? "unknown" };
}
