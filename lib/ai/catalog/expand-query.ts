/** Expand diner phrasing into catalog tokens; lock drink searches to drink-like items. */

export type ExpandedCatalogQuery = {
  needle: string;
  tokens: string[];
  /** When "drinks", never fall back to food/sides — empty is better than bread. */
  scope: "drinks" | null;
  categoryBoostNeedles: string[];
};

const DRINK_PHRASE_TRIGGERS = [
  /\bsoft\s*drinks?\b/i,
  /\bdrinks?\b/i,
  /\bsodas?\b/i,
  /\bbeverages?\b/i,
  /\bjuices?\b/i,
  /\bmalt\b/i,
  /\bcoke\b/i,
  /\bcoca[\s-]?cola\b/i,
  /\bsprite\b/i,
  /\bfanta\b/i,
  /\bchivita\b/i,
  /\bpops?\b/i,
  /\brefreshments?\b/i,
  /\bzobo\b/i,
  /\bchapman\b/i,
];

const DRINK_EXPAND_TOKENS = [
  "drink",
  "juice",
  "soda",
  "soft",
  "chivita",
  "malt",
  "coke",
  "beverage",
  "sprite",
  "fanta",
  "water",
  "zobo",
  "chapman",
  "pop",
];

const DRINK_CATEGORY_NEEDLES = [
  "drink",
  "beverage",
  "juice",
  "soft",
  "refresh",
];

const SWEET_EXPAND_TOKENS = ["sweet", "dessert", "juice", "chivita", "plantain"];

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[^a-z0-9+]+/)
    .filter((t) => t.length > 1);
}

function unique(tokens: string[]): string[] {
  return [...new Set(tokens)];
}

export function isDrinkCategoryName(
  categoryName: string | null | undefined,
): boolean {
  const c = (categoryName ?? "").toLowerCase();
  if (!c) return false;
  return DRINK_CATEGORY_NEEDLES.some((n) => c.includes(n));
}

/** True if name/description/category looks like a drink SKU. */
export function itemMatchesDrinkScope(item: {
  name: string;
  description: string | null;
  categoryName?: string | null;
}): boolean {
  if (isDrinkCategoryName(item.categoryName)) return true;
  const hay = `${item.name} ${item.description ?? ""}`.toLowerCase();
  return DRINK_EXPAND_TOKENS.some((t) => t.length > 2 && hay.includes(t));
}

export function expandCatalogQuery(query: string): ExpandedCatalogQuery {
  const needle = query.trim().toLowerCase();
  const baseTokens = tokenize(needle);
  if (!needle) {
    return {
      needle: "",
      tokens: [],
      scope: null,
      categoryBoostNeedles: [],
    };
  }

  const isDrinks = DRINK_PHRASE_TRIGGERS.some((re) => re.test(needle));
  if (isDrinks) {
    return {
      needle,
      tokens: unique([...baseTokens, ...DRINK_EXPAND_TOKENS]),
      scope: "drinks",
      categoryBoostNeedles: DRINK_CATEGORY_NEEDLES,
    };
  }

  if (/\bsweet\b/i.test(needle) || /\bdessert\b/i.test(needle)) {
    return {
      needle,
      tokens: unique([...baseTokens, ...SWEET_EXPAND_TOKENS]),
      scope: null,
      categoryBoostNeedles: ["dessert", "sweet", "drink", "juice"],
    };
  }

  return {
    needle,
    tokens: baseTokens,
    scope: null,
    categoryBoostNeedles: [],
  };
}
