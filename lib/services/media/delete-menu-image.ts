import { requireStoreManager } from "@/lib/auth/session";
import { menuRepository } from "@/lib/db/repositories/menu.repository";
import { isR2Configured } from "@/lib/integrations/r2/config";
import { deleteR2Object } from "@/lib/integrations/r2/client";
import { revalidateStorefrontCache } from "@/lib/cache/storefront";
import { AppError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

export async function deleteMenuItemImage(
  menuItemId: string,
  imageId: string,
): Promise<{ imageCount: number; imageUrl: string | null }> {
  const user = await requireStoreManager();

  if (imageId === "legacy") {
    // Legacy cover without a MenuItemImage row — clear cover only.
    const item = await menuRepository.findItemByIdAndStoreId(
      menuItemId,
      user.storeId,
    );
    if (!item) {
      throw new AppError("NOT_FOUND", "Menu item not found", 404);
    }
    await menuRepository.updateItem(menuItemId, user.storeId, {
      imageUrl: null,
    });
    revalidateStorefrontCache();
    return { imageCount: 0, imageUrl: null };
  }

  const result = await menuRepository.deleteItemImage({
    itemId: menuItemId,
    storeId: user.storeId,
    imageId,
  });
  if (!result) {
    throw new AppError("NOT_FOUND", "Image not found", 404);
  }

  const objectKey = result.deleted.objectKey;
  if (objectKey && isR2Configured()) {
    try {
      await deleteR2Object(objectKey);
    } catch (error) {
      logger.warn("r2.delete.image.failed", {
        key: objectKey,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  revalidateStorefrontCache();
  return {
    imageCount: result.remaining.length,
    imageUrl: result.remaining[0]?.url ?? null,
  };
}
