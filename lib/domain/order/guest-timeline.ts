import type { FulfillmentType, OrderStatus } from "@prisma/client";

export type GuestTimelineStepState = "complete" | "current" | "upcoming";

export type GuestTimelineStep = {
  id: string;
  label: string;
  description: string;
  state: GuestTimelineStepState;
};

type TimelineDef = {
  id: string;
  label: string;
  description: string;
};

const PICKUP_STEPS: TimelineDef[] = [
  {
    id: "accepted",
    label: "Confirmed",
    description: "The kitchen has your order",
  },
  {
    id: "preparing",
    label: "Preparing",
    description: "Your food is being made",
  },
  {
    id: "ready",
    label: "Ready",
    description: "Come collect your order",
  },
  {
    id: "completed",
    label: "Picked up",
    description: "Enjoy your meal",
  },
];

const DELIVERY_STEPS: TimelineDef[] = [
  {
    id: "accepted",
    label: "Confirmed",
    description: "The kitchen has your order",
  },
  {
    id: "preparing",
    label: "Preparing",
    description: "Your food is being made",
  },
  {
    id: "ready",
    label: "Ready",
    description: "Waiting for a courier",
  },
  {
    id: "out",
    label: "On the way",
    description: "Your order is out for delivery",
  },
  {
    id: "completed",
    label: "Delivered",
    description: "Enjoy your meal",
  },
];

function currentStepIndex(defs: TimelineDef[], status: OrderStatus): number {
  const statusToStepId: Partial<Record<OrderStatus, string>> = {
    pending_payment: "accepted",
    pending_acceptance: "accepted",
    accepted: "accepted",
    preparing: "preparing",
    ready: "ready",
    ready_for_pickup: "ready",
    out_for_delivery: "out",
    completed: "completed",
  };

  const stepId = statusToStepId[status] ?? "placed";
  const found = defs.findIndex((d) => d.id === stepId);
  return found >= 0 ? found : 0;
}

export function buildGuestOrderTimeline(
  status: OrderStatus,
  fulfillmentType: FulfillmentType,
): { steps: GuestTimelineStep[]; cancelled: boolean } {
  const defs = fulfillmentType === "pickup" ? PICKUP_STEPS : DELIVERY_STEPS;

  if (status === "cancelled") {
    return {
      cancelled: true,
      steps: defs.map((step) => ({
        id: step.id,
        label: step.label,
        description: step.description,
        state: "upcoming" as const,
      })),
    };
  }

  const current = currentStepIndex(defs, status);

  return {
    cancelled: false,
    steps: defs.map((step, index) => ({
      id: step.id,
      label: step.label,
      description: step.description,
      state:
        index < current
          ? ("complete" as const)
          : index === current
            ? ("current" as const)
            : ("upcoming" as const),
    })),
  };
}

export function getGuestOrderHeadline(
  status: OrderStatus,
  fulfillmentType: FulfillmentType,
): string {
  switch (status) {
    case "pending_payment":
    case "pending_acceptance":
      return "Order received";
    case "accepted":
      return "Confirmed";
    case "preparing":
      return "Preparing";
    case "ready":
      return fulfillmentType === "pickup" ? "Ready for pickup" : "Ready";
    case "ready_for_pickup":
      return "Ready for pickup";
    case "out_for_delivery":
      return "On the way";
    case "completed":
      return fulfillmentType === "pickup" ? "Picked up" : "Delivered";
    case "cancelled":
      return "Cancelled";
    default:
      return "Order";
  }
}

export function buildGuestStatusMessage(input: {
  status: OrderStatus;
  fulfillmentType: FulfillmentType;
  prepMinutes: number;
  storeName: string;
}): string {
  const { status, fulfillmentType, prepMinutes, storeName } = input;
  const prep = Math.max(5, Math.min(prepMinutes, 180));

  switch (status) {
    case "pending_acceptance":
      return `${storeName} will confirm shortly.`;
    case "accepted":
      return "";
    case "preparing":
      return `About ${prep} min.`;
    case "ready":
      return fulfillmentType === "pickup"
        ? "Come collect when you can."
        : "A courier will pick it up soon.";
    case "ready_for_pickup":
      return "Come collect when you can.";
    case "out_for_delivery":
      return "";
    case "completed":
      return "Thanks — enjoy your meal!";
    case "cancelled":
      return "Contact the restaurant if you have questions.";
    default:
      return "";
  }
}
