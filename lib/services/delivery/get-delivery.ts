import { requireStoreManager } from "@/lib/auth/session";
import { deliveryRepository } from "@/lib/db/repositories/delivery.repository";
import { mapDeliveryToDetail } from "@/lib/domain/delivery/detail";
import type { DeliveryDetail } from "@/lib/domain/delivery/types";
import { syncDeliveryFromProvider } from "@/lib/services/delivery/sync-from-provider";
import { AppError } from "@/lib/utils/errors";

export async function getDelivery(id: string): Promise<DeliveryDetail> {
  const user = await requireStoreManager();

  const existing = await deliveryRepository.findByIdAndStoreId(id, user.storeId);
  if (!existing) {
    throw new AppError("NOT_FOUND", "Delivery not found", 404);
  }

  const delivery = await syncDeliveryFromProvider(existing);
  return mapDeliveryToDetail(delivery);
}
