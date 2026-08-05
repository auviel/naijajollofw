import { isKitchenBoardDeferred } from "@/lib/domain/order/kitchen-schedule";
import type { StaffOrderListItem } from "@/lib/domain/order/types";

export const STAFF_NOTIF_LAST_SEEN_KEY = "staffNotifLastSeenAt";

export function readStaffNotifLastSeenAt(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STAFF_NOTIF_LAST_SEEN_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeStaffNotifLastSeenAt(ms: number = Date.now()): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STAFF_NOTIF_LAST_SEEN_KEY, String(ms));
  } catch {
    // Ignore quota / private mode failures.
  }
}

export function orderTimestampMs(order: StaffOrderListItem): number {
  const iso = order.placedAt ?? order.createdAt;
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

/** When the ticket should page the kitchen (ASAP = placed; scheduled = prep window). */
export function orderKitchenAlertMs(
  order: StaffOrderListItem,
  prepMinutes: number,
): number {
  if (order.scheduledFor) {
    const scheduledMs = new Date(order.scheduledFor).getTime();
    if (Number.isFinite(scheduledMs)) {
      return scheduledMs - Math.max(0, prepMinutes) * 60_000;
    }
  }
  return orderTimestampMs(order);
}

/** Pending kitchen orders that arrived after the staff last opened the panel. */
export function countUnreadStaffNotifications(
  pendingOrders: StaffOrderListItem[],
  lastSeenAtMs: number | null,
  prepMinutes = 15,
): number {
  if (lastSeenAtMs == null) {
    return pendingOrders.length;
  }
  return pendingOrders.filter(
    (order) => orderKitchenAlertMs(order, prepMinutes) > lastSeenAtMs,
  ).length;
}

export function pendingAcceptanceOrders(
  items: StaffOrderListItem[],
  options?: { prepMinutes?: number; nowMs?: number },
): StaffOrderListItem[] {
  return items
    .filter((order) => order.status === "pending_acceptance")
    .filter((order) =>
      options?.prepMinutes == null
        ? true
        : !isKitchenBoardDeferred(order, options.prepMinutes, options.nowMs),
    )
    .sort((a, b) => orderTimestampMs(b) - orderTimestampMs(a));
}
