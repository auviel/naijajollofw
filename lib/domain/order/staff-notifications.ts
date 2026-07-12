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

/** Pending kitchen orders that arrived after the staff last opened the panel. */
export function countUnreadStaffNotifications(
  pendingOrders: StaffOrderListItem[],
  lastSeenAtMs: number | null,
): number {
  if (lastSeenAtMs == null) {
    return pendingOrders.length;
  }
  return pendingOrders.filter(
    (order) => orderTimestampMs(order) > lastSeenAtMs,
  ).length;
}

export function pendingAcceptanceOrders(
  items: StaffOrderListItem[],
): StaffOrderListItem[] {
  return items
    .filter((order) => order.status === "pending_acceptance")
    .sort((a, b) => orderTimestampMs(b) - orderTimestampMs(a));
}
