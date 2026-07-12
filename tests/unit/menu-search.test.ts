import { describe, expect, it } from "vitest";
import {
  buildSearchIndex,
  buildSearchSuggestions,
  countFilteredItems,
  filterCatalogByQuery,
} from "@/lib/domain/menu/search";
import type { MenuCatalog } from "@/lib/domain/menu/types";

const catalog: MenuCatalog = {
  categories: [
    {
      id: "rice",
      name: "Rice & Combos",
      sortOrder: 0,
      active: true,
      items: [
        {
          id: "1",
          categoryId: "rice",
          categoryName: "Rice & Combos",
          name: "Jollof Rice, Plantain and Chicken",
          description: "Smoky party-style jollof.",
          priceCents: 2399,
          imageUrl: null,
          available: true,
          sortOrder: 0,
          modifierGroupCount: 0,
        },
        {
          id: "2",
          categoryId: "rice",
          categoryName: "Rice & Combos",
          name: "Jollof Rice and Turkey",
          description: null,
          priceCents: 2199,
          imageUrl: null,
          available: true,
          sortOrder: 1,
          modifierGroupCount: 0,
        },
      ],
    },
    {
      id: "sides",
      name: "Sides",
      sortOrder: 1,
      active: true,
      items: [
        {
          id: "3",
          categoryId: "sides",
          categoryName: "Sides",
          name: "Fried Plantain",
          description: "Sweet ripe plantain.",
          priceCents: 699,
          imageUrl: null,
          available: true,
          sortOrder: 0,
          modifierGroupCount: 0,
        },
      ],
    },
  ],
};

describe("filterCatalogByQuery", () => {
  it("returns all categories when query is empty", () => {
    expect(filterCatalogByQuery(catalog, "  ").length).toBe(2);
  });

  it("filters by name and drops empty categories", () => {
    const filtered = filterCatalogByQuery(catalog, "jollof");
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.items).toHaveLength(2);
    expect(countFilteredItems(filtered)).toBe(2);
  });

  it("matches description", () => {
    const filtered = filterCatalogByQuery(catalog, "smoky");
    expect(countFilteredItems(filtered)).toBe(1);
    expect(filtered[0]!.items[0]!.id).toBe("1");
  });
});

describe("buildSearchSuggestions", () => {
  const index = buildSearchIndex(catalog);

  it("returns matching items and keywords", () => {
    const result = buildSearchSuggestions(index, "jollof");
    expect(result.items.map((i) => i.id)).toEqual(["1", "2"]);
    expect(result.keywords.length).toBeGreaterThan(0);
    expect(
      result.keywords.some((k) => k.toLowerCase().includes("jollof")),
    ).toBe(true);
  });

  it("returns empty for blank draft", () => {
    expect(buildSearchSuggestions(index, "")).toEqual({
      items: [],
      keywords: [],
    });
  });
});
