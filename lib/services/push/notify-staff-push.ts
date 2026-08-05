import { pushDeviceRepository } from "@/lib/db/repositories/push-device.repository";
import { sendExpoPush } from "@/lib/integrations/push/expo";
import { formatCadFromCents } from "@/lib/utils/currency";
import { logger } from "@/lib/utils/logger";

export async function notifyStaffNewOrderPush(input: {
  storeId: string;
  orderId: string;
  fulfillmentType: "pickup" | "delivery";
  totalCents: number;
  displayNumber?: string | null;
  itemSummary?: string | null;
}): Promise<void> {
  try {
    const devices = await pushDeviceRepository.listTokensForStoreApp(
      input.storeId,
      "staff",
    );
    if (devices.length === 0) {
      return;
    }

    const totalLabel = formatCadFromCents(input.totalCents);
    const kind = input.fulfillmentType === "delivery" ? "Delivery" : "Pickup";
    const ref = input.displayNumber?.trim() || "New order";

    await sendExpoPush(
      devices.map((device) => ({
        to: device.expoPushToken,
        title: `${ref} · ${kind}`,
        body: `${totalLabel}${input.itemSummary ? ` · ${input.itemSummary}` : ""}`,
        data: {
          orderId: input.orderId,
          kind: "new_order",
        },
        sound: "default",
        channelId: "new-orders",
        priority: "high",
      })),
    );
  } catch (error) {
    logger.error("push.staff_new_order_failed", {
      orderId: input.orderId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
