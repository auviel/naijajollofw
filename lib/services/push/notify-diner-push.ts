import type { OrderStatus } from "@prisma/client";
import { ORDER_STATUS_LABELS } from "@/lib/domain/order/types";
import { pushDeviceRepository } from "@/lib/db/repositories/push-device.repository";
import { sendExpoPush } from "@/lib/integrations/push/expo";
import { logger } from "@/lib/utils/logger";

export async function notifyDinerOrderPush(input: {
  userId?: string | null;
  orderId: string;
  publicToken: string;
  status: OrderStatus;
  fulfillmentType: "pickup" | "delivery";
  displayNumber?: string | null;
  storeName: string;
}): Promise<void> {
  if (!input.userId) {
    return;
  }

  try {
    const devices = await pushDeviceRepository.listTokensForUserApp(
      input.userId,
      "diner",
    );
    if (devices.length === 0) {
      return;
    }

    const label = ORDER_STATUS_LABELS[input.status] ?? input.status;
    const ref = input.displayNumber?.trim();

    await sendExpoPush(
      devices.map((device) => ({
        to: device.expoPushToken,
        title: ref ? `${ref} · ${label}` : label,
        body: `${input.storeName} updated your order.`,
        data: {
          orderId: input.orderId,
          publicToken: input.publicToken,
          status: input.status,
          fulfillmentType: input.fulfillmentType,
        },
        sound: "default",
        channelId: "order-updates",
        priority: "high",
      })),
    );
  } catch (error) {
    logger.error("push.diner_order_failed", {
      orderId: input.orderId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
