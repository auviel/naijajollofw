/** Minimum lead time before a scheduled pickup (Uber Direct). */
export const MIN_SCHEDULE_LEAD_MINUTES = 15;

/** Uber Direct allows scheduling pickup up to ~30 days ahead (see Uber Direct API docs). */
export const MAX_SCHEDULE_DAYS = 30;

export function getMinScheduledPickupAt(now = new Date()): Date {
  return new Date(now.getTime() + MIN_SCHEDULE_LEAD_MINUTES * 60_000);
}

export function getMaxScheduledPickupAt(now = new Date()): Date {
  return new Date(now.getTime() + MAX_SCHEDULE_DAYS * 24 * 60 * 60_000);
}

export function validateScheduledPickupAt(
  date: Date,
  now = new Date(),
): string | null {
  const min = getMinScheduledPickupAt(now);
  const max = getMaxScheduledPickupAt(now);

  if (date < min) {
    return `Scheduled pickup must be at least ${MIN_SCHEDULE_LEAD_MINUTES} minutes from now.`;
  }

  if (date > max) {
    return `Scheduled pickup cannot be more than ${MAX_SCHEDULE_DAYS} days ahead.`;
  }

  return null;
}

/** Format for HTML datetime-local inputs (browser local timezone). */
export function toDatetimeLocalValue(date: Date): string {
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Parse a datetime-local string in the browser's local timezone. */
export function parseDatetimeLocalValue(value: string): Date {
  const [datePart, timePart = "00:00"] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);

  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatPickupDateLabel(date: Date): string {
  return date.toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatPickupTimeLabel(date: Date): string {
  return date.toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit",
  });
}

const TIME_SLOT_MINUTES = 15;

/** Valid pickup times for a given day, respecting min/max bounds. */
export function getPickupTimeSlots(
  day: Date,
  min: Date,
  max: Date,
  stepMinutes = TIME_SLOT_MINUTES,
): Date[] {
  const dayStart = startOfDay(day);
  const slots: Date[] = [];

  let cursor = new Date(dayStart);

  if (isSameDay(day, min)) {
    cursor = new Date(min);
    const remainder = cursor.getMinutes() % stepMinutes;
    if (remainder !== 0) {
      cursor.setMinutes(cursor.getMinutes() + (stepMinutes - remainder), 0, 0);
    }
  }

  const dayEnd = isSameDay(day, max)
    ? new Date(max)
    : new Date(dayStart.getTime() + 24 * 60 * 60_000 - stepMinutes * 60_000);

  while (cursor <= dayEnd && cursor <= max) {
    if (cursor >= min) {
      slots.push(new Date(cursor));
    }
    cursor = new Date(cursor.getTime() + stepMinutes * 60_000);
  }

  return slots;
}

export function clampScheduledPickupValue(
  value: string,
  minValue: string,
  maxValue: string,
): string {
  const date = parseDatetimeLocalValue(value);
  const min = parseDatetimeLocalValue(minValue);
  const max = parseDatetimeLocalValue(maxValue);

  if (date < min) {
    return toDatetimeLocalValue(min);
  }

  if (date > max) {
    return toDatetimeLocalValue(max);
  }

  const slots = getPickupTimeSlots(startOfDay(date), min, max);
  if (slots.length === 0) {
    return toDatetimeLocalValue(min);
  }

  const match = slots.find((slot) => slot.getTime() === date.getTime());
  if (match) {
    return toDatetimeLocalValue(match);
  }

  const next = slots.find((slot) => slot >= date);
  return toDatetimeLocalValue(next ?? slots[slots.length - 1]!);
}

/** Monday-first calendar weeks that cover the given month. */
export function getCalendarWeeks(viewMonth: Date): Date[][] {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const cursor = new Date(year, month, 1 - startOffset);
  const weeks: Date[][] = [];

  for (let week = 0; week < 6; week += 1) {
    const days: Date[] = [];
    for (let day = 0; day < 7; day += 1) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(days);
  }

  return weeks;
}
