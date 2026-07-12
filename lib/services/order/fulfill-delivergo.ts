import { requireStoreManager } from "@/lib/auth/session";
import {
  mapOrderToStaffDetail,
  orderRepository,
} from "@/lib/db/repositories/order.repository";
import type { StaffOrderDetail } from "@/lib/domain/order/types";
import { fulfillDelivergoSchema } from "@/lib/domain/order/validation-staff";
import { createDeliveryForStore } from "@/lib/services/delivery/create-delivery";
import { notifyOrderStatusWhatsApp } from "@/lib/services/order/notify-order-status";
import { AppError } from "@/lib/utils/errors";

export async function fulfillOrderDelivergo(
  orderId: string,
  input: unknown,
): Promise<StaffOrderDetail> {
  const user = await requireStoreManager();
  const parsed = fulfillDelivergoSchema.parse(input);

  const existing = await orderRepository.findByIdForStore(orderId, user.storeId);
  if (!existing) {
    throw new AppError("NOT_FOUND", "Order not found.", 404);
  }

  if (existing.fulfillmentType !== "delivery") {
    throw new AppError(
      "VALIDATION_ERROR",
      "deliverGO dispatch is only for delivery orders.",
      400,
    );
  }

  if (existing.status !== "ready") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Order must be ready before dispatching a courier.",
      400,
    );
  }

  if (existing.fulfillmentMethod !== "unassigned" || existing.deliveryId) {
    throw new AppError(
      "VALIDATION_ERROR",
      "This order is already assigned a fulfillment method.",
      400,
    );
  }

  if (!existing.dropoffAddress) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Delivery order is missing a dropoff address.",
      400,
    );
  }

  const created = await createDeliveryForStore(
    user.storeId,
    {
      providerId: parsed.providerId,
      quoteId: parsed.quoteId,
      dropoffName: existing.customerName,
      dropoffPhone: existing.customerPhone,
      dropoffAddress: existing.dropoffAddress,
      scheduledPickupAt: parsed.scheduledPickupAt,
      idempotencyKey: parsed.idempotencyKey ?? `order-${orderId}-${parsed.quoteId}`,
    },
    { source: "order" },
  );

  const updated = await orderRepository.linkDelivergoDelivery({
    orderId,
    storeId: user.storeId,
    deliveryId: created.id,
    actor: user.email,
  });

  if (!updated) {
    throw new AppError("NOT_FOUND", "Order not found after dispatch.", 404);
  }

  void notifyOrderStatusWhatsApp({
    customerPhone: updated.customerPhone,
    storeName: updated.store?.name ?? "Restaurant",
    orderId: updated.id,
    publicToken: updated.publicToken,
    status: updated.status,
    fulfillmentType: updated.fulfillmentType,
    courierTrackingUrl: created.trackingUrl ?? updated.delivery?.trackingUrl,
  });

  return mapOrderToStaffDetail(updated);
}
