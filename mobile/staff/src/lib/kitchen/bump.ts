import type {
  FulfillmentMethod,
  FulfillmentType,
  OrderStatus,
  TransitionAction,
} from "@naijajollof/api-types";

export type PrimaryBump =
  | TransitionAction
  | { kind: "ready_delivery"; label: "Ready" }
  | { kind: "fulfill"; label: "Fulfill" };

export function primaryBumpFor(order: {
  status: OrderStatus;
  fulfillmentType: FulfillmentType;
  fulfillmentMethod: FulfillmentMethod;
}): PrimaryBump | null {
  // New: Accept → cooking (same transition as former Start).
  if (order.status === "pending_acceptance" || order.status === "accepted") {
    return { to: "preparing", label: "Accept", variant: "primary" };
  }

  if (order.status === "preparing") {
    if (order.fulfillmentType === "pickup") {
      return { to: "ready_for_pickup", label: "Ready", variant: "primary" };
    }
    // Delivery: choose method, then move to Ready.
    return { kind: "ready_delivery", label: "Ready" };
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

  if (
    order.status === "ready" &&
    order.fulfillmentType === "delivery" &&
    order.fulfillmentMethod === "manual"
  ) {
    return { to: "completed", label: "Complete", variant: "primary" };
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

export function isReadyDeliveryBump(
  bump: PrimaryBump,
): bump is { kind: "ready_delivery"; label: "Ready" } {
  return "kind" in bump && bump.kind === "ready_delivery";
}

export function isFulfillMethodBump(
  bump: PrimaryBump,
): bump is { kind: "fulfill"; label: "Fulfill" } {
  return "kind" in bump && bump.kind === "fulfill";
}
