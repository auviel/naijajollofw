import { parseDollarsToCents } from "@/lib/domain/menu/format";
import type { MenuModifierGroupView } from "@/lib/domain/menu/types";

export type MenuItemFieldErrors = {
  categoryId?: string;
  name?: string;
  priceDollars?: string;
};

export type MenuItemGroupErrors = Record<
  string,
  { name?: string; minSelect?: string; maxSelect?: string }
>;

export type MenuItemModifierErrors = Record<
  string,
  { name?: string; priceDollars?: string }
>;

export type MenuItemFormValidation = {
  fieldErrors: MenuItemFieldErrors;
  groupErrors: MenuItemGroupErrors;
  modifierErrors: MenuItemModifierErrors;
};

export function validateMenuItemForm(input: {
  categoryId: string;
  name: string;
  priceDollars: string;
  groups: Array<{
    key: string;
    name: string;
    minSelect: string;
    maxSelect: string;
    modifiers: Array<{
      key: string;
      name: string;
      priceDollars: string;
    }>;
  }>;
}): MenuItemFormValidation {
  const fieldErrors: MenuItemFieldErrors = {};
  const groupErrors: MenuItemGroupErrors = {};
  const modifierErrors: MenuItemModifierErrors = {};

  if (!input.categoryId) {
    fieldErrors.categoryId = "Choose a category.";
  }
  if (!input.name.trim()) {
    fieldErrors.name = "Item name is required.";
  }
  if (parseDollarsToCents(input.priceDollars) === null) {
    fieldErrors.priceDollars = "Enter a valid price like 12.50.";
  }

  for (const group of input.groups) {
    const nextGroup: MenuItemGroupErrors[string] = {};
    if (!group.name.trim()) {
      nextGroup.name = "Each modifier group needs a name.";
    }
    const minSelect = Number.parseInt(group.minSelect || "0", 10);
    const maxSelect = Number.parseInt(group.maxSelect || "1", 10);
    if (!Number.isFinite(minSelect) || minSelect < 0) {
      nextGroup.minSelect = "Enter a valid minimum.";
    }
    if (!Number.isFinite(maxSelect) || maxSelect < 1) {
      nextGroup.maxSelect = "Max select must be at least 1.";
    } else if (Number.isFinite(minSelect) && minSelect > maxSelect) {
      nextGroup.maxSelect = "Max select must be at least the minimum.";
    }
    if (Object.keys(nextGroup).length > 0) {
      groupErrors[group.key] = nextGroup;
    }

    for (const modifier of group.modifiers) {
      const nextModifier: MenuItemModifierErrors[string] = {};
      if (!modifier.name.trim()) {
        nextModifier.name = "Modifier name is required.";
      }
      if (parseDollarsToCents(modifier.priceDollars || "0") === null) {
        nextModifier.priceDollars = "Enter a valid price.";
      }
      if (Object.keys(nextModifier).length > 0) {
        modifierErrors[modifier.key] = nextModifier;
      }
    }
  }

  return { fieldErrors, groupErrors, modifierErrors };
}

export function hasMenuItemFormErrors(result: MenuItemFormValidation): boolean {
  return (
    Object.keys(result.fieldErrors).length > 0 ||
    Object.keys(result.groupErrors).length > 0 ||
    Object.keys(result.modifierErrors).length > 0
  );
}

export function modifierSelectionErrors(
  groups: MenuModifierGroupView[],
  selectedByGroup: Map<string, string[]>,
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const group of groups) {
    const chosenIds = new Set(selectedByGroup.get(group.id) ?? []);
    const chosen = group.modifiers.filter(
      (modifier) => modifier.available && chosenIds.has(modifier.id),
    );
    const minRequired = Math.max(group.minSelect, group.required ? 1 : 0);

    if (chosen.length < minRequired) {
      errors[group.id] =
        minRequired <= 1
          ? `Choose ${group.name}.`
          : `Choose at least ${minRequired} for ${group.name}.`;
      continue;
    }

    if (chosen.length > group.maxSelect) {
      errors[group.id] = `Choose at most ${group.maxSelect} for ${group.name}.`;
    }
  }

  return errors;
}
