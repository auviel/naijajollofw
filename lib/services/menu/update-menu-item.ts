import { requireStoreManager } from "@/lib/auth/session";
import {
  mapMenuItemToDetail,
  menuRepository,
} from "@/lib/db/repositories/menu.repository";
import { updateMenuItemSchema } from "@/lib/domain/menu/validation";
import { isR2Configured } from "@/lib/integrations/r2/config";
import { deleteR2Object } from "@/lib/integrations/r2/client";
import { revalidateStorefrontCache } from "@/lib/cache/storefront";
import {
  assertModifierSources,
  toModifierGroupWriteInput,
} from "@/lib/services/menu/normalize-modifier-groups";
import { AppError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

function normalizeImageUrl(value: string | null | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!value || value.trim() === "") {
    return null;
  }
  return value.trim();
}

export async function updateMenuItem(id: string, input: unknown) {
  const user = await requireStoreManager();
  const parsed = updateMenuItemSchema.parse(input);

  if (parsed.categoryId) {
    const category = await menuRepository.findCategoryByIdAndStoreId(
      parsed.categoryId,
      user.storeId,
    );
    if (!category) {
      throw new AppError("NOT_FOUND", "Category not found", 404);
    }
  }

  const existing = await menuRepository.findItemByIdAndStoreId(id, user.storeId);
  if (!existing) {
    throw new AppError("NOT_FOUND", "Menu item not found", 404);
  }

  const modifierGroups = parsed.modifierGroups
    ? toModifierGroupWriteInput(parsed.modifierGroups)
    : undefined;
  if (modifierGroups) {
    await assertModifierSources({
      storeId: user.storeId,
      hostItemId: id,
      groups: modifierGroups,
    });
  }

  const nextImageUrl = normalizeImageUrl(parsed.imageUrl);

  // Explicit clear of all photos (form "remove all").
  if (nextImageUrl === null && "imageUrl" in parsed) {
    const cleared = await menuRepository.clearItemImages(id, user.storeId);
    if (cleared && isR2Configured()) {
      for (const image of cleared) {
        if (!image.objectKey) continue;
        try {
          await deleteR2Object(image.objectKey);
        } catch (error) {
          logger.warn("r2.delete.cleared.failed", {
            key: image.objectKey,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  }

  const item = await menuRepository.updateItem(id, user.storeId, {
    categoryId: parsed.categoryId,
    name: parsed.name,
    description:
      parsed.description === undefined
        ? undefined
        : parsed.description?.trim()
          ? parsed.description.trim()
          : null,
    priceCents: parsed.priceCents,
    imageUrl: nextImageUrl === null ? undefined : nextImageUrl,
    available: parsed.available,
    sortOrder: parsed.sortOrder,
    modifierGroups,
  });

  if (!item) {
    throw new AppError("NOT_FOUND", "Menu item not found", 404);
  }

  revalidateStorefrontCache();
  return mapMenuItemToDetail(item);
}
