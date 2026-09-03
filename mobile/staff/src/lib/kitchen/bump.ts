import type {
  FulfillmentMethod,
  FulfillmentType,
  OrderStatus,
  TransitionAction,
} from "@naijajollof/api-types";

export type PrimaryBump =
  | TransitionAction
  | { kind: "fulfill"; label: "Fulfill" };

export function primaryBumpFor(order: {
  status: OrderStatus;
  fulfillmentType: FulfillmentType;
  fulfillmentMethod: FulfillmentMethod;
}): PrimaryBump | null {
  if (order.status === "pending_acceptance" || order.status === "accepted") {
    return { to: "preparing", label: "Start", variant: "primary" };
  }
  if (order.status === "preparing") {
    if (order.fulfillmentType === "pickup") {
      return { to: "ready_for_pickup", label: "Ready", variant: "primary" };
    }
    return { to: "ready", label: "Ready", variant: "primary" };
  }
  if (order.status === "ready_for_pickup") {
    return { to: "completed", label: "Picked up", variant: "primary" };
  }
  if (order.status === "out_for_delivery") {
    return { to: "completed", label: "Complete", variant: "primary" };
  }
  if (
    order.status === "ready" &&
    order.fulfillmentType === "delivery" &&
    order.fulfillmentMethod === "unassigned"
  ) {
    return { kind: "fulfill", label: "Fulfill" };
  }
  if (order.status === "ready" && order.fulfillmentType === "pickup") {
    return { to: "completed", label: "Picked up", variant: "primary" };
  }
  return null;
}

export function isStatusBump(
  bump: PrimaryBump,
): bump is TransitionAction {
  return "to" in bump;
}
