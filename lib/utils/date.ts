import { getStoreTimeZone } from "@/lib/config/environment";

function createDateFormatter() {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: getStoreTimeZone(),
  });
}

let cachedFormatter: Intl.DateTimeFormat | undefined;

function getDateFormatter(): Intl.DateTimeFormat {
  cachedFormatter ??= createDateFormatter();
  return cachedFormatter;
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (date == null) {
    return "—";
  }

  const parsed = date instanceof Date ? date : new Date(date);
  if (!Number.isFinite(parsed.getTime())) {
    return "—";
  }

  return getDateFormatter().format(parsed);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1)}…`;
}
