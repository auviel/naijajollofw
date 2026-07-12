import { requireStoreManager } from "@/lib/auth/session";
import { storeRepository } from "@/lib/db/repositories/store.repository";
import { updatePrepMinutesSchema } from "@/lib/domain/store/prep-validation";
import { AppError } from "@/lib/utils/errors";

export async function updateStorePrepMinutes(input: unknown): Promise<{
  prepMinutes: number;
}> {
  const user = await requireStoreManager();
  const parsed = updatePrepMinutesSchema.parse(input);

  const store = await storeRepository.findById(user.storeId);
  if (!store) {
    throw new AppError("NOT_FOUND", "Store not found", 404);
  }

  const updated = await storeRepository.updatePrepMinutes(
    user.storeId,
    parsed.prepMinutes,
  );

  return { prepMinutes: updated.prepMinutes };
}

export async function getStorePrepMinutes(): Promise<{
  prepMinutes: number;
  storeName: string;
}> {
  const user = await requireStoreManager();
  const store = await storeRepository.findById(user.storeId);
  if (!store) {
    throw new AppError("NOT_FOUND", "Store not found", 404);
  }
  return { prepMinutes: store.prepMinutes, storeName: store.name };
}
