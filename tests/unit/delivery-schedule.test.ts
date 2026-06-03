import { describe, expect, it } from "vitest";
import {
  clampScheduledPickupValue,
  getMaxScheduledPickupAt,
  getMinScheduledPickupAt,
  getPickupTimeSlots,
  parseDatetimeLocalValue,
  toDatetimeLocalValue,
  validateScheduledPickupAt,
} from "@/lib/domain/delivery/schedule";

describe("delivery schedule validation", () => {
  const now = new Date("2026-06-03T12:00:00.000Z");

  it("requires pickup at least 15 minutes ahead", () => {
    const tooSoon = new Date(now.getTime() + 5 * 60_000);
    expect(validateScheduledPickupAt(tooSoon, now)).toMatch(/15 minutes/);
  });

  it("rejects pickup more than 30 days ahead", () => {
    const tooLate = new Date(now.getTime() + 31 * 24 * 60 * 60_000);
    expect(validateScheduledPickupAt(tooLate, now)).toMatch(/30 days/);
  });

  it("accepts pickup within the allowed window", () => {
    const valid = new Date(now.getTime() + 60 * 60_000);
    expect(validateScheduledPickupAt(valid, now)).toBeNull();
  });

  it("computes min and max bounds from now", () => {
    expect(getMinScheduledPickupAt(now).getTime()).toBe(now.getTime() + 15 * 60_000);
    expect(getMaxScheduledPickupAt(now).getTime()).toBe(
      now.getTime() + 30 * 24 * 60 * 60_000,
    );
  });

  it("rounds pickup times to 15-minute slots within bounds", () => {
    const min = new Date("2026-06-03T08:07:00");
    const max = new Date("2026-06-03T23:45:00");
    const day = new Date("2026-06-03T12:00:00");

    const slots = getPickupTimeSlots(day, min, max);
    expect(slots[0]?.getMinutes()).toBe(15);
    expect(slots.at(-1)?.getHours()).toBe(23);
  });

  it("clamps invalid datetime-local values back into range", () => {
    const min = "2026-06-03T08:15";
    const max = "2026-07-03T08:15";

    expect(clampScheduledPickupValue("2026-06-03T08:00", min, max)).toBe(min);
    expect(clampScheduledPickupValue("2026-08-01T08:15", min, max)).toBe(max);
    expect(clampScheduledPickupValue("2026-06-03T09:07", min, max)).toBe("2026-06-03T09:15");
  });

  it("parses datetime-local strings in local time", () => {
    const parsed = parseDatetimeLocalValue("2026-06-03T07:48");
    expect(toDatetimeLocalValue(parsed)).toBe("2026-06-03T07:48");
  });
});
