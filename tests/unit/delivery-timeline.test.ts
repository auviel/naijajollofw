import { describe, expect, it } from "vitest";
import { buildDeliveryTimeline, shouldRefreshDeliveryDetail } from "@/lib/domain/delivery/timeline";

describe("delivery timeline", () => {
  it("marks current and completed steps for active deliveries", () => {
    const { steps, terminal } = buildDeliveryTimeline("en_route_to_dropoff", false);

    expect(terminal).toBeNull();
    expect(steps.find((step) => step.status === "pending")?.state).toBe("complete");
    expect(steps.find((step) => step.status === "scheduled")?.state).toBe("skipped");
    expect(steps.find((step) => step.status === "en_route_to_dropoff")?.state).toBe(
      "current",
    );
  });

  it("returns terminal state for cancelled deliveries", () => {
    const { terminal, steps } = buildDeliveryTimeline("cancelled", true);
    expect(terminal).toBe("cancelled");
    expect(steps).toHaveLength(7);
  });

  it("polls active deliveries only", () => {
    expect(shouldRefreshDeliveryDetail("pending")).toBe(true);
    expect(shouldRefreshDeliveryDetail("completed")).toBe(false);
    expect(shouldRefreshDeliveryDetail("cancelled")).toBe(false);
  });
});
