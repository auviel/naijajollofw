import { describe, expect, it } from "vitest";
import {
  countUnreadStaffNotifications,
  pendingAcceptanceOrders,
} from "@/lib/domain/order/staff-notifications";
import type { StaffOrderListItem } from "@/lib/domain/order/types";

function order(
  overrides: Partial<StaffOrderListItem> & Pick<StaffOrderListItem, "id">,
): StaffOrderListItem {
  return {
    status: "pending_acceptance",
    fulfillmentType: "pickup",
    fulfillmentMethod: "unassigned",
    customerName: "Ada",
    customerPhone: "+15195550100",
    dropoffAddress: null,
    notes: null,
    scheduledFor: null,
    deliveryId: null,
    manualDeliveryNote: null,
    itemCount: 1,
    itemSummary: "Jollof",
    tipCents: 0,
    totalCents: 2399,
    currency: "CAD",
    placedAt: "2026-07-12T18:00:00.000Z",
    createdAt: "2026-07-12T18:00:00.000Z",
    updatedAt: "2026-07-12T18:00:00.000Z",
    ...overrides,
  };
}

describe("staff notifications", () => {
  it("filters and sorts pending acceptance orders", () => {
    const items = [
      order({ id: "a", status: "accepted" }),
      order({
        id: "b",
        placedAt: "2026-07-12T17:00:00.000Z",
      }),
      order({
        id: "c",
        placedAt: "2026-07-12T19:00:00.000Z",
      }),
    ];
    expect(pendingAcceptanceOrders(items).map((o) => o.id)).toEqual([
      "c",
      "b",
    ]);
  });

  it("counts all pending as unread when never seen", () => {
    const pending = [
      order({ id: "1" }),
      order({ id: "2", placedAt: "2026-07-12T19:00:00.000Z" }),
    ];
    expect(countUnreadStaffNotifications(pending, null)).toBe(2);
  });

  it("counts only orders after lastSeen", () => {
    const pending = [
      order({ id: "old", placedAt: "2026-07-12T17:00:00.000Z" }),
      order({ id: "new", placedAt: "2026-07-12T19:00:00.000Z" }),
    ];
    const lastSeen = new Date("2026-07-12T18:00:00.000Z").getTime();
    expect(countUnreadStaffNotifications(pending, lastSeen)).toBe(1);
  });
});
