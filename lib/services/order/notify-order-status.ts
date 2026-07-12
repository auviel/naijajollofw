import type { OrderStatus } from "@prisma/client";
import { ORDER_STATUS_LABELS } from "@/lib/domain/order/types";
import {
  getWhatsAppConfig,
  isWhatsAppEnabled,
} from "@/lib/integrations/whatsapp/config";
import { sendTextMessage } from "@/lib/integrations/whatsapp/client";
import { logger } from "@/lib/utils/logger";

/** Opt-in diner updates — separate from staff WhatsApp dispatch. */
export function isOrderWhatsAppUpdatesEnabled(): boolean {
  return (
    isWhatsAppEnabled() &&
    process.env.WHATSAPP_ORDER_UPDATES === "true" &&
    getWhatsAppConfig() !== null
  );
}

const NOTIFY_STATUSES = new Set<OrderStatus>([
  "accepted",
  "ready",
  "ready_for_pickup",
  "out_for_delivery",
  "completed",
  "cancelled",
]);

function trackingUrl(orderId: string, publicToken: string): string | null {
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (!base) {
    return null;
  }
  return `${base}/orders/${orderId}?token=${publicToken}`;
}

function buildMessage(input: {
  storeName: string;
  status: OrderStatus;
  fulfillmentType: "pickup" | "delivery";
  trackUrl: string | null;
  courierTrackingUrl?: string | null;
}): string {
  const label = ORDER_STATUS_LABELS[input.status];
  const lines = [`${input.storeName}: ${label}.`];

  if (input.status === "ready_for_pickup" || input.status === "ready") {
    if (input.fulfillmentType === "pickup") {
      lines.push("Your order is ready for pickup.");
    }
  }
  if (input.status === "out_for_delivery") {
    lines.push("Your order is on the way.");
  }

  if (input.courierTrackingUrl) {
    lines.push(`Courier: ${input.courierTrackingUrl}`);
  } else if (input.trackUrl) {
    lines.push(`Track: ${input.trackUrl}`);
  }

  return lines.join("\n");
}

/** Best-effort WhatsApp note to the diner. Never throws into order flows. */
export async function notifyOrderStatusWhatsApp(input: {
  customerPhone: string;
  storeName: string;
  orderId: string;
  publicToken: string;
  status: OrderStatus;
  fulfillmentType: "pickup" | "delivery";
  courierTrackingUrl?: string | null;
}): Promise<void> {
  if (!isOrderWhatsAppUpdatesEnabled()) {
    return;
  }
  if (!NOTIFY_STATUSES.has(input.status)) {
    return;
  }

  try {
    const body = buildMessage({
      storeName: input.storeName,
      status: input.status,
      fulfillmentType: input.fulfillmentType,
      trackUrl: trackingUrl(input.orderId, input.publicToken),
      courierTrackingUrl: input.courierTrackingUrl,
    });

    await sendTextMessage({
      to: input.customerPhone,
      body,
    });
  } catch (error) {
    logger.error("order.whatsapp_notify.failed", {
      orderId: input.orderId,
      status: input.status,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
