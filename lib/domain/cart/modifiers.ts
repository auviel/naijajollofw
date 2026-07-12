import type { MenuModifierGroupView } from "@/lib/domain/menu/types";
import type { CartModifierSelection } from "@/lib/domain/cart/types";
import { AppError } from "@/lib/utils/errors";

export function resolveModifierSelections(
  groups: MenuModifierGroupView[],
  modifierIds: string[],
): CartModifierSelection[] {
  const selectedIds = new Set(modifierIds);
  const selections: CartModifierSelection[] = [];

  for (const group of groups) {
    const availableModifiers = group.modifiers.filter((modifier) => modifier.available);
    const chosen = availableModifiers.filter((modifier) => selectedIds.has(modifier.id));

    if (chosen.length < group.minSelect || (group.required && chosen.length === 0)) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Choose at least ${Math.max(group.minSelect, group.required ? 1 : 0)} option(s) for “${group.name}”.`,
        400,
      );
    }

    if (chosen.length > group.maxSelect) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Choose at most ${group.maxSelect} option(s) for “${group.name}”.`,
        400,
      );
    }

    for (const modifier of chosen) {
      selections.push({
        groupId: group.id,
        groupName: group.name,
        modifierId: modifier.id,
        name: modifier.name,
        priceDeltaCents: modifier.priceDeltaCents,
      });
      selectedIds.delete(modifier.id);
    }
  }

  if (selectedIds.size > 0) {
    throw new AppError("VALIDATION_ERROR", "One or more modifiers are invalid.", 400);
  }

  return selections;
}

export function lineUnitPriceCents(
  basePriceCents: number,
  modifiers: CartModifierSelection[],
): number {
  return (
    basePriceCents +
    modifiers.reduce((sum, modifier) => sum + modifier.priceDeltaCents, 0)
  );
}

/** Stable key so the same item+modifiers can merge quantities. */
export function modifiersSignature(modifiers: CartModifierSelection[]): string {
  return modifiers
    .map((modifier) => modifier.modifierId)
    .sort()
    .join(",");
}
