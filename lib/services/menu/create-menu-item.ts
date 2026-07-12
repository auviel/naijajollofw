import { requireStoreManager } from "@/lib/auth/session";
import {
  mapMenuItemToDetail,
  menuRepository,
  type ModifierGroupWriteInput,
} from "@/lib/db/repositories/menu.repository";
import { createMenuItemSchema } from "@/lib/domain/menu/validation";
import { AppError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

function normalizeImageUrl(value: string | null | undefined): string | null {
  if (!value || value.trim() === "") {
    return null;
  }
  return value.trim();
}

function normalizeModifierGroups(
  groups: ReturnType<typeof createMenuItemSchema.parse>["modifierGroups"],
): ModifierGroupWriteInput[] {
  return (groups ?? []).map((group) => ({
    id: group.id,
    name: group.name,
    required: group.required,
    minSelect: group.minSelect,
    maxSelect: group.maxSelect,
    sortOrder: group.sortOrder,
    modifiers: (group.modifiers ?? []).map((modifier) => ({
      id: modifier.id,
      name: modifier.name,
      priceDeltaCents: modifier.priceDeltaCents,
      available: modifier.available,
      sortOrder: modifier.sortOrder,
    })),
  }));
}

export async function createMenuItem(input: unknown) {
  const user = await requireStoreManager();
  const parsed = createMenuItemSchema.parse(input);

  const category = await menuRepository.findCategoryByIdAndStoreId(
    parsed.categoryId,
    user.storeId,
  );
  if (!category) {
    throw new AppError("NOT_FOUND", "Category not found", 404);
  }

  const sortOrder =
    parsed.sortOrder ??
    (await menuRepository.nextItemSortOrder(user.storeId, parsed.categoryId));

  const item = await menuRepository.createItem({
    storeId: user.storeId,
    categoryId: parsed.categoryId,
    name: parsed.name,
    description: parsed.description?.trim() ? parsed.description.trim() : null,
    priceCents: parsed.priceCents,
    imageUrl: normalizeImageUrl(parsed.imageUrl),
    available: parsed.available ?? true,
    sortOrder,
    modifierGroups: normalizeModifierGroups(parsed.modifierGroups),
  });

  logger.info("menu.item.created", {
    itemId: item.id,
    storeId: user.storeId,
  });

  return mapMenuItemToDetail(item);
}
