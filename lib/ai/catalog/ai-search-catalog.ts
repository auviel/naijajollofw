import { mergeRankedSearchResults } from "@/lib/ai/catalog/merge-search-results";
import { interpretSearchQuery } from "@/lib/ai/catalog/interpret-search-query";
import type { CatalogSearchItem } from "@/lib/ai/ports/catalog";
import { createRestaurantCatalogPort } from "@/lib/ai/verticals/restaurant/ports";

export async function aiSearchCatalog(
  query: string,
  limit = 24,
): Promise<{ items: CatalogSearchItem[]; queries: string[] }> {
  const trimmed = query.trim();
  if (!trimmed) return { items: [], queries: [] };

  const catalog = createRestaurantCatalogPort();
  const queries = await interpretSearchQuery(trimmed);
  const perQueryLimit = Math.min(Math.max(limit, 8), 24);

  const resultSets = await Promise.all(
    queries.map((q) => catalog.search(q, perQueryLimit)),
  );

  return {
    items: mergeRankedSearchResults(resultSets, limit),
    queries,
  };
}
