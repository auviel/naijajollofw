import { describe, expect, it } from "vitest";
import {
  evaluateStoreOpenStatus,
  isMinuteWithinHours,
  minutesToTimeString,
  timeStringToMinutes,
} from "@/lib/domain/store/hours";
import { updateStoreHoursSchema } from "@/lib/domain/store/hours-validation";

describe("store hours helpers", () => {
  it("parses and formats HH:MM minutes", () => {
    expect(timeStringToMinutes("11:00")).toBe(660);
    expect(timeStringToMinutes("22:30")).toBe(1350);
    expect(minutesToTimeString(660)).toBe("11:00");
    expect(timeStringToMinutes("25:00")).toBeNull();
  });

  it("handles same-day and overnight windows", () => {
    expect(isMinuteWithinHours(720, 660, 1320)).toBe(true); // noon in 11–22
    expect(isMinuteWithinHours(60, 660, 1320)).toBe(false);
    expect(isMinuteWithinHours(1380, 1320, 120)).toBe(true); // 23:00 in 22–02
    expect(isMinuteWithinHours(60, 1320, 120)).toBe(true); // 01:00 overnight
    expect(isMinuteWithinHours(600, 1320, 120)).toBe(false);
  });
});

describe("evaluateStoreOpenStatus", () => {
  const week = [
    { dayOfWeek: 0, closed: true, openMinute: null, closeMinute: null },
    { dayOfWeek: 1, closed: false, openMinute: 660, closeMinute: 1320 },
    { dayOfWeek: 2, closed: false, openMinute: 660, closeMinute: 1320 },
    { dayOfWeek: 3, closed: false, openMinute: 660, closeMinute: 1320 },
    { dayOfWeek: 4, closed: false, openMinute: 660, closeMinute: 1320 },
    { dayOfWeek: 5, closed: false, openMinute: 660, closeMinute: 1320 },
    { dayOfWeek: 6, closed: false, openMinute: 660, closeMinute: 1320 },
  ];

  it("treats empty schedule as always open", () => {
    const status = evaluateStoreOpenStatus([], "America/Toronto");
    expect(status.isOpen).toBe(true);
    expect(status.alwaysOpen).toBe(true);
  });

  it("reports closed on a closed day", () => {
    // Sunday noon Toronto — use fixed UTC that maps to Sunday afternoon ET
    const sundayNoonEt = new Date("2026-07-12T16:00:00.000Z"); // EDT Sunday 12:00
    const status = evaluateStoreOpenStatus(week, "America/Toronto", sundayNoonEt);
    expect(status.isOpen).toBe(false);
    expect(status.message).toMatch(/Opens Monday/i);
  });

  it("reports open during weekday hours", () => {
    const mondayNoonEt = new Date("2026-07-13T16:00:00.000Z"); // EDT Monday 12:00
    const status = evaluateStoreOpenStatus(week, "America/Toronto", mondayNoonEt);
    expect(status.isOpen).toBe(true);
    expect(status.todayLabel).toBe("11:00 – 22:00");
  });
});

describe("updateStoreHoursSchema", () => {
  it("requires seven distinct days", () => {
    expect(() =>
      updateStoreHoursSchema.parse({
        days: [
          {
            dayOfWeek: 0,
            closed: true,
            openTime: null,
            closeTime: null,
          },
        ],
      }),
    ).toThrow();
  });

  it("accepts a full valid week", () => {
    const days = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
      dayOfWeek,
      closed: dayOfWeek === 0,
      openTime: dayOfWeek === 0 ? null : "11:00",
      closeTime: dayOfWeek === 0 ? null : "22:00",
    }));
    const parsed = updateStoreHoursSchema.parse({ days });
    expect(parsed.days).toHaveLength(7);
  });
});
