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
    id: "placed",
    label: "Order received",
    description: "The restaurant has your order",
  },
  {
    id: "accepted",
    label: "Confirmed",
    description: "Kitchen accepted your order",
  },
  {
    id: "preparing",
    label: "Preparing",
    description: "Your food is being made",
  },
  {
    id: "ready",
    label: "Ready for pickup",
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
    id: "placed",
    label: "Order received",
    description: "The restaurant has your order",
  },
  {
    id: "accepted",
    label: "Confirmed",
    description: "Kitchen accepted your order",
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
    pending_payment: "placed",
    pending_acceptance: "placed",
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
      return `${storeName} has your order and will confirm shortly.`;
    case "accepted":
      return `Confirmed — usually ready in about ${prep} minutes.`;
    case "preparing":
      return `The kitchen is preparing your order (about ${prep} min total).`;
    case "ready":
      return fulfillmentType === "pickup"
        ? "Your order is ready — head over when you can."
        : "Your order is ready and a courier will pick it up soon.";
    case "ready_for_pickup":
      return "Your order is ready for pickup.";
    case "out_for_delivery":
      return "Your order is on the way.";
    case "completed":
      return fulfillmentType === "pickup"
        ? "Thanks — enjoy your meal!"
        : "Delivered — enjoy your meal!";
    case "cancelled":
      return "This order was cancelled. Contact the restaurant if you have questions.";
    default:
      return "We're updating your order status.";
  }
}
