import { getCalendarPartsInZone } from "@/lib/domain/store/hours";

export function formatDisplayNumber(prefix: string, sequence: number): string {
  const cleanPrefix = prefix.trim().toUpperCase() || "NJ";
  return `${cleanPrefix}-${sequence}`;
}

export function formatOrderRef(input: {
  displayNumber?: string | null;
}): string {
  return input.displayNumber?.trim() || "";
}

/** YYYY-MM-DD in the store timezone. */
export function storeLocalDateKey(at: Date, timeZone: string): string {
  const { year, month, day } = getCalendarPartsInZone(at, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function isSameStoreLocalDate(
  dayTicketDate: Date | string | null | undefined,
  timeZone: string,
  now: Date = new Date(),
): boolean {
  if (!dayTicketDate) return false;
  const stored =
    typeof dayTicketDate === "string"
      ? dayTicketDate.slice(0, 10)
      : dayTicketDate.toISOString().slice(0, 10);
  return stored === storeLocalDateKey(now, timeZone);
}

/** Search variants for lifetime numbers (`nj 1084`, `NJ1084`, `NJ-1084`). */
export function displayNumberSearchTerms(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const compact = trimmed.replace(/\s+/g, "").toUpperCase();
  const terms = new Set<string>([trimmed]);
  const prefixed = /^([A-Z]{1,8})-?(\d+)$/.exec(compact);
  if (prefixed) {
    terms.add(`${prefixed[1]}-${prefixed[2]}`);
  }
  return [...terms];
}
