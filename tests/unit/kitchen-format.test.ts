import { describe, expect, it } from "vitest";
import {
  formatKitchenScheduled,
  formatKitchenWait,
} from "@/lib/domain/order/kitchen-format";

describe("formatKitchenWait", () => {
  const now = Date.parse("2026-08-05T12:00:00.000Z");

  it("uses short units instead of hour-minute dumps", () => {
    expect(formatKitchenWait("2026-08-05T11:47:00.000Z", now)).toBe("13m");
    expect(formatKitchenWait("2026-08-04T20:20:00.000Z", now)).toBe("15h");
    expect(formatKitchenWait("2026-07-12T22:52:00.000Z", now)).toBe("23d");
  });

  it("returns Just now under a minute", () => {
    expect(formatKitchenWait("2026-08-05T11:59:30.000Z", now)).toBe("Just now");
  });
});

describe("formatKitchenScheduled", () => {
  it("uses a stable en-US 12-hour clock in the store timezone", () => {
    const formatted = formatKitchenScheduled("2026-07-13T16:00:00.000Z");
    // en-US avoids Safari vs Node “a.m.” / “AM” hydration mismatches.
    expect(formatted).toContain("Mon");
    expect(formatted).toMatch(/12:00/);
    expect(formatted).toMatch(/\bPM\b/);
    expect(formatted).not.toMatch(/a\.m\.|p\.m\./i);
  });
});
