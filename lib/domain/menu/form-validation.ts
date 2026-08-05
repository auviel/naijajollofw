import { parseDollarsToCents } from "@/lib/domain/menu/format";
import {
  MENU_ITEM_NAME_MAX,
  MODIFIER_GROUP_MAX_SELECT_DEFAULT,
} from "@/lib/domain/menu/limits";
import type { MenuModifierGroupView } from "@/lib/domain/menu/types";

export type MenuItemFieldErrors = {
  categoryId?: string;
  name?: string;
  priceDollars?: string;
};

export type MenuItemGroupErrorFields = {
  name?: string;
  maxSelect?: string;
  sourceCategoryId?: string;
};

export type MenuItemGroupErrors = Map<string, MenuItemGroupErrorFields>;

export type MenuItemModifierErrors = Map<string, { name?: string; priceDollars?: string }>;

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
    maxSelect: string;
    source: "items" | "category";
    sourceCategoryId: string;
    sourceItemIds: string[];
  }>;
}): MenuItemFormValidation {
  const fieldErrors: MenuItemFieldErrors = {};
  const groupErrors: MenuItemGroupErrors = new Map();
  const modifierErrors: MenuItemModifierErrors = new Map();

  if (!input.categoryId) {
    fieldErrors.categoryId = "Choose a category.";
  }
  if (!input.name.trim()) {
    fieldErrors.name = "Item name is required.";
  } else if (input.name.trim().length > MENU_ITEM_NAME_MAX) {
    fieldErrors.name = `Keep the name under ${MENU_ITEM_NAME_MAX} characters.`;
  }
  if (parseDollarsToCents(input.priceDollars) === null) {
    fieldErrors.priceDollars = "Enter a valid price like 12.50.";
  }

  for (const group of input.groups) {
    const nextGroup: MenuItemGroupErrorFields = {};
    if (!group.name.trim()) {
      nextGroup.name = "Each modifier group needs a name.";
    }
    const maxSelect = Number.parseInt(
      group.maxSelect || String(MODIFIER_GROUP_MAX_SELECT_DEFAULT),
      10,
    );
    if (!Number.isFinite(maxSelect) || maxSelect < 1) {
      nextGroup.maxSelect = "Max must be at least 1.";
    } else if (maxSelect > 20) {
      nextGroup.maxSelect = "Max can be at most 20.";
    }
    if (group.source === "category" && !group.sourceCategoryId) {
      nextGroup.sourceCategoryId = "Choose a category.";
    }
    if (nextGroup.name || nextGroup.maxSelect || nextGroup.sourceCategoryId) {
      groupErrors.set(group.key, nextGroup);
    }
  }

  return { fieldErrors, groupErrors, modifierErrors };
}

export function hasMenuItemFormErrors(result: MenuItemFormValidation): boolean {
  return (
    Object.keys(result.fieldErrors).length > 0 ||
    result.groupErrors.size > 0 ||
    result.modifierErrors.size > 0
  );
}

export function modifierSelectionErrors(
  groups: MenuModifierGroupView[],
  selectedByGroup: Map<string, string[]>,
): Map<string, string> {
  const errors = new Map<string, string>();

  for (const group of groups) {
    const chosenIds = new Set(selectedByGroup.get(group.id) ?? []);
    const chosen = group.modifiers.filter(
      (modifier) => modifier.available && chosenIds.has(modifier.id),
    );
    const minRequired = Math.max(group.minSelect, group.required ? 1 : 0);

    if (chosen.length < minRequired) {
      errors.set(
        group.id,
        minRequired <= 1
          ? `Choose ${group.name}.`
          : `Choose at least ${minRequired} for ${group.name}.`,
      );
      continue;
    }

    if (chosen.length > group.maxSelect) {
      errors.set(
        group.id,
        `Choose at most ${group.maxSelect} for ${group.name}.`,
      );
    }
  }

  return errors;
}

export function clearMenuItemGroupError(
  current: MenuItemGroupErrors,
  key: string,
  field: keyof MenuItemGroupErrorFields,
): MenuItemGroupErrors {
  const existing = current.get(key);
  if (!existing) {
    return current;
  }
  const nextFields: MenuItemGroupErrorFields = {
    name: field === "name" ? undefined : existing.name,
    maxSelect: field === "maxSelect" ? undefined : existing.maxSelect,
    sourceCategoryId:
      field === "sourceCategoryId" ? undefined : existing.sourceCategoryId,
  };
  const next = new Map(current);
  if (nextFields.name || nextFields.maxSelect || nextFields.sourceCategoryId) {
    next.set(key, nextFields);
  } else {
    next.delete(key);
  }
  return next;
}
