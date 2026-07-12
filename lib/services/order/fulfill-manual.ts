import { requireStoreManager } from "@/lib/auth/session";
import {
  mapOrderToStaffDetail,
  orderRepository,
} from "@/lib/db/repositories/order.repository";
import type { StaffOrderDetail } from "@/lib/domain/order/types";
import { fulfillManualSchema } from "@/lib/domain/order/validation-staff";
import { notifyOrderStatusWhatsApp } from "@/lib/services/order/notify-order-status";
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

  if (existing.fulfillmentType !== "delivery") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Manual delivery is only for delivery orders.",
      400,
    );
  }

  if (existing.status !== "ready") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Order must be ready before dispatching delivery.",
      400,
    );
  }

  if (existing.fulfillmentMethod !== "unassigned") {
    throw new AppError(
      "VALIDATION_ERROR",
      "This order is already assigned a fulfillment method.",
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
    throw new AppError("NOT_FOUND", "Order not found.", 404);
  }

  void notifyOrderStatusWhatsApp({
    customerPhone: updated.customerPhone,
    storeName: updated.store?.name ?? "Restaurant",
    orderId: updated.id,
    publicToken: updated.publicToken,
    status: updated.status,
    fulfillmentType: updated.fulfillmentType,
  });

  return mapOrderToStaffDetail(updated);
}
