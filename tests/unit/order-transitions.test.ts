import { describe, expect, it } from "vitest";
import {
  canTransition,
  getTransitionActions,
  mapDeliveryStatusToOrderStatus,
  parseStaffOrderListFilter,
  statusesForStaffFilter,
} from "@/lib/domain/order/transitions";

describe("order transitions", () => {
  it("allows accept and cancel from pending_acceptance", () => {
    expect(canTransition("pending_acceptance", "accepted")).toBe(true);
    expect(canTransition("pending_acceptance", "cancelled")).toBe(true);
    expect(canTransition("pending_acceptance", "ready")).toBe(false);
  });

  it("walks the kitchen path", () => {
    expect(canTransition("accepted", "preparing")).toBe(true);
    expect(canTransition("preparing", "ready")).toBe(true);
    expect(canTransition("ready", "cancelled")).toBe(true);
    expect(canTransition("ready", "preparing")).toBe(false);
  });

  it("allows pickup handoff from ready", () => {
    expect(
      canTransition("ready", "ready_for_pickup", { fulfillmentType: "pickup" }),
    ).toBe(true);
    expect(
      canTransition("ready", "ready_for_pickup", { fulfillmentType: "delivery" }),
    ).toBe(false);
  });

  it("exposes primary accept action first", () => {
    const actions = getTransitionActions("pending_acceptance");
    expect(actions[0]?.to).toBe("accepted");
    expect(actions.some((a) => a.to === "cancelled")).toBe(true);
  });

  it("maps carrier status onto order status", () => {
    expect(mapDeliveryStatusToOrderStatus("en_route_to_dropoff")).toBe(
      "out_for_delivery",
    );
    expect(mapDeliveryStatusToOrderStatus("completed")).toBe("completed");
    expect(mapDeliveryStatusToOrderStatus("cancelled")).toBeNull();
  });
});

describe("staff order filters", () => {
  it("defaults unknown filters to active", () => {
    expect(parseStaffOrderListFilter(undefined)).toBe("active");
    expect(parseStaffOrderListFilter("nope")).toBe("active");
  });

  it("maps active to kitchen statuses", () => {
    const statuses = statusesForStaffFilter("active");
    expect(statuses).toContain("pending_acceptance");
    expect(statuses).toContain("ready");
    expect(statuses).not.toContain("completed");
  });
});
