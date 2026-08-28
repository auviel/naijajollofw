import type { CatalogSearchItem } from "@/lib/ai/ports/catalog";

function normalizeNeedle(q: string): string {
  return q.trim().toLowerCase();
}

function tokenize(q: string): string[] {
  return normalizeNeedle(q)
    .split(/[^a-z0-9+]+/)
    .filter((t) => t.length > 1);
}

function scoreItem(
  item: CatalogSearchItem,
  tokens: string[],
  needle: string,
): number {
  if (!needle) return 0;
  const name = item.name.toLowerCase();
  const desc = (item.description ?? "").toLowerCase();
  let score = 0;
  if (name === needle) score += 100;
  if (name.startsWith(needle)) score += 40;
  if (name.includes(needle)) score += 25;
  if (desc.includes(needle)) score += 10;
  for (const token of tokens) {
    if (name.includes(token)) score += 12;
    else if (desc.includes(token)) score += 5;
  }
  if (score > 0 && item.available) score += 3;
  return score;
}

/** Rank catalog items by token relevance. Pure — no DB / menu imports. */
export function rankCatalogItems(
  items: CatalogSearchItem[],
  query: string,
  limit = 8,
): CatalogSearchItem[] {
  const needle = normalizeNeedle(query);
  if (!needle) return [];
  const tokens = tokenize(needle);
  return [...items]
    .map((item) => ({ item, score: scoreItem(item, tokens, needle) }))
    .filter((row) => row.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.item.name.localeCompare(b.item.name),
    )
    .slice(0, limit)
    .map((row) => row.item);
}
