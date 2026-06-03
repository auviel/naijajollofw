import { requireStoreManager } from "@/lib/auth/session";
import { deliveryRepository } from "@/lib/db/repositories/delivery.repository";
import { mapDeliveryToDetail } from "@/lib/domain/delivery/detail";
import type { DeliveryDetail } from "@/lib/domain/delivery/types";
import { isCancellable } from "@/lib/domain/delivery/status";
import type { DeliveryProviderId } from "@/lib/domain/delivery/types";
import { cancelDeliverySchema } from "@/lib/domain/delivery/validation";
import { getDeliveryProviderById } from "@/lib/integrations/delivery/provider.registry";
import { AppError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

export async function cancelDelivery(
  id: string,
  input: unknown,
): Promise<DeliveryDetail> {
  const user = await requireStoreManager();
  const parsed = cancelDeliverySchema.parse(input);

  const delivery = await deliveryRepository.findByIdAndStoreId(id, user.storeId);
  if (!delivery) {
    throw new AppError("NOT_FOUND", "Delivery not found", 404);
  }

  const status = delivery.status;
  if (!isCancellable(status)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "This delivery can no longer be cancelled.",
      400,
    );
  }

  if (!delivery.providerDeliveryId) {
    throw new AppError(
      "PROVIDER_ERROR",
      "Delivery is missing a provider reference and cannot be cancelled.",
      400,
    );
  }

  const provider = getDeliveryProviderById(delivery.providerId as DeliveryProviderId);

  await provider.cancelDelivery(delivery.providerDeliveryId, {
    reason: parsed.reason,
    details: parsed.details,
    cancellingParty: "MERCHANT",
  });

  const updated = await deliveryRepository.update(id, user.storeId, {
    status: "cancelled",
    cancelledAt: new Date(),
    cancelReason:
      parsed.reason === "OTHER" && parsed.details
        ? `${parsed.reason}: ${parsed.details}`
        : parsed.reason,
    cancelledBy: user.id,
  });

  logger.info("delivery.cancelled", {
    deliveryId: id,
    storeId: user.storeId,
    reason: parsed.reason,
  });

  return mapDeliveryToDetail(updated);
}
