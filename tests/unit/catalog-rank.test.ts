import { describe, expect, it } from "vitest";
import {
  expandCatalogQuery,
  itemMatchesDrinkScope,
} from "@/lib/ai/catalog/expand-query";
import { rankCatalogItems } from "@/lib/ai/catalog/rank";
import type { CatalogSearchItem } from "@/lib/ai/ports/catalog";

const item = (
  partial: Partial<CatalogSearchItem> &
    Pick<CatalogSearchItem, "id" | "slug" | "name">,
): CatalogSearchItem => ({
  description: null,
  priceCents: 500,
  imageUrl: null,
  available: true,
  categoryName: null,
  ...partial,
});

describe("expandCatalogQuery", () => {
  it("scopes soft drink queries to drinks", () => {
    const expanded = expandCatalogQuery("Yeah soft drink");
    expect(expanded.scope).toBe("drinks");
    expect(expanded.tokens).toEqual(
      expect.arrayContaining(["soft", "drink", "juice", "chivita"]),
    );
  });

  it("does not drink-scope plain dish queries", () => {
    expect(expandCatalogQuery("jollof rice").scope).toBeNull();
  });
});

describe("rankCatalogItems drink scope", () => {
  const catalog: CatalogSearchItem[] = [
    item({
      id: "bread",
      slug: "agege-bread",
      name: "Agege Bread - sliced",
      categoryName: "Sides",
    }),
    item({
      id: "asun",
      slug: "asun",
      name: "Asun — Spicy Goat Meat",
      categoryName: "Mains",
    }),
    item({
      id: "chivita",
      slug: "chivita",
      name: "Chivita",
      categoryName: "Drinks",
      priceCents: 500,
    }),
    item({
      id: "coke",
      slug: "coke",
      name: "Coca-Cola",
      categoryName: "Soft Drinks",
      priceCents: 300,
    }),
  ];

  it("returns drinks for soft drink, not bread", () => {
    const ranked = rankCatalogItems(catalog, "soft drink", 5);
    expect(ranked.map((i) => i.id)).toEqual(
      expect.arrayContaining(["chivita", "coke"]),
    );
    expect(ranked.some((i) => i.id === "bread" || i.id === "asun")).toBe(
      false,
    );
  });

  it("returns empty when no drink-like items exist", () => {
    const foodOnly = catalog.filter(
      (i) => i.id === "bread" || i.id === "asun",
    );
    expect(rankCatalogItems(foodOnly, "soft drink", 5)).toEqual([]);
  });

  it("still ranks dishes by name without drink lock", () => {
    expect(rankCatalogItems(catalog, "asun", 3)[0]?.id).toBe("asun");
  });
});

describe("itemMatchesDrinkScope", () => {
  it("matches category and drink names", () => {
    expect(
      itemMatchesDrinkScope({
        name: "Chivita",
        description: null,
        categoryName: "Extras",
      }),
    ).toBe(true);
    expect(
      itemMatchesDrinkScope({
        name: "Agege Bread",
        description: null,
        categoryName: "Sides",
      }),
    ).toBe(false);
  });
});
