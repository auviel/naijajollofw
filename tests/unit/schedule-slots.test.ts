import { describe, expect, it } from "vitest";
import {
  buildScheduleDays,
  buildScheduleSlotsForDay,
  isValidScheduleSlot,
} from "@/lib/domain/store/schedule-slots";
import type { StoreHoursDay } from "@/lib/domain/store/hours";

const week: StoreHoursDay[] = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
  dayOfWeek: dayOfWeek as StoreHoursDay["dayOfWeek"],
  closed: dayOfWeek === 0,
  openTime: dayOfWeek === 0 ? null : "11:00",
  closeTime: dayOfWeek === 0 ? null : "22:00",
}));

describe("schedule slots", () => {
  it("skips closed Sunday and starts Monday when closed on Sunday", () => {
    const sundayNoonEt = new Date("2026-07-12T16:00:00.000Z");
    const days = buildScheduleDays(week, "America/Toronto", sundayNoonEt);
    expect(days[0]?.shortLabel).toBe("Tomorrow");
    expect(days[0]?.label).toMatch(/Tomorrow/i);

    const slots = buildScheduleSlotsForDay({
      dateKey: days[0]!.dateKey,
      dayOfWeek: days[0]!.dayOfWeek,
      days: week,
      timeZone: "America/Toronto",
      now: sundayNoonEt,
    });
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0]!.label).toMatch(/11:00/i);

    expect(
      isValidScheduleSlot({
        scheduledFor: new Date(slots[0]!.startAt),
        days: week,
        timeZone: "America/Toronto",
        now: sundayNoonEt,
      }),
    ).toBe(true);
  });
});
