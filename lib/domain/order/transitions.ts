import type { FulfillmentMethod, FulfillmentType, OrderStatus } from "@prisma/client";

/** Base kitchen transitions (fulfillment-aware overrides applied in helpers). */
const STAFF_TRANSITIONS = new Map<OrderStatus, readonly OrderStatus[]>([
  ["pending_acceptance", ["accepted", "cancelled"]],
  ["accepted", ["preparing", "cancelled"]],
  ["preparing", ["ready", "cancelled"]],
  ["ready", ["cancelled"]],
  ["ready_for_pickup", ["completed", "cancelled"]],
  ["out_for_delivery", ["completed", "cancelled"]],
]);

export type TransitionContext = {
  fulfillmentType: FulfillmentType;
  fulfillmentMethod?: FulfillmentMethod;
};

export type TransitionAction = {
  to: OrderStatus;
  label: string;
  variant: "primary" | "secondary" | "danger";
};

const ACTION_META = new Map<
  OrderStatus,
  { label: string; variant: TransitionAction["variant"] }
>([
  ["accepted", { label: "Accept", variant: "primary" }],
  ["preparing", { label: "Start preparing", variant: "primary" }],
  ["ready", { label: "Mark ready", variant: "primary" }],
  ["ready_for_pickup", { label: "Ready for pickup", variant: "primary" }],
  ["completed", { label: "Complete", variant: "primary" }],
  ["cancelled", { label: "Cancel order", variant: "danger" }],
]);

export function getAllowedTransitions(
  from: OrderStatus,
  ctx?: TransitionContext,
): readonly OrderStatus[] {
  if (from === "ready" && ctx?.fulfillmentType === "pickup") {
    return ["ready_for_pickup", "cancelled"];
  }

  // Delivery from ready is fulfilled via dedicated endpoints (manual / deliverGO).
  return STAFF_TRANSITIONS.get(from) ?? [];
}

export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  ctx?: TransitionContext,
): boolean {
  return getAllowedTransitions(from, ctx).includes(to);
}

export function getTransitionActions(
  from: OrderStatus,
  ctx?: TransitionContext,
): TransitionAction[] {
  return getAllowedTransitions(from, ctx).flatMap((to) => {
    const meta = ACTION_META.get(to);
    if (!meta) {
      return [];
    }
    return [{ to, label: meta.label, variant: meta.variant }];
  });
}

/** Board columns for the live kitchen view. */
export const KITCHEN_BOARD_COLUMNS = [
  {
    id: "new",
    title: "New",
    statuses: ["pending_acceptance"] as const satisfies readonly OrderStatus[],
  },
  {
    id: "accepted",
    title: "Accepted",
    statuses: ["accepted"] as const satisfies readonly OrderStatus[],
  },
  {
    id: "preparing",
    title: "Preparing",
    statuses: ["preparing"] as const satisfies readonly OrderStatus[],
  },
  {
    id: "ready",
    title: "Ready / Out",
    statuses: [
      "ready",
      "ready_for_pickup",
      "out_for_delivery",
    ] as const satisfies readonly OrderStatus[],
  },
] as const;

export const ACTIVE_KITCHEN_STATUSES: OrderStatus[] = [
  "pending_acceptance",
  "accepted",
  "preparing",
  "ready",
  "ready_for_pickup",
  "out_for_delivery",
];

export type StaffOrderListFilter =
  | "active"
  | "new"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled"
  | "all";

export type StaffOrderChannel = "all" | "kitchen" | "courier";

export function parseStaffOrderListFilter(
  value: string | undefined,
): StaffOrderListFilter {
  switch (value) {
    case "new":
    case "preparing":
    case "ready":
    case "completed":
    case "cancelled":
    case "all":
    case "active":
      return value;
    default:
      return "active";
  }
}

export function parseStaffOrderChannel(
  value: string | undefined,
): StaffOrderChannel {
  switch (value) {
    case "kitchen":
    case "courier":
    case "all":
      return value;
    default:
      return "all";
  }
}

export function statusesForStaffFilter(
  filter: StaffOrderListFilter,
): OrderStatus[] | undefined {
  switch (filter) {
    case "new":
      return ["pending_acceptance"];
    case "preparing":
      return ["accepted", "preparing"];
    case "ready":
      return ["ready", "ready_for_pickup", "out_for_delivery"];
    case "completed":
      return ["completed"];
    case "cancelled":
      return ["cancelled"];
    case "active":
      return ACTIVE_KITCHEN_STATUSES;
    case "all":
      return undefined;
  }
}

/** Map carrier delivery status → restaurant order status when linked. */
export function mapDeliveryStatusToOrderStatus(
  deliveryStatus: string,
): OrderStatus | null {
  switch (deliveryStatus) {
    case "pending":
    case "scheduled":
    case "en_route_to_pickup":
    case "arrived_at_pickup":
    case "en_route_to_dropoff":
    case "arrived_at_dropoff":
      return "out_for_delivery";
    case "completed":
      return "completed";
    default:
      return null;
  }
}
