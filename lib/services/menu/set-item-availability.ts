import { requireStoreManager } from "@/lib/auth/session";
import {
  mapMenuItemToDetail,
  menuRepository,
} from "@/lib/db/repositories/menu.repository";
import { setItemAvailabilitySchema } from "@/lib/domain/menu/validation";
import { revalidateStorefrontCache } from "@/lib/cache/storefront";
import { AppError } from "@/lib/utils/errors";

export async function setMenuItemAvailability(id: string, input: unknown) {
  const user = await requireStoreManager();
  const parsed = setItemAvailabilitySchema.parse(input);

  const item = await menuRepository.setItemAvailability(
    id,
    user.storeId,
    parsed.available,
  );

  if (!item) {
    throw new AppError("NOT_FOUND", "Menu item not found", 404);
  }

  revalidateStorefrontCache();
  return mapMenuItemToDetail(item);
}
