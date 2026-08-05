import { requireStoreManager } from "@/lib/auth/session";
import {
  mapMenuItemToDetail,
  menuRepository,
} from "@/lib/db/repositories/menu.repository";
import { createMenuItemSchema } from "@/lib/domain/menu/validation";
import { revalidateStorefrontCache } from "@/lib/cache/storefront";
import {
  assertModifierSources,
  toModifierGroupWriteInput,
} from "@/lib/services/menu/normalize-modifier-groups";
import { AppError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

function normalizeImageUrl(value: string | null | undefined): string | null {
  if (!value || value.trim() === "") {
    return null;
  }
  return value.trim();
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

  const additionalCategoryIds = [
    ...new Set(
      (parsed.additionalCategoryIds ?? []).filter(
        (id) => id !== parsed.categoryId,
      ),
    ),
  ];
  for (const extraId of additionalCategoryIds) {
    const extra = await menuRepository.findCategoryByIdAndStoreId(
      extraId,
      user.storeId,
    );
    if (!extra) {
      throw new AppError("NOT_FOUND", "Additional category not found", 404);
    }
  }

  const sortOrder =
    parsed.sortOrder ??
    (await menuRepository.nextItemSortOrder(user.storeId, parsed.categoryId));

  const modifierGroups = toModifierGroupWriteInput(parsed.modifierGroups);
  await assertModifierSources({
    storeId: user.storeId,
    groups: modifierGroups,
  });

  const item = await menuRepository.createItem({
    storeId: user.storeId,
    categoryId: parsed.categoryId,
    additionalCategoryIds,
    name: parsed.name,
    description: parsed.description?.trim() ? parsed.description.trim() : null,
    priceCents: parsed.priceCents,
    imageUrl: normalizeImageUrl(parsed.imageUrl),
    available: parsed.available ?? true,
    sortOrder,
    modifierGroups,
  });

  logger.info("menu.item.created", {
    itemId: item.id,
    storeId: user.storeId,
  });
  revalidateStorefrontCache();

  return mapMenuItemToDetail(item);
}
