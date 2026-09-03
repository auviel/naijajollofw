import type {
  FulfillmentMethod,
  FulfillmentType,
  OrderStatus,
} from "@prisma/client";

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

export function canFulfillManualDelivery(
  order: FulfillOrderSnapshot,
): boolean {
  return canClaimCourierDispatch(order);
}
