import type { DeliveryStatus } from "@/lib/domain/delivery/types";
import { isTerminalStatus } from "@/lib/domain/delivery/status";

export type TimelineStepState = "complete" | "current" | "upcoming" | "skipped";

export type TimelineStep = {
  status: DeliveryStatus;
  label: string;
  state: TimelineStepState;
};

const TIMELINE_STEPS: { status: DeliveryStatus; label: string }[] = [
  { status: "pending", label: "Pending" },
  { status: "scheduled", label: "Scheduled" },
  { status: "en_route_to_pickup", label: "En route to pickup" },
  { status: "arrived_at_pickup", label: "At pickup" },
  { status: "en_route_to_dropoff", label: "En route to dropoff" },
  { status: "arrived_at_dropoff", label: "At dropoff" },
  { status: "completed", label: "Completed" },
];

const STATUS_ORDER = TIMELINE_STEPS.map((step) => step.status);

function statusIndex(status: DeliveryStatus): number {
  if (status === "draft") {
    return 0;
  }

  const index = STATUS_ORDER.indexOf(status);
  return index >= 0 ? index : 0;
}

export function buildDeliveryTimeline(
  status: DeliveryStatus,
  hadScheduledPickup: boolean,
): { steps: TimelineStep[]; terminal: "cancelled" | "failed" | null } {
  if (status === "cancelled" || status === "failed") {
    return {
      steps: TIMELINE_STEPS.map((step) => ({
        ...step,
        state: "upcoming",
      })),
      terminal: status,
    };
  }

  const currentIndex = statusIndex(status);

  const steps = TIMELINE_STEPS.map((step, index) => {
    if (step.status === "scheduled" && !hadScheduledPickup && currentIndex > 0) {
      return { ...step, state: "skipped" as const };
    }

    if (index < currentIndex) {
      return { ...step, state: "complete" as const };
    }

    if (index === currentIndex) {
      return { ...step, state: "current" as const };
    }

    return { ...step, state: "upcoming" as const };
  });

  return { steps, terminal: null };
}

export function shouldRefreshDeliveryDetail(status: DeliveryStatus): boolean {
  return !isTerminalStatus(status);
}
