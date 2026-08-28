import type { CatalogSearchItem } from "@/lib/ai/ports/catalog";

export function mergeRankedSearchResults(
  resultSets: CatalogSearchItem[][],
  limit: number,
): CatalogSearchItem[] {
  const seen = new Map<string, CatalogSearchItem>();
  for (const items of resultSets) {
    for (const item of items) {
      if (!seen.has(item.id)) seen.set(item.id, item);
    }
  }
  return [...seen.values()].slice(0, limit);
}
