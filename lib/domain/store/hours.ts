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
    };
  }

  const nextOpen = findNextOpen(byDay, instant.dayOfWeek, instant.minuteOfDay);
  return {
    isOpen: false,
    alwaysOpen: false,
    timezone: timeZone,
    message: nextOpen
      ? `Closed · Opens ${nextOpen}`
      : "Closed · Check back later",
    todayLabel,
  };
}

function findNextOpen(
  byDay: Map<number, HoursRow>,
  fromDay: number,
  fromMinute: number,
): string | null {
  for (let offset = 0; offset < 7; offset += 1) {
    const day = (fromDay + offset) % 7;
    const row = byDay.get(day);
    if (!row || row.closed || row.openMinute == null) {
      continue;
    }
    if (offset === 0 && row.openMinute <= fromMinute) {
      // Already past today's open (and we're closed), try later days
      continue;
    }
    if (offset === 0 && row.openMinute > fromMinute) {
      return `today at ${minutesToTimeString(row.openMinute)}`;
    }
    const label = dayOfWeekLabel(day);
    return `${label} at ${minutesToTimeString(row.openMinute)}`;
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
