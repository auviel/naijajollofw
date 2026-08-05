import { describe, expect, it } from "vitest";
import { checkoutRequestSchema } from "@/lib/domain/order/validation";

const base = {
  idempotencyKey: "00000000-0000-4000-8000-000000000001",
  customerName: "Ada Okonkwo",
  customerPhone: "5195550100",
  customerEmail: "ada@example.com",
  fulfillmentType: "pickup" as const,
};

describe("checkoutRequestSchema", () => {
  it("accepts pickup with an optional tip", () => {
    const parsed = checkoutRequestSchema.parse({ ...base, tipCents: 300 });
    expect(parsed.tipCents).toBe(300);
    expect(parsed.fulfillmentType).toBe("pickup");
  });

  it("rejects a tip over $500", () => {
    const result = checkoutRequestSchema.safeParse({
      ...base,
      tipCents: 50_001,
    });
    expect(result.success).toBe(false);
  });

  it("rejects delivery without a confirmed lat/lng", () => {
    const result = checkoutRequestSchema.safeParse({
      ...base,
      fulfillmentType: "delivery",
      dropoffAddress: "200 University Ave W, Waterloo, ON",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === "dropoffAddress")).toBe(
        true,
      );
    }
  });

  it("accepts geocoded delivery", () => {
    const parsed = checkoutRequestSchema.parse({
      ...base,
      fulfillmentType: "delivery",
      dropoffAddress: "200 University Ave W, Waterloo, ON N2L 3G1",
      dropoffLat: 43.4723,
      dropoffLng: -80.5449,
      tipCents: 0,
    });
    expect(parsed.dropoffLat).toBeCloseTo(43.4723);
    expect(parsed.dropoffLng).toBeCloseTo(-80.5449);
  });
});
