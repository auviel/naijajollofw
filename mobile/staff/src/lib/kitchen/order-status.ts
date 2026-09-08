import type { OrderStatus } from "@naijajollof/api-types";
import type { UiColors } from "@naijajollof/ui";

/**
 * Short kitchen labels — one glance, title case.
 * Prefer board language (New / Cooking) over raw API snake_case.
 */
const SHORT_LABEL = {
  pending_payment: "Payment",
  pending_acceptance: "New",
  accepted: "Accepted",
  preparing: "Cooking",
  ready: "Ready",
  ready_for_pickup: "Pickup",
  out_for_delivery: "Out",
  completed: "Done",
  cancelled: "Cancelled",
} as const satisfies Record<OrderStatus, string>;

function isOrderStatus(status: string): status is OrderStatus {
  return Object.hasOwn(SHORT_LABEL, status);
}

export function orderStatusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  if (isOrderStatus(status)) {
    return SHORT_LABEL[status];
  }
  return titleCaseWords(status);
}

export function orderStatusColor(
  status: string | null | undefined,
  colors: UiColors,
): string {
  switch (status as OrderStatus) {
    case "pending_acceptance":
      return colors.accent;
    case "accepted":
      return colors.secondary;
    case "preparing":
      return colors.accent;
    case "ready":
    case "ready_for_pickup":
      return colors.success;
    case "out_for_delivery":
      return colors.accent;
    case "completed":
    case "pending_payment":
      return colors.textSecondary;
    case "cancelled":
      return colors.danger;
    default:
      return colors.textSecondary;
  }
}

function titleCaseWords(raw: string): string {
  return raw
    .replaceAll("_", " ")
    .trim()
    .split(/\s+/)
    .map((word) =>
      word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word,
    )
    .join(" ");
}
