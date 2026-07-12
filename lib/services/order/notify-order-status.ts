import type { OrderStatus } from "@prisma/client";
import { ORDER_STATUS_LABELS } from "@/lib/domain/order/types";
import { getAppBaseUrl } from "@/lib/integrations/email/resend-client";
import { sendEmailInBackground } from "@/lib/integrations/email/send";
import { buildOrderStatusEmail } from "@/lib/integrations/email/templates";
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

type EmailNotifyStatus =
  | "accepted"
  | "ready"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "completed"
  | "cancelled";

function isEmailNotifyStatus(status: OrderStatus): status is EmailNotifyStatus {
  return NOTIFY_STATUSES.has(status);
}

function trackingUrl(orderId: string, publicToken: string): string | null {
  const base = getAppBaseUrl();
  if (!base) {
    return null;
  }
  return `${base}/orders/${orderId}?token=${publicToken}`;
}

function orderStatusLabel(status: OrderStatus): string {
  switch (status) {
    case "pending_payment":
      return ORDER_STATUS_LABELS.pending_payment;
    case "pending_acceptance":
      return ORDER_STATUS_LABELS.pending_acceptance;
    case "accepted":
      return ORDER_STATUS_LABELS.accepted;
    case "preparing":
      return ORDER_STATUS_LABELS.preparing;
    case "ready":
      return ORDER_STATUS_LABELS.ready;
    case "ready_for_pickup":
      return ORDER_STATUS_LABELS.ready_for_pickup;
    case "out_for_delivery":
      return ORDER_STATUS_LABELS.out_for_delivery;
    case "completed":
      return ORDER_STATUS_LABELS.completed;
    case "cancelled":
      return ORDER_STATUS_LABELS.cancelled;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function buildWhatsAppMessage(input: {
  storeName: string;
  status: OrderStatus;
  fulfillmentType: "pickup" | "delivery";
  trackUrl: string | null;
  courierTrackingUrl?: string | null;
}): string {
  const label = orderStatusLabel(input.status);
  const lines = [`${input.storeName}: ${label}.`];

  if (input.status === "ready_for_pickup" || input.status === "ready") {
    if (input.fulfillmentType === "pickup") {
      lines.push("Your order is ready for pickup.");
    }
  }
  if (input.status === "out_for_delivery") {
    lines.push("Your order is on the way.");
  }
  if (input.status === "cancelled") {
    lines.push("If you were charged, contact the restaurant for a refund.");
  }

  if (input.courierTrackingUrl) {
    lines.push(`Courier: ${input.courierTrackingUrl}`);
  } else if (input.trackUrl) {
    lines.push(`Track: ${input.trackUrl}`);
  }

  return lines.join("\n");
}

function resolveNotifyEmail(input: {
  customerEmail?: string | null;
  userEmail?: string | null;
}): string | null {
  const fromOrder = input.customerEmail?.trim().toLowerCase() || "";
  if (fromOrder) return fromOrder;
  const fromUser = input.userEmail?.trim().toLowerCase() || "";
  return fromUser || null;
}

async function sendWhatsAppUpdate(input: {
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
    const body = buildWhatsAppMessage({
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

function sendEmailUpdate(input: {
  customerEmail?: string | null;
  userEmail?: string | null;
  customerName: string;
  storeName: string;
  orderId: string;
  publicToken: string;
  status: OrderStatus;
  fulfillmentType: "pickup" | "delivery";
  courierTrackingUrl?: string | null;
  note?: string | null;
}): void {
  if (!isEmailNotifyStatus(input.status)) {
    return;
  }

  const to = resolveNotifyEmail(input);
  if (!to) {
    logger.info("email.order_status_skipped_no_address", {
      orderId: input.orderId,
      status: input.status,
    });
    return;
  }

  const trackUrl = trackingUrl(input.orderId, input.publicToken);
  if (!trackUrl) {
    logger.warn("email.order_status_skipped_no_app_url", {
      orderId: input.orderId,
    });
    return;
  }

  const mail = buildOrderStatusEmail({
    customerName: input.customerName,
    storeName: input.storeName,
    status: input.status,
    fulfillmentType: input.fulfillmentType,
    trackUrl,
    courierTrackingUrl: input.courierTrackingUrl,
    note: input.note,
  });

  sendEmailInBackground({
    to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    idempotencyKey: `order-status/${input.orderId}/${input.status}`,
  });
}

export type OrderStatusNotifyInput = {
  customerPhone: string;
  customerEmail?: string | null;
  userEmail?: string | null;
  customerName: string;
  storeName: string;
  orderId: string;
  publicToken: string;
  status: OrderStatus;
  fulfillmentType: "pickup" | "delivery";
  courierTrackingUrl?: string | null;
  note?: string | null;
};

/**
 * Best-effort diner notify (email + WhatsApp). Never throws into order flows.
 * Call with `void notifyOrderStatus(...)`.
 */
export async function notifyOrderStatus(
  input: OrderStatusNotifyInput,
): Promise<void> {
  sendEmailUpdate(input);
  await sendWhatsAppUpdate(input);
}
