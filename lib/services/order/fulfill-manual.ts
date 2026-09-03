import { requireStoreManager } from "@/lib/auth/session";
import {
  mapOrderToStaffDetail,
  orderRepository,
} from "@/lib/db/repositories/order.repository";
import { canFulfillManualDelivery } from "@/lib/domain/order/fulfill-preconditions";
import type { StaffOrderDetail } from "@/lib/domain/order/types";
import { fulfillManualSchema } from "@/lib/domain/order/validation-staff";
import { notifyOrderStatus } from "@/lib/services/order/notify-order-status";
import { AppError } from "@/lib/utils/errors";

export async function fulfillOrderManual(
  orderId: string,
  input: unknown,
): Promise<StaffOrderDetail> {
  const user = await requireStoreManager();
  const parsed = fulfillManualSchema.parse(input);

  const existing = await orderRepository.findByIdForStore(orderId, user.storeId);
  if (!existing) {
    throw new AppError("NOT_FOUND", "Order not found.", 404);
  }

  if (
    !canFulfillManualDelivery({
      status: existing.status,
      fulfillmentType: existing.fulfillmentType,
      fulfillmentMethod: existing.fulfillmentMethod,
      deliveryId: existing.deliveryId,
    })
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      existing.fulfillmentType !== "delivery"
        ? "Manual delivery is only for delivery orders."
        : existing.status !== "ready"
          ? "Order must be ready before dispatching delivery."
          : "This order is already assigned a fulfillment method.",
      400,
    );
  }

  const updated = await orderRepository.fulfillManual({
    orderId,
    storeId: user.storeId,
    actor: user.email,
    note: parsed.note,
  });

  if (!updated) {
    throw new AppError(
      "CONFLICT",
      "This order was already assigned a fulfillment method. Refresh and try again.",
      409,
    );
  }

  void notifyOrderStatus({
    userId: updated.userId,
    customerPhone: updated.customerPhone,
    customerEmail: updated.customerEmail,
    userEmail: updated.user?.email,
    customerName: updated.customerName,
    storeName: updated.store?.name ?? "Restaurant",
    orderId: updated.id,
    publicToken: updated.publicToken,
    status: updated.status,
    fulfillmentType: updated.fulfillmentType,
    displayNumber: updated.displayNumber,
  });

  return mapOrderToStaffDetail(updated);
}
