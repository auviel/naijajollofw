export const DAY_OF_WEEK_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Safe label lookup — avoids dynamic bracket access on untrusted indexes. */
export function dayOfWeekLabel(dayOfWeek: number): string {
  switch (dayOfWeek) {
    case 0:
      return "Sunday";
    case 1:
      return "Monday";
    case 2:
      return "Tuesday";
    case 3:
      return "Wednesday";
    case 4:
      return "Thursday";
    case 5:
      return "Friday";
    case 6:
      return "Saturday";
    default:
      return "Day";
  }
}

export type StoreHoursDay = {
  dayOfWeek: DayOfWeek;
  closed: boolean;
  /** "HH:MM" 24h when open */
  openTime: string | null;
  /** "HH:MM" 24h when open */
  closeTime: string | null;
};

export type StoreHoursSchedule = {
  timezone: string;
  days: StoreHoursDay[];
  /** False when no rows exist — store treated as always open. */
  configured: boolean;
};

export type StoreOpenStatus = {
  isOpen: boolean;
  /** True when no schedule is configured (always open). */
  alwaysOpen: boolean;
  timezone: string;
  /** Human message for guests, e.g. "Closed · Opens Monday at 11:00". */
  message: string;
  /** Today's hours label, e.g. "11:00 – 22:00" or "Closed". */
  todayLabel: string;
  /** Next open instant (UTC) when currently closed; null if open or unknown. */
  nextOpenAt: string | null;
  /** Guest-facing schedule label, e.g. "Monday, 11:00 a.m.". */
  nextOpenLabel: string | null;
};

export function minutesToTimeString(minutes: number): string {
  const clamped = Math.max(0, Math.min(1439, Math.floor(minutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function timeStringToMinutes(value: string): number | null {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const hours = Number.parseInt(match[1] ?? "0", 10);
  const mins = Number.parseInt(match[2] ?? "0", 10);
  return hours * 60 + mins;
}

export function formatHoursRange(openMinute: number, closeMinute: number): string {
  const open = minutesToTimeString(openMinute);
  const close = minutesToTimeString(closeMinute);
  if (closeMinute <= openMinute) {
    return `${open} – ${close} (+1)`;
  }
  return `${open} – ${close}`;
}

/** Whether `nowMinute` falls in [open, close) allowing overnight wraps. */
export function isMinuteWithinHours(
  nowMinute: number,
  openMinute: number,
  closeMinute: number,
): boolean {
  if (closeMinute > openMinute) {
    return nowMinute >= openMinute && nowMinute < closeMinute;
  }
  // Overnight: e.g. 22:00–02:00
  return nowMinute >= openMinute || nowMinute < closeMinute;
}

export type InstantInZone = {
  dayOfWeek: DayOfWeek;
  minuteOfDay: number;
};

export function getInstantInTimeZone(
  date: Date,
  timeZone: string,
): InstantInZone {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const hour = Number.parseInt(
    parts.find((p) => p.type === "hour")?.value ?? "0",
    10,
  );
  const minute = Number.parseInt(
    parts.find((p) => p.type === "minute")?.value ?? "0",
    10,
  );

  const dayMap: Record<string, DayOfWeek> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    dayOfWeek: dayMap[weekday] ?? 0,
    minuteOfDay: hour * 60 + minute,
  };
}

export function defaultWeeklySchedule(): StoreHoursDay[] {
  return DAY_OF_WEEK_LABELS.map((_, dayOfWeek) => ({
    dayOfWeek: dayOfWeek as DayOfWeek,
    closed: dayOfWeek === 0, // Sunday closed by default
    openTime: dayOfWeek === 0 ? null : "11:00",
    closeTime: dayOfWeek === 0 ? null : "22:00",
  }));
}

type HoursRow = {
  dayOfWeek: number;
  closed: boolean;
  openMinute: number | null;
  closeMinute: number | null;
};

export function evaluateStoreOpenStatus(
  rows: HoursRow[],
  timeZone: string,
  now = new Date(),
): StoreOpenStatus {
  const instant = getInstantInTimeZone(now, timeZone);

  if (rows.length === 0) {
    return {
      isOpen: true,
      alwaysOpen: true,
      timezone: timeZone,
      message: "Open for orders",
      todayLabel: "Hours not set",
      nextOpenAt: null,
      nextOpenLabel: null,
    };
  }

  const byDay = new Map(rows.map((row) => [row.dayOfWeek, row]));

  const today = byDay.get(instant.dayOfWeek);
  const todayLabel = !today || today.closed
    ? "Closed today"
    : today.openMinute != null && today.closeMinute != null
      ? formatHoursRange(today.openMinute, today.closeMinute)
      : "Closed today";

  // Check overnight from yesterday first
  const yesterday = ((instant.dayOfWeek + 6) % 7) as DayOfWeek;
  const yesterdayRow = byDay.get(yesterday);
  if (
    yesterdayRow &&
    !yesterdayRow.closed &&
    yesterdayRow.openMinute != null &&
    yesterdayRow.closeMinute != null &&
    yesterdayRow.closeMinute <= yesterdayRow.openMinute &&
    instant.minuteOfDay < yesterdayRow.closeMinute
  ) {
    return {
      isOpen: true,
      alwaysOpen: false,
      timezone: timeZone,
      message: "Open for orders",
      todayLabel,
      nextOpenAt: null,
      nextOpenLabel: null,
    };
  }

  if (
    today &&
    !today.closed &&
    today.openMinute != null &&
    today.closeMinute != null &&
    isMinuteWithinHours(instant.minuteOfDay, today.openMinute, today.closeMinute)
  ) {
    return {
      isOpen: true,
      alwaysOpen: false,
      timezone: timeZone,
      message: "Open for orders",
      todayLabel,
      nextOpenAt: null,
      nextOpenLabel: null,
    };
  }

  const next = findNextOpenSlot(byDay, timeZone, now, instant);
  return {
    isOpen: false,
    alwaysOpen: false,
    timezone: timeZone,
    message: next
      ? `Closed · Schedule for ${next.label}`
      : "Closed · Check back later",
    todayLabel,
    nextOpenAt: next?.at.toISOString() ?? null,
    nextOpenLabel: next?.label ?? null,
  };
}

type CalendarParts = {
  year: number;
  month: number;
  day: number;
};

export function getCalendarPartsInZone(date: Date, timeZone: string): CalendarParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    year: Number.parseInt(parts.find((p) => p.type === "year")?.value ?? "0", 10),
    month: Number.parseInt(parts.find((p) => p.type === "month")?.value ?? "1", 10),
    day: Number.parseInt(parts.find((p) => p.type === "day")?.value ?? "1", 10),
  };
}

/** Convert a wall-clock time in `timeZone` to a UTC Date. */
export function zonedLocalToUtc(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  let utc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

  for (let i = 0; i < 4; i += 1) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(utc);

    const gotY = Number.parseInt(
      parts.find((p) => p.type === "year")?.value ?? "0",
      10,
    );
    const gotM = Number.parseInt(
      parts.find((p) => p.type === "month")?.value ?? "1",
      10,
    );
    const gotD = Number.parseInt(
      parts.find((p) => p.type === "day")?.value ?? "1",
      10,
    );
    const gotH = Number.parseInt(
      parts.find((p) => p.type === "hour")?.value ?? "0",
      10,
    );
    const gotMin = Number.parseInt(
      parts.find((p) => p.type === "minute")?.value ?? "0",
      10,
    );

    const desired = Date.UTC(year, month - 1, day, hour, minute);
    const actual = Date.UTC(gotY, gotM - 1, gotD, gotH, gotMin);
    const delta = desired - actual;
    if (delta === 0) {
      break;
    }
    utc = new Date(utc.getTime() + delta);
  }

  return utc;
}

