import {
  expandCatalogQuery,
  itemMatchesDrinkScope,
} from "@/lib/ai/catalog/expand-query";
import type { CatalogSearchItem } from "@/lib/ai/ports/catalog";

function scoreItem(
  item: CatalogSearchItem,
  tokens: string[],
  needle: string,
  categoryBoostNeedles: string[],
): number {
  if (!needle) return 0;
  const name = item.name.toLowerCase();
  const desc = (item.description ?? "").toLowerCase();
  const category = (item.categoryName ?? "").toLowerCase();
  let score = 0;
  if (name === needle) score += 100;
  if (name.startsWith(needle)) score += 40;
  if (name.includes(needle)) score += 25;
  if (desc.includes(needle)) score += 10;
  if (category && category.includes(needle)) score += 20;
  for (const token of tokens) {
    if (name.includes(token)) score += 12;
    else if (desc.includes(token)) score += 5;
    else if (category.includes(token)) score += 8;
  }
  for (const boost of categoryBoostNeedles) {
    if (category.includes(boost)) score += 15;
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
  const expanded = expandCatalogQuery(query);
  if (!expanded.needle) return [];

  const pool =
    expanded.scope === "drinks"
      ? items.filter((item) => itemMatchesDrinkScope(item))
      : items;

  return [...pool]
    .map((item) => ({
      item,
      score: scoreItem(
        item,
        expanded.tokens,
        expanded.needle,
        expanded.categoryBoostNeedles,
      ),
    }))
    .filter((row) => row.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.item.name.localeCompare(b.item.name),
    )
    .slice(0, limit)
    .map((row) => row.item);
}
