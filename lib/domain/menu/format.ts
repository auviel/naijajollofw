/** Parse a dollars string like "12.50" into cents. Returns null if invalid. */
export function parseDollarsToCents(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return null;
  }

  const [dollarsPart, centsPart = ""] = trimmed.split(".");
  const dollars = Number.parseInt(dollarsPart ?? "0", 10);
  const cents = Number.parseInt(centsPart.padEnd(2, "0").slice(0, 2) || "0", 10);

  if (!Number.isFinite(dollars) || !Number.isFinite(cents)) {
    return null;
  }

  return dollars * 100 + cents;
}

export function formatCentsAsDollarsInput(cents: number): string {
  return (cents / 100).toFixed(2);
}
