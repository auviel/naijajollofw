import { describe, expect, it } from "vitest";
import {
  canClaimCourierDispatch,
  canFulfillManualDelivery,
} from "@/lib/domain/order/fulfill-preconditions";

describe("fulfill preconditions", () => {
  it("allows courier claim only for ready unassigned delivery orders", () => {
    expect(
      canClaimCourierDispatch({
        status: "ready",
        fulfillmentType: "delivery",
        fulfillmentMethod: "unassigned",
        deliveryId: null,
      }),
    ).toBe(true);

    expect(
      canClaimCourierDispatch({
        status: "ready",
        fulfillmentType: "delivery",
        fulfillmentMethod: "delivergo",
        deliveryId: "del_1",
      }),
    ).toBe(false);

    expect(
      canClaimCourierDispatch({
        status: "preparing",
        fulfillmentType: "delivery",
        fulfillmentMethod: "unassigned",
        deliveryId: null,
      }),
    ).toBe(false);
  });

  it("allows manual fulfill under the same ready/unassigned rules", () => {
    expect(
      canFulfillManualDelivery({
        status: "ready",
        fulfillmentType: "delivery",
        fulfillmentMethod: "unassigned",
        deliveryId: null,
      }),
    ).toBe(true);

    expect(
      canFulfillManualDelivery({
        status: "ready",
        fulfillmentType: "pickup",
        fulfillmentMethod: "unassigned",
        deliveryId: null,
      }),
    ).toBe(false);
  });
});