function addCalendarDays(parts: CalendarParts, days: number): CalendarParts {
  const base = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return {
    year: base.getUTCFullYear(),
    month: base.getUTCMonth() + 1,
    day: base.getUTCDate(),
  };
}

function formatNextOpenLabel(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(at);
}

function findNextOpenSlot(
  byDay: Map<number, HoursRow>,
  timeZone: string,
  now: Date,
  instant: InstantInZone,
): { at: Date; label: string } | null {
  const todayParts = getCalendarPartsInZone(now, timeZone);

  for (let offset = 0; offset < 7; offset += 1) {
    const day = ((instant.dayOfWeek + offset) % 7) as DayOfWeek;
    const row = byDay.get(day);
    if (!row || row.closed || row.openMinute == null) {
      continue;
    }
    if (offset === 0 && row.openMinute <= instant.minuteOfDay) {
      continue;
    }

    const calendar = addCalendarDays(todayParts, offset);
    const hour = Math.floor(row.openMinute / 60);
    const minute = row.openMinute % 60;
    const at = zonedLocalToUtc(
      timeZone,
      calendar.year,
      calendar.month,
      calendar.day,
      hour,
      minute,
    );
    return { at, label: formatNextOpenLabel(at, timeZone) };
  }

  return null;
}

export function mapRowsToScheduleDays(rows: HoursRow[]): StoreHoursDay[] {
  const byDay = new Map(rows.map((row) => [row.dayOfWeek, row]));
  return DAY_OF_WEEK_LABELS.map((_, dayOfWeek) => {
    const row = byDay.get(dayOfWeek);
    if (!row) {
      return {
        dayOfWeek: dayOfWeek as DayOfWeek,
        closed: true,
        openTime: null,
        closeTime: null,
      };
    }
    return {
      dayOfWeek: dayOfWeek as DayOfWeek,
      closed: row.closed,
      openTime:
        !row.closed && row.openMinute != null
          ? minutesToTimeString(row.openMinute)
          : null,
      closeTime:
        !row.closed && row.closeMinute != null
          ? minutesToTimeString(row.closeMinute)
          : null,
    };
  });
}
