import { describe, expect, it } from "vitest";
import { resolveModifierGroupView } from "@/lib/domain/menu/resolve-modifiers";

describe("resolveModifierGroupView", () => {
  it("expands a live category and skips the host item", () => {
    const view = resolveModifierGroupView(
      {
        id: "group-sides",
        name: "Sides",
        required: false,
        minSelect: 0,
        maxSelect: 10,
        sortOrder: 0,
        sourceCategoryId: "cat-sides",
        sourceCategoryItems: [
          {
            id: "host",
            name: "Jollof",
            priceCents: 2000,
            available: true,
            sortOrder: 0,
          },
          {
            id: "plantain",
            name: "Fried Plantain",
            priceCents: 599,
            available: true,
            sortOrder: 1,
          },
          {
            id: "puff",
            name: "Puff Puff",
            priceCents: 699,
            available: false,
            sortOrder: 2,
          },
        ],
        modifiers: [],
      },
      "host",
    );

    expect(view.modifiers.map((modifier) => modifier.id)).toEqual([
      "plantain",
      "puff",
    ]);
    expect(view.modifiers[0]).toMatchObject({
      name: "Fried Plantain",
      priceDeltaCents: 599,
      sourceItemId: "plantain",
      available: true,
    });
    expect(view.modifiers[1]?.available).toBe(false);
  });

  it("uses live product price and name for linked modifiers", () => {
    const view = resolveModifierGroupView(
      {
        id: "group-protein",
        name: "Protein",
        required: false,
        minSelect: 0,
        maxSelect: 2,
        sortOrder: 0,
        sourceCategoryId: null,
        sourceCategoryItems: null,
        modifiers: [
          {
            id: "mod-1",
            name: "Stale name",
            priceDeltaCents: 100,
            available: true,
            sortOrder: 0,
            sourceItem: {
              id: "item-chicken",
              name: "Extra Protein - Assorted",
              priceCents: 999,
              available: true,
              sortOrder: 0,
            },
          },
        ],
      },
      "host",
    );

    expect(view.modifiers).toEqual([
      {
        id: "mod-1",
        name: "Extra Protein - Assorted",
        priceDeltaCents: 999,
        available: true,
        sortOrder: 0,
        sourceItemId: "item-chicken",
      },
    ]);
  });

  it("keeps legacy custom modifiers unchanged", () => {
    const view = resolveModifierGroupView(
      {
        id: "group-legacy",
        name: "Spice",
        required: true,
        minSelect: 1,
        maxSelect: 1,
        sortOrder: 0,
        sourceCategoryId: null,
        sourceCategoryItems: null,
        modifiers: [
          {
            id: "mod-mild",
            name: "Mild",
            priceDeltaCents: 0,
            available: true,
            sortOrder: 0,
            sourceItem: null,
          },
        ],
      },
      "host",
    );

    expect(view.modifiers[0]).toMatchObject({
      id: "mod-mild",
      name: "Mild",
      priceDeltaCents: 0,
      sourceItemId: null,
    });
  });
});
