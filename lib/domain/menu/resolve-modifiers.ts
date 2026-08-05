import type {
  MenuModifierGroupView,
  MenuModifierView,
} from "@/lib/domain/menu/types";

export type ModifierSourceItem = {
  id: string;
  name: string;
  priceCents: number;
  available: boolean;
  sortOrder: number;
};

export type ModifierRowInput = {
  id: string;
  name: string;
  priceDeltaCents: number;
  available: boolean;
  sortOrder: number;
  sourceItem: ModifierSourceItem | null;
};

export type ModifierGroupResolveInput = {
  id: string;
  name: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  sortOrder: number;
  sourceCategoryId: string | null;
  sourceCategoryItems: ModifierSourceItem[] | null;
  modifiers: ModifierRowInput[];
};

export function resolveModifierGroupView(
  group: ModifierGroupResolveInput,
  hostItemId: string,
): MenuModifierGroupView {
  return {
    id: group.id,
    name: group.name,
    required: group.required,
    minSelect: group.minSelect,
    maxSelect: group.maxSelect,
    sortOrder: group.sortOrder,
    sourceCategoryId: group.sourceCategoryId,
    modifiers: resolveModifierViews(group, hostItemId),
  };
}

function resolveModifierViews(
  group: ModifierGroupResolveInput,
  hostItemId: string,
): MenuModifierView[] {
  if (group.sourceCategoryId) {
    return (group.sourceCategoryItems ?? [])
      .filter((item) => item.id !== hostItemId)
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      .map((item, index) => ({
        id: item.id,
        name: item.name,
        priceDeltaCents: item.priceCents,
        available: item.available,
        sortOrder: index,
        sourceItemId: item.id,
      }));
  }

  return group.modifiers.map((modifier) => {
    if (modifier.sourceItem && modifier.sourceItem.id !== hostItemId) {
      return {
        id: modifier.id,
        name: modifier.sourceItem.name,
        priceDeltaCents: modifier.sourceItem.priceCents,
        available: modifier.sourceItem.available && modifier.available,
        sortOrder: modifier.sortOrder,
        sourceItemId: modifier.sourceItem.id,
      };
    }

    return {
      id: modifier.id,
      name: modifier.name,
      priceDeltaCents: modifier.priceDeltaCents,
      available: modifier.available,
      sortOrder: modifier.sortOrder,
      sourceItemId: null,
    };
  });
}
