import { describe, expect, it } from "vitest";
import {
  buildGuestOrderTimeline,
  buildGuestStatusMessage,
} from "@/lib/domain/order/guest-timeline";

describe("guest order timeline", () => {
  it("marks preparing as current for pickup", () => {
    const { steps, cancelled } = buildGuestOrderTimeline("preparing", "pickup");
    expect(cancelled).toBe(false);
    const preparing = steps.find((s) => s.id === "preparing");
    expect(preparing?.state).toBe("current");
    expect(steps.find((s) => s.id === "placed")?.state).toBe("complete");
    expect(steps.find((s) => s.id === "completed")?.state).toBe("upcoming");
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
  it("includes prep minutes when accepted", () => {
    const message = buildGuestStatusMessage({
      status: "accepted",
      fulfillmentType: "pickup",
      prepMinutes: 30,
      storeName: "Test Kitchen",
    });
    expect(message).toContain("30");
  });
});
