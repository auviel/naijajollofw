import { describe, expect, it } from "vitest";
import {
  buildGuestOrderTimeline,
  buildGuestStatusMessage,
  getGuestOrderHeadline,
} from "@/lib/domain/order/guest-timeline";

describe("guest order timeline", () => {
  it("marks preparing as current for pickup", () => {
    const { steps, cancelled } = buildGuestOrderTimeline("preparing", "pickup");
    expect(cancelled).toBe(false);
    const preparing = steps.find((s) => s.id === "preparing");
    expect(preparing?.state).toBe("current");
    expect(steps.find((s) => s.id === "accepted")?.state).toBe("complete");
    expect(steps.find((s) => s.id === "completed")?.state).toBe("upcoming");
    expect(steps.map((s) => s.id)).toEqual([
      "accepted",
      "preparing",
      "ready",
      "completed",
    ]);
  });

  it("uses on-the-way step for delivery", () => {
    const { steps } = buildGuestOrderTimeline("out_for_delivery", "delivery");
    expect(steps.find((s) => s.id === "out")?.state).toBe("current");
  });

  it("flags cancelled orders", () => {
    const { cancelled } = buildGuestOrderTimeline("cancelled", "pickup");
    expect(cancelled).toBe(true);
  });
});

describe("guest status message", () => {
  it("omits a status subtitle before the kitchen starts cooking", () => {
    for (const status of ["pending_acceptance", "accepted"] as const) {
      expect(
        buildGuestStatusMessage({
          status,
          fulfillmentType: "pickup",
          prepMinutes: 30,
          storeName: "Test Kitchen",
        }),
      ).toBe("");
    }
  });

  it("uses a short pickup headline without repeating the status line", () => {
    expect(getGuestOrderHeadline("ready_for_pickup", "pickup")).toBe(
      "Ready for pickup",
    );
    expect(getGuestOrderHeadline("completed", "pickup")).toBe("Picked up");
    expect(
      buildGuestStatusMessage({
        status: "ready_for_pickup",
        fulfillmentType: "pickup",
        prepMinutes: 30,
        storeName: "Test Kitchen",
      }),
    ).toBe("Come collect when you can.");
  });
});
