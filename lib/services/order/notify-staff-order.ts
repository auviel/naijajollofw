import { storeRepository } from "@/lib/db/repositories/store.repository";
import { userRepository } from "@/lib/db/repositories/user.repository";
import { getAppBaseUrl } from "@/lib/integrations/email/resend-client";
import { sendEmailInBackground } from "@/lib/integrations/email/send";
import { mergeStaffNotifyRecipients } from "@/lib/integrations/email/staff-recipients";
import {
  buildStaffNewOrderEmail,
  buildStaffOrderCancelledEmail,
} from "@/lib/integrations/email/templates";
import { formatCadFromCents } from "@/lib/utils/currency";
import { logger } from "@/lib/utils/logger";

export type StaffOrderNotifyKind = "new_order" | "cancelled";

export type NotifyStaffOrderInput = {
  storeId: string;
  storeName: string;
  orderId: string;
  kind: StaffOrderNotifyKind;
  customerName: string;
  customerPhone: string;
  fulfillmentType: "pickup" | "delivery";
  totalCents: number;
  itemSummary: string;
  scheduledLabel?: string | null;
  note?: string | null;
};

function dashboardOrderUrl(orderId: string): string | null {
  const base = getAppBaseUrl();
  if (!base) return null;
  return `${base}/dashboard/orders/${orderId}`;
}

/**
 * Best-effort staff email for kitchen attention events.
 * Never throws into checkout / webhook flows — call with `void notifyStaffOrder(...)`.
 */
export async function notifyStaffOrder(
  input: NotifyStaffOrderInput,
): Promise<void> {
  try {
    const [store, managers] = await Promise.all([
      storeRepository.findById(input.storeId),
      userRepository.listStoreManagerEmails(input.storeId),
    ]);
    const recipients = mergeStaffNotifyRecipients({
      storeEmail: store?.email,
      managerEmails: managers,
    });
    if (recipients.length === 0) {
      logger.info("email.staff_order_skipped_no_recipients", {
        orderId: input.orderId,
        kind: input.kind,
      });
      return;
    }

    const dashboardUrl = dashboardOrderUrl(input.orderId);
    if (!dashboardUrl) {
      logger.warn("email.staff_order_skipped_no_app_url", {
        orderId: input.orderId,
      });
      return;
    }

    const totalLabel = formatCadFromCents(input.totalCents);

    if (input.kind === "new_order") {
      const mail = buildStaffNewOrderEmail({
        storeName: input.storeName,
        orderId: input.orderId,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        fulfillmentType: input.fulfillmentType,
        totalLabel,
        itemSummary: input.itemSummary || "See dashboard for items",
        dashboardUrl,
        scheduledLabel: input.scheduledLabel,
      });
      for (const to of recipients) {
        sendEmailInBackground({
          to,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
          idempotencyKey: `staff-order-new/${input.orderId}/${to}`,
        });
      }
      return;
    }

    const mail = buildStaffOrderCancelledEmail({
      storeName: input.storeName,
      orderId: input.orderId,
      customerName: input.customerName,
      totalLabel,
      dashboardUrl,
      note: input.note,
    });
    for (const to of recipients) {
      sendEmailInBackground({
        to,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        idempotencyKey: `staff-order-cancelled/${input.orderId}/${to}`,
      });
    }
  } catch (error) {
    logger.error("email.staff_order_failed", {
      orderId: input.orderId,
      kind: input.kind,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export function summarizeOrderLineItems(
  lines: Array<{ name: string; quantity: number }>,
): string {
  if (lines.length === 0) return "No items";
  return lines
    .map((line) =>
      line.quantity > 1 ? `${line.quantity}× ${line.name}` : line.name,
    )
    .join(", ");
}
