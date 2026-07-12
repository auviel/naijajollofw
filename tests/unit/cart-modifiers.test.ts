import { describe, expect, it } from "vitest";
import {
  lineUnitPriceCents,
  modifiersSignature,
  resolveModifierSelections,
} from "@/lib/domain/cart/modifiers";
import type { MenuModifierGroupView } from "@/lib/domain/menu/types";
import { AppError } from "@/lib/utils/errors";

const groups: MenuModifierGroupView[] = [
  {
    id: "group-addons",
    name: "Add-ons",
    required: false,
    minSelect: 0,
    maxSelect: 2,
    sortOrder: 0,
    modifiers: [
      {
        id: "mod-bacon",
        name: "Bacon",
        priceDeltaCents: 200,
        available: true,
        sortOrder: 0,
      },
      {
        id: "mod-egg",
        name: "Egg",
        priceDeltaCents: 150,
        available: true,
        sortOrder: 1,
      },
    ],
  },
];

describe("cart modifiers", () => {
  it("resolves valid selections and prices", () => {
    const selections = resolveModifierSelections(groups, ["mod-bacon"]);
    expect(selections).toHaveLength(1);
    expect(lineUnitPriceCents(1450, selections)).toBe(1650);
  });

  it("rejects too many selections", () => {
    expect(() =>
      resolveModifierSelections(
        [
          {
            ...groups[0]!,
            maxSelect: 1,
          },
        ],
        ["mod-bacon", "mod-egg"],
      ),
    ).toThrow(AppError);
  });

  it("builds a stable signature", () => {
    const a = resolveModifierSelections(groups, ["mod-egg", "mod-bacon"]);
    const b = resolveModifierSelections(groups, ["mod-bacon", "mod-egg"]);
    expect(modifiersSignature(a)).toBe(modifiersSignature(b));
  });
});
