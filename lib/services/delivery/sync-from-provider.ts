import type { Prisma } from "@prisma/client";
import type { Delivery } from "@prisma/client";
import {
  deliveryRepository,
  type ProofOfDeliveryData,
} from "@/lib/db/repositories/delivery.repository";
import type { DeliveryProviderId, DeliveryStatus } from "@/lib/domain/delivery/types";
import { isTerminalStatus } from "@/lib/domain/delivery/status";
import { getDeliveryProviderById } from "@/lib/integrations/delivery/provider.registry";
import type { ProviderDelivery } from "@/lib/integrations/delivery/types";
import { logger } from "@/lib/utils/logger";

export function buildProofUpdate(
  proof?: ProviderDelivery["proofOfDelivery"],
): ProofOfDeliveryData | undefined {
  if (!proof) {
    return undefined;
  }

  const hasContent =
    Boolean(proof.signatureImageUrl) ||
    Boolean(proof.pictureImageUrl) ||
    Boolean(proof.signerName) ||
    Boolean(proof.pincodeValue);

  if (!hasContent) {
    return undefined;
  }

  return {
    signatureImageUrl: proof.signatureImageUrl,
    signerName: proof.signerName,
    pictureImageUrl: proof.pictureImageUrl,
    pincodeValue: proof.pincodeValue,
    fetchedAt: new Date().toISOString(),
  };
}

function getStoredPincode(delivery: Delivery): string | null {
  const stored = delivery.proofOfDelivery as ProofOfDeliveryData | null;
  return stored?.pincodeValue ?? null;
}

function shouldSyncFromProvider(delivery: Delivery): boolean {
  if (!delivery.providerDeliveryId) {
    return false;
  }

  if (delivery.podPincode && !getStoredPincode(delivery)) {
    return true;
  }

  if (!isTerminalStatus(delivery.status as DeliveryStatus)) {
    return true;
  }

  return delivery.status === "completed" && !delivery.proofOfDelivery;
}

/** Refresh delivery status and proof from Uber Direct. */
export async function syncDeliveryFromProvider(delivery: Delivery): Promise<Delivery> {
  if (!shouldSyncFromProvider(delivery)) {
    return delivery;
  }

  try {
    const provider = getDeliveryProviderById(
      delivery.providerId as DeliveryProviderId,
    );
    const synced = await provider.getDelivery(delivery.providerDeliveryId!);
    const proofOfDelivery = buildProofUpdate(synced.proofOfDelivery);

    return deliveryRepository.update(delivery.id, delivery.storeId, {
      status: synced.status,
      feeCents: synced.feeCents,
      currency: synced.currency,
      trackingUrl: synced.trackingUrl,
      liveMode: synced.liveMode,
      providerOrderId: synced.providerOrderId,
      ...(proofOfDelivery ? { proofOfDelivery } : {}),
      providerPayload: synced.raw as Prisma.InputJsonValue,
    });
  } catch (error) {
    logger.error("delivery.sync.failed", {
      deliveryId: delivery.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return delivery;
  }
}
