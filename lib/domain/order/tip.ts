export const TIP_PERCENTS = [0, 10, 15, 18, 20] as const;

export type TipPercent = (typeof TIP_PERCENTS)[number];

export function tipCentsFromPercent(
  subtotalCents: number,
  percent: number,
): number {
  if (percent <= 0) return 0;
  return Math.round((Math.max(0, Math.floor(subtotalCents)) * percent) / 100);
}

export function parseTipDollarsToCents(raw: string): number {
  const normalized = raw.trim().replace(/[^0-9.]/g, "");
  if (!normalized) return 0;
  const dollars = Number(normalized);
  if (!Number.isFinite(dollars) || dollars < 0) return 0;
  return Math.min(50_000, Math.round(dollars * 100));
}

export function matchingTipPercent(
  subtotalCents: number,
  tipCents: number,
): TipPercent | "custom" {
  if (tipCents <= 0) return 0;
  for (const percent of TIP_PERCENTS) {
    if (
      percent > 0 &&
      tipCentsFromPercent(subtotalCents, percent) === tipCents
    ) {
      return percent;
    }
  }
  return "custom";
}

export function clampTipCents(tipCents: number): number {
  if (!Number.isFinite(tipCents) || tipCents < 0) return 0;
  return Math.min(50_000, Math.floor(tipCents));
}
