import type { ModifierGroupWriteInput } from "@/lib/db/repositories/menu.repository";
import { menuRepository } from "@/lib/db/repositories/menu.repository";
import { MODIFIER_GROUP_MAX_SELECT_DEFAULT } from "@/lib/domain/menu/limits";
import type {
  createMenuItemSchema,
  updateMenuItemSchema,
} from "@/lib/domain/menu/validation";
import { AppError } from "@/lib/utils/errors";

type ParsedGroups =
  | NonNullable<ReturnType<typeof createMenuItemSchema.parse>["modifierGroups"]>
  | NonNullable<ReturnType<typeof updateMenuItemSchema.parse>["modifierGroups"]>;

export function toModifierGroupWriteInput(
  groups: ParsedGroups | undefined,
): ModifierGroupWriteInput[] {
  return (groups ?? []).map((group) => ({
    id: group.id,
    name: group.name,
    required: group.required ?? false,
    minSelect: group.minSelect ?? 0,
    maxSelect: group.maxSelect ?? MODIFIER_GROUP_MAX_SELECT_DEFAULT,
    sortOrder: group.sortOrder,
    sourceCategoryId: group.sourceCategoryId ?? null,
    sourceItemIds: group.sourceItemIds ?? [],
    modifiers: (group.modifiers ?? []).map((modifier) => ({
      id: modifier.id,
      sourceItemId: modifier.sourceItemId ?? null,
      name: modifier.name,
      priceDeltaCents: modifier.priceDeltaCents,
      available: modifier.available,
      sortOrder: modifier.sortOrder,
    })),
  }));
}

export async function assertModifierSources(input: {
  storeId: string;
  hostItemId?: string | null;
  groups: ModifierGroupWriteInput[];
}) {
  const categoryIds = [
    ...new Set(
      input.groups
        .map((group) => group.sourceCategoryId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const itemIds = [
    ...new Set(
      input.groups.flatMap((group) => [
        ...(group.sourceItemIds ?? []),
        ...(group.modifiers ?? [])
          .map((modifier) => modifier.sourceItemId)
          .filter((id): id is string => Boolean(id)),
      ]),
    ),
  ];

  if (input.hostItemId && itemIds.includes(input.hostItemId)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "An item cannot use itself as a modifier.",
      400,
    );
  }

  for (const categoryId of categoryIds) {
    const category = await menuRepository.findCategoryByIdAndStoreId(
      categoryId,
      input.storeId,
    );
    if (!category) {
      throw new AppError("NOT_FOUND", "Modifier category not found", 404);
    }
  }

  if (itemIds.length === 0) {
    return;
  }

  const pickerItems = await menuRepository.listPickerItemsForStore(input.storeId);
  const known = new Set(pickerItems.map((item) => item.id));
  if (itemIds.some((id) => !known.has(id))) {
    throw new AppError("NOT_FOUND", "Modifier product not found", 404);
  }
}
