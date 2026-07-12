import type {
  MenuCatalog,
  MenuCategoryView,
  MenuItemListItem,
} from "@/lib/domain/menu/types";

export type MenuSearchItem = Pick<
  MenuItemListItem,
  "id" | "name" | "description" | "priceCents" | "imageUrl" | "available"
>;

export type MenuSearchIndex = {
  items: MenuSearchItem[];
};

export type SearchSuggestions = {
  items: MenuSearchItem[];
  keywords: string[];
};

function normalizeNeedle(q: string): string {
  return q.trim().toLowerCase();
}

function itemMatches(item: MenuSearchItem, needle: string): boolean {
  if (!needle) return true;
  return (
    item.name.toLowerCase().includes(needle) ||
    (item.description?.toLowerCase().includes(needle) ?? false)
  );
}

/** Flatten catalog items for header typeahead (no modifiers). */
export function buildSearchIndex(catalog: MenuCatalog): MenuSearchIndex {
  const items: MenuSearchItem[] = [];
  const seen = new Set<string>();
  for (const category of catalog.categories) {
    for (const item of category.items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      items.push({
        id: item.id,
        name: item.name,
        description: item.description,
        priceCents: item.priceCents,
        imageUrl: item.imageUrl,
        available: item.available,
      });
    }
  }
  return { items };
}

export function filterCatalogByQuery(
  catalog: MenuCatalog,
  q: string,
): MenuCategoryView[] {
  const needle = normalizeNeedle(q);
  if (!needle) {
    return catalog.categories;
  }

  return catalog.categories
    .map((category) => ({
      ...category,
      items: category.items.filter((item) => itemMatches(item, needle)),
    }))
    .filter((category) => category.items.length > 0);
}

export function countFilteredItems(categories: MenuCategoryView[]): number {
  return categories.reduce((sum, category) => sum + category.items.length, 0);
}

/**
 * Typeahead rows: matching items + short keyword phrases from item names,
 * plus the caller adds a final “Search for q” action.
 */
export function buildSearchSuggestions(
  index: MenuSearchIndex,
  draft: string,
  limits: { items?: number; keywords?: number } = {},
): SearchSuggestions {
  const itemLimit = limits.items ?? 5;
  const keywordLimit = limits.keywords ?? 5;
  const needle = normalizeNeedle(draft);

  if (!needle) {
    return { items: [], keywords: [] };
  }

  const items = index.items
    .filter((item) => itemMatches(item, needle))
    .slice(0, itemLimit);

  const keywords: string[] = [];
  const seen = new Set<string>();

  for (const item of index.items) {
    const nameLower = item.name.toLowerCase();
    if (!nameLower.includes(needle)) continue;

    const phrase = item.name.trim();
    const key = phrase.toLowerCase();
    if (key === needle || seen.has(key)) continue;
    seen.add(key);
    keywords.push(phrase);
    if (keywords.length >= keywordLimit) break;
  }

  // Also suggest shorter token phrases (e.g. "jollof rice") when useful.
  if (keywords.length < keywordLimit) {
    for (const item of index.items) {
      const tokens = item.name
        .toLowerCase()
        .split(/[^a-z0-9+]+/)
        .filter(Boolean);
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens.at(i);
        if (!token) continue;
        if (!token.includes(needle) && token !== needle) continue;
        const phrase = tokens.slice(i, Math.min(i + 3, tokens.length)).join(" ");
        if (phrase.length < needle.length || phrase === needle) continue;
        if (seen.has(phrase)) continue;
        seen.add(phrase);
        keywords.push(phrase);
        if (keywords.length >= keywordLimit) break;
      }
      if (keywords.length >= keywordLimit) break;
    }
  }

  return { items, keywords };
}
