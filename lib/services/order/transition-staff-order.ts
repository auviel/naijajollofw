import type { OrderStatus } from "@prisma/client";
import { requireStoreManager } from "@/lib/auth/session";
import {
  mapOrderToStaffDetail,
  orderRepository,
} from "@/lib/db/repositories/order.repository";
import type { StaffOrderDetail } from "@/lib/domain/order/types";
import { canTransition } from "@/lib/domain/order/transitions";
import { orderTransitionSchema } from "@/lib/domain/order/validation-staff";
import { notifyOrderStatus } from "@/lib/services/order/notify-order-status";
import {
  notifyStaffOrder,
  summarizeOrderLineItems,
} from "@/lib/services/order/notify-staff-order";
import { AppError } from "@/lib/utils/errors";

export async function transitionStaffOrder(
  orderId: string,
  input: unknown,
): Promise<StaffOrderDetail> {
  const user = await requireStoreManager();
  const parsed = orderTransitionSchema.parse(input);

  const existing = await orderRepository.findByIdForStore(orderId, user.storeId);
  if (!existing) {
    throw new AppError("NOT_FOUND", "Order not found.", 404);
  }

  const to = parsed.to as OrderStatus;
  const ctx = {
    fulfillmentType: existing.fulfillmentType,
    fulfillmentMethod: existing.fulfillmentMethod,
  };

  if (!canTransition(existing.status, to, ctx)) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Cannot move order from ${existing.status} to ${to}.`,
      400,
    );
  }

  const updated = await orderRepository.transitionStatus({
    orderId,
    storeId: user.storeId,
    to,
    actor: user.email,
    note: parsed.note?.trim() || defaultTransitionNote(to),
  });

  if (!updated) {
    throw new AppError("NOT_FOUND", "Order not found.", 404);
  }

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
    courierTrackingUrl: updated.delivery?.trackingUrl,
    note: parsed.note?.trim() || null,
  });

  if (updated.status === "cancelled") {
    void notifyStaffOrder({
      storeId: updated.storeId,
      storeName: updated.store?.name ?? "Restaurant",
      orderId: updated.id,
      kind: "cancelled",
      customerName: updated.customerName,
      customerPhone: updated.customerPhone,
      fulfillmentType: updated.fulfillmentType,
      totalCents: updated.totalCents,
      itemSummary: summarizeOrderLineItems(updated.lineItems),
      note: parsed.note?.trim() || defaultTransitionNote("cancelled"),
    });
  }

  return mapOrderToStaffDetail(updated);
}

function defaultTransitionNote(to: OrderStatus): string {
  switch (to) {
    case "accepted":
      return "Order accepted";
    case "preparing":
      return "Kitchen started preparing";
    case "ready":
      return "Order marked ready";
    case "ready_for_pickup":
      return "Ready for customer pickup";
    case "completed":
      return "Order completed";
    case "cancelled":
      return "Order cancelled by staff";
    default:
      return `Status → ${to}`;
  }
}
