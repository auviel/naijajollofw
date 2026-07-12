import {
  getCalendarPartsInZone,
  getInstantInTimeZone,
  timeStringToMinutes,
  zonedLocalToUtc,
  type DayOfWeek,
  type StoreHoursDay,
} from "@/lib/domain/store/hours";

export type ScheduleDayOption = {
  /** YYYY-MM-DD in store timezone */
  dateKey: string;
  dayOfWeek: DayOfWeek;
  label: string;
  shortLabel: string;
};

export type ScheduleSlotOption = {
  /** Slot start as ISO UTC */
  startAt: string;
  label: string;
};

const SLOT_MINUTES = 30;
const LOOKAHEAD_DAYS = 7;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function dateKeyFromParts(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function addCalendarDays(
  year: number,
  month: number,
  day: number,
  offset: number,
): { year: number; month: number; day: number } {
  const base = new Date(Date.UTC(year, month - 1, day + offset));
  return {
    year: base.getUTCFullYear(),
    month: base.getUTCMonth() + 1,
    day: base.getUTCDate(),
  };
}

function formatDayChipLabel(
  at: Date,
  timeZone: string,
  offset: number,
): { label: string; shortLabel: string } {
  const weekday = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    weekday: "short",
  }).format(at);
  const monthDay = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    month: "short",
    day: "numeric",
  }).format(at);

  if (offset === 0) {
    return { label: `Today ${monthDay}`, shortLabel: "Today" };
  }
  if (offset === 1) {
    return { label: `Tomorrow ${monthDay}`, shortLabel: "Tomorrow" };
  }
  return { label: `${weekday} ${monthDay}`, shortLabel: weekday };
}

function formatSlotRangeLabel(
  startMinute: number,
  endMinute: number,
  timeZone: string,
  year: number,
  month: number,
  day: number,
): string {
  const start = zonedLocalToUtc(
    timeZone,
    year,
    month,
    day,
    Math.floor(startMinute / 60),
    startMinute % 60,
  );
  let endDay = { year, month, day };
  let endMin = endMinute;
  if (endMinute >= 1440) {
    endDay = addCalendarDays(year, month, day, 1);
    endMin = endMinute - 1440;
  }
  const end = zonedLocalToUtc(
    timeZone,
    endDay.year,
    endDay.month,
    endDay.day,
    Math.floor(endMin / 60),
    endMin % 60,
  );

  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  });
  return `${fmt.format(start)}–${fmt.format(end)}`;
}

function dayHoursMinutes(day: StoreHoursDay): {
  openMinute: number;
  closeMinute: number;
} | null {
  if (day.closed || !day.openTime || !day.closeTime) {
    return null;
  }
  const openMinute = timeStringToMinutes(day.openTime);
  const closeMinute = timeStringToMinutes(day.closeTime);
  if (openMinute == null || closeMinute == null) {
    return null;
  }
  return { openMinute, closeMinute };
}

function buildSlotStarts(openMinute: number, closeMinute: number): number[] {
  const starts: number[] = [];
  if (closeMinute > openMinute) {
    for (let m = openMinute; m + SLOT_MINUTES <= closeMinute; m += SLOT_MINUTES) {
      starts.push(m);
    }
    return starts;
  }
  // Overnight
  for (let m = openMinute; m + SLOT_MINUTES <= 1440; m += SLOT_MINUTES) {
    starts.push(m);
  }
  for (let m = 0; m + SLOT_MINUTES <= closeMinute; m += SLOT_MINUTES) {
    starts.push(m);
  }
  return starts;
}

