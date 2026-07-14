import { randomUUID } from "node:crypto";
import { requireStoreManager } from "@/lib/auth/session";
import { menuRepository } from "@/lib/db/repositories/menu.repository";
import {
  contentTypeForSniffed,
  extensionForSniffed,
  sniffImageType,
} from "@/lib/domain/menu/image-sniff";
import {
  MENU_IMAGE_ALLOWED_TYPES,
  MENU_IMAGE_MAX_BYTES,
  MENU_IMAGE_MAX_COUNT,
} from "@/lib/domain/menu/media";
import { isR2Configured } from "@/lib/integrations/r2/config";
import { putR2Object } from "@/lib/integrations/r2/client";
import { menuItemImageKey } from "@/lib/integrations/r2/keys";
import { publicUrlForObjectKey } from "@/lib/integrations/r2/public-url";
import { AppError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

export type UploadMenuImageResult = {
  imageUrl: string;
  key: string;
  imageId: string;
  imageCount: number;
};

export async function uploadMenuItemImage(
  menuItemId: string,
  file: File,
): Promise<UploadMenuImageResult> {
  if (!isR2Configured()) {
    throw new AppError(
      "PROVIDER_ERROR",
      "Media storage is not configured for this environment.",
      503,
    );
  }

  const user = await requireStoreManager();
  const item = await menuRepository.findItemByIdAndStoreId(
    menuItemId,
    user.storeId,
  );
  if (!item) {
    throw new AppError("NOT_FOUND", "Menu item not found", 404);
  }

  const existingCount = await menuRepository.countImagesForItem(menuItemId);
  const effectiveCount =
    existingCount > 0 ? existingCount : item.imageUrl ? 1 : 0;
  if (effectiveCount >= MENU_IMAGE_MAX_COUNT) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Each item can have at most ${MENU_IMAGE_MAX_COUNT} photos.`,
      400,
    );
  }

  const declaredType = (file.type || "").trim().toLowerCase();
  if (declaredType && !MENU_IMAGE_ALLOWED_TYPES.has(declaredType)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Upload a JPEG, PNG, WebP, or GIF image.",
      400,
    );
  }

  if (file.size <= 0 || file.size > MENU_IMAGE_MAX_BYTES) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Image must be at most ${Math.floor(MENU_IMAGE_MAX_BYTES / (1024 * 1024))} MB.`,
      400,
    );
  }

  const body = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffImageType(body);
  if (!sniffed) {
    throw new AppError(
      "VALIDATION_ERROR",
      "File is not a valid JPEG, PNG, WebP, or GIF image.",
      400,
    );
  }

  // If the item only has a legacy imageUrl and no MenuItemImage rows, migrate it first
  // so we don't lose the cover when appending.
  if (existingCount === 0 && item.imageUrl) {
    await menuRepository.addItemImage({
      itemId: menuItemId,
      storeId: user.storeId,
      url: item.imageUrl,
      objectKey: "",
    });
  }

  const ext = extensionForSniffed(sniffed);
  const contentType = contentTypeForSniffed(sniffed);
  const assetId = randomUUID();
  const key = menuItemImageKey({
    storeId: user.storeId,
    menuItemId,
    assetId,
    ext,
  });

  await putR2Object({
    key,
    body,
    contentType,
  });

  const imageUrl = publicUrlForObjectKey(key);
  const created = await menuRepository.addItemImage({
    itemId: menuItemId,
    storeId: user.storeId,
    url: imageUrl,
    objectKey: key,
  });
  if (!created) {
    throw new AppError("NOT_FOUND", "Menu item not found", 404);
  }

  const imageCount = await menuRepository.countImagesForItem(menuItemId);

  logger.info("menu.item.image.uploaded", {
    itemId: menuItemId,
    storeId: user.storeId,
    key,
    imageId: created.id,
  });

  return {
    imageUrl,
    key,
    imageId: created.id,
    imageCount,
  };
}
