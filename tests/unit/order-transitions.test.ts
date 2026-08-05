import { describe, expect, it } from "vitest";
import {
  canTransition,
  getTransitionActions,
  KITCHEN_BOARD_COLUMNS,
  mapDeliveryStatusToOrderStatus,
  parseStaffOrderListFilter,
  statusesForStaffFilter,
} from "@/lib/domain/order/transitions";

describe("order transitions", () => {
  it("allows start (preparing) and cancel from pending_acceptance", () => {
    expect(canTransition("pending_acceptance", "preparing")).toBe(true);
    expect(canTransition("pending_acceptance", "accepted")).toBe(false);
    expect(canTransition("pending_acceptance", "cancelled")).toBe(true);
    expect(canTransition("pending_acceptance", "ready")).toBe(false);
  });

  it("walks the kitchen path", () => {
    expect(canTransition("accepted", "preparing")).toBe(true);
    expect(canTransition("preparing", "ready")).toBe(true);
    expect(canTransition("ready", "cancelled")).toBe(true);
    expect(canTransition("ready", "preparing")).toBe(false);
  });

  it("sends pickup from preparing to ready_for_pickup, then picked up", () => {
    expect(
      canTransition("preparing", "ready_for_pickup", {
        fulfillmentType: "pickup",
      }),
    ).toBe(true);
    expect(
      canTransition("preparing", "ready", { fulfillmentType: "pickup" }),
    ).toBe(false);
    expect(
      canTransition("ready_for_pickup", "completed", {
        fulfillmentType: "pickup",
      }),
    ).toBe(true);
    expect(
      canTransition("ready", "completed", { fulfillmentType: "pickup" }),
    ).toBe(true);
    expect(
      canTransition("ready", "ready_for_pickup", { fulfillmentType: "pickup" }),
    ).toBe(false);
    expect(
      canTransition("ready", "completed", { fulfillmentType: "delivery" }),
    ).toBe(false);
  });

  it("labels pickup complete as Picked up", () => {
    const actions = getTransitionActions("ready_for_pickup", {
      fulfillmentType: "pickup",
    });
    expect(actions.find((action) => action.to === "completed")?.label).toBe(
      "Picked up",
    );
  });

  it("exposes primary start action first", () => {
    const actions = getTransitionActions("pending_acceptance");
    expect(actions[0]?.to).toBe("preparing");
    expect(actions[0]?.label).toBe("Start");
    expect(actions.some((a) => a.to === "cancelled")).toBe(true);
  });

  it("uses a three-column kitchen board", () => {
    expect(KITCHEN_BOARD_COLUMNS.map((column) => column.id)).toEqual([
      "new",
      "cooking",
      "ready",
    ]);
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
