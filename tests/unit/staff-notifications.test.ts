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
    displayNumber: "NJ-1",
    dayTicket: 1,
    dayTicketIsToday: true,
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

  it("hides scheduled tickets that are not due yet", () => {
    const now = Date.parse("2026-08-05T16:00:00.000Z");
    const items = [
      order({ id: "asap" }),
      order({
        id: "later",
        scheduledFor: "2026-08-05T18:00:00.000Z",
      }),
    ];
    expect(
      pendingAcceptanceOrders(items, { prepMinutes: 15, nowMs: now }).map(
        (row) => row.id,
      ),
    ).toEqual(["asap"]);
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

  it("pages scheduled tickets when the prep window opens", () => {
    const pending = [
      order({
        id: "later",
        placedAt: "2026-08-05T12:00:00.000Z",
        scheduledFor: "2026-08-05T18:00:00.000Z",
      }),
    ];
    const lastSeen = Date.parse("2026-08-05T16:00:00.000Z");
    expect(countUnreadStaffNotifications(pending, lastSeen, 15)).toBe(1);
    expect(
      countUnreadStaffNotifications(
        pending,
        Date.parse("2026-08-05T17:50:00.000Z"),
        15,
      ),
    ).toBe(0);
  });
});
