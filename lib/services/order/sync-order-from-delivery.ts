import type { DeliveryStatus } from "@prisma/client";
import { orderRepository } from "@/lib/db/repositories/order.repository";
import { mapDeliveryStatusToOrderStatus } from "@/lib/domain/order/transitions";
import { notifyOrderStatus } from "@/lib/services/order/notify-order-status";
import { logger } from "@/lib/utils/logger";

/** When a linked Delivery status changes, mirror progress onto the Order. */
export async function syncOrderFromLinkedDelivery(delivery: {
  id: string;
  status: DeliveryStatus;
  trackingUrl?: string | null;
}): Promise<void> {
  const order = await orderRepository.findByDeliveryId(delivery.id);
  if (!order) {
    return;
  }

  const next = mapDeliveryStatusToOrderStatus(delivery.status);
  if (!next) {
    if (delivery.status === "cancelled" || delivery.status === "failed") {
      logger.info("order.sync.carrier_failed", {
        orderId: order.id,
        deliveryId: delivery.id,
        deliveryStatus: delivery.status,
      });
    }
    return;
  }

  if (order.status === next) {
    return;
  }

  if (order.status === "completed" || order.status === "cancelled") {
    return;
  }

  const updated = await orderRepository.applyLinkedDeliveryStatus({
    orderId: order.id,
    to: next,
    note: `Carrier status → ${delivery.status}`,
  });

  logger.info("order.sync.from_delivery", {
    orderId: order.id,
    deliveryId: delivery.id,
    from: order.status,
    to: next,
  });

  if (updated && (next === "out_for_delivery" || next === "completed")) {
    void notifyOrderStatus({
      customerPhone: updated.customerPhone,
      customerEmail: updated.customerEmail,
      userEmail: updated.user?.email,
      customerName: updated.customerName,
      storeName: updated.store?.name ?? "Restaurant",
      orderId: updated.id,
      publicToken: updated.publicToken,
      status: updated.status,
      fulfillmentType: updated.fulfillmentType,
      courierTrackingUrl:
        delivery.trackingUrl ?? updated.delivery?.trackingUrl ?? null,
    });
  }
}
