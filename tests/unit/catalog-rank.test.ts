import { describe, expect, it } from "vitest";
import { rankCatalogItems } from "@/lib/ai/catalog/rank";
import type { CatalogSearchItem } from "@/lib/ai/ports/catalog";

const items: CatalogSearchItem[] = [
  {
    id: "1",
    slug: "jollof-rice-plantain-and-chicken",
    name: "Jollof Rice, Plantain and Chicken",
    description: "Smoky party-style jollof.",
    priceCents: 2399,
    imageUrl: null,
    available: true,
  },
  {
    id: "3",
    slug: "fried-plantain",
    name: "Fried Plantain",
    description: "Sweet ripe plantain.",
    priceCents: 599,
    imageUrl: null,
    available: true,
  },
];

describe("rankCatalogItems", () => {
  it("ranks exact-ish name hits first", () => {
    expect(rankCatalogItems(items, "fried plantain", 5)[0]?.slug).toBe(
      "fried-plantain",
    );
  });

  it("matches description tokens", () => {
    expect(
      rankCatalogItems(items, "smoky party rice", 5).some((i) =>
        i.slug.includes("jollof"),
      ),
    ).toBe(true);
  });

  it("prefers available items when scores otherwise tie", () => {
    const tied: CatalogSearchItem[] = [
      {
        id: "a",
        slug: "jollof-sold-out",
        name: "Jollof",
        description: null,
        priceCents: 1000,
        imageUrl: null,
        available: false,
      },
      {
        id: "b",
        slug: "jollof-available",
        name: "Jollof",
        description: null,
        priceCents: 1000,
        imageUrl: null,
        available: true,
      },
    ];
    expect(rankCatalogItems(tied, "jollof", 2)[0]?.id).toBe("b");
  });
});