export function buildScheduleDays(
  days: StoreHoursDay[],
  timeZone: string,
  now = new Date(),
): ScheduleDayOption[] {
  const byDow = new Map(days.map((day) => [day.dayOfWeek, day]));
  const todayParts = getCalendarPartsInZone(now, timeZone);
  const instant = getInstantInTimeZone(now, timeZone);
  const options: ScheduleDayOption[] = [];

  for (let offset = 0; offset < LOOKAHEAD_DAYS; offset += 1) {
    const calendar = addCalendarDays(
      todayParts.year,
      todayParts.month,
      todayParts.day,
      offset,
    );
    const dow = ((instant.dayOfWeek + offset) % 7) as DayOfWeek;
    const hours = byDow.get(dow);
    if (!hours || dayHoursMinutes(hours) == null) {
      continue;
    }

    const slots = buildScheduleSlotsForDay({
      dateKey: dateKeyFromParts(calendar.year, calendar.month, calendar.day),
      dayOfWeek: dow,
      days,
      timeZone,
      now,
    });
    if (slots.length === 0) {
      continue;
    }

    const noon = zonedLocalToUtc(
      timeZone,
      calendar.year,
      calendar.month,
      calendar.day,
      12,
      0,
    );
    const labels = formatDayChipLabel(noon, timeZone, offset);
    options.push({
      dateKey: dateKeyFromParts(calendar.year, calendar.month, calendar.day),
      dayOfWeek: dow,
      label: labels.label,
      shortLabel: labels.shortLabel,
    });
  }

  return options;
}

export function buildScheduleSlotsForDay(input: {
  dateKey: string;
  dayOfWeek: DayOfWeek;
  days: StoreHoursDay[];
  timeZone: string;
  now?: Date;
}): ScheduleSlotOption[] {
  const now = input.now ?? new Date();
  const hours = input.days.find((day) => day.dayOfWeek === input.dayOfWeek);
  if (!hours) {
    return [];
  }
  const range = dayHoursMinutes(hours);
  if (!range) {
    return [];
  }

  const [yearStr, monthStr, dayStr] = input.dateKey.split("-");
  const year = Number.parseInt(yearStr ?? "0", 10);
  const month = Number.parseInt(monthStr ?? "1", 10);
  const day = Number.parseInt(dayStr ?? "1", 10);
  if (!year || !month || !day) {
    return [];
  }

  const instant = getInstantInTimeZone(now, input.timeZone);
  const todayParts = getCalendarPartsInZone(now, input.timeZone);
  const isToday =
    todayParts.year === year &&
    todayParts.month === month &&
    todayParts.day === day;

  const slots: ScheduleSlotOption[] = [];
  for (const startMinute of buildSlotStarts(range.openMinute, range.closeMinute)) {
    if (isToday && startMinute <= instant.minuteOfDay) {
      continue;
    }

    const startAt = zonedLocalToUtc(
      input.timeZone,
      year,
      month,
      day,
      Math.floor(startMinute / 60),
      startMinute % 60,
    );

    slots.push({
      startAt: startAt.toISOString(),
      label: formatSlotRangeLabel(
        startMinute,
        startMinute + SLOT_MINUTES,
        input.timeZone,
        year,
        month,
        day,
      ),
    });
  }

  return slots;
}

/** True when `scheduledFor` matches an allowed slot start (±60s). */
export function isValidScheduleSlot(input: {
  scheduledFor: Date;
  days: StoreHoursDay[];
  timeZone: string;
  now?: Date;
}): boolean {
  const now = input.now ?? new Date();
  const days = buildScheduleDays(input.days, input.timeZone, now);
  for (const day of days) {
    const slots = buildScheduleSlotsForDay({
      dateKey: day.dateKey,
      dayOfWeek: day.dayOfWeek,
      days: input.days,
      timeZone: input.timeZone,
      now,
    });
    for (const slot of slots) {
      const start = new Date(slot.startAt).getTime();
      if (Math.abs(start - input.scheduledFor.getTime()) <= 60_000) {
        return true;
      }
    }
  }
  return false;
}

export function formatScheduledForLabel(
  iso: string,
  timeZone: string,
): string {
  const at = new Date(iso);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(at);
}
