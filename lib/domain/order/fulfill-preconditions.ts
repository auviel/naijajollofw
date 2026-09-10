import type {
  FulfillmentMethod,
  FulfillmentType,
  OrderStatus,
} from "@/generated/prisma-node/client";

export type FulfillOrderSnapshot = {
  status: OrderStatus;
  fulfillmentType: FulfillmentType;
  fulfillmentMethod: FulfillmentMethod;
  deliveryId: string | null;
};

export function canClaimCourierDispatch(
  order: FulfillOrderSnapshot,
): boolean {
  return (
    order.fulfillmentType === "delivery" &&
    order.status === "ready" &&
    order.fulfillmentMethod === "unassigned" &&
    order.deliveryId == null
  );
}

/** Assign manual method while staying on Ready (choose method at Ready bump). */
export function canAssignManualDelivery(
  order: FulfillOrderSnapshot,
): boolean {
  return canClaimCourierDispatch(order);
}

/**
 * Legacy: mark manual delivery as out for delivery.
 * Prefer assign-manual + complete (Fulfill) for the kitchen Ready path.
 */
export function canFulfillManualDelivery(
  order: FulfillOrderSnapshot,
): boolean {
  return canClaimCourierDispatch(order);
}
