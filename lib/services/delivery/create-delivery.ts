import type { Prisma } from "@prisma/client";
import { requireSessionContext } from "@/lib/auth/session";
import { deliveryRepository } from "@/lib/db/repositories/delivery.repository";
import { validateScheduledPickupAt } from "@/lib/domain/delivery/schedule";
import { createDeliverySchema } from "@/lib/domain/delivery/validation";
import {
  formatStoreProfileAddress,
  storeProfileToAddress,
} from "@/lib/domain/store/format";
import { getDeliveryProviderForStore } from "@/lib/integrations/delivery/provider.registry";
import { isUberLiveMode } from "@/lib/config/environment";
import type { ProviderDelivery } from "@/lib/integrations/delivery/types";
import { geocodeAddress } from "@/lib/services/geocoding/geocode-address";
import { AppError, isAppError } from "@/lib/utils/errors";
import { generateDeliveryExternalId } from "@/lib/utils/id";
import { logger } from "@/lib/utils/logger";
import { normalizeCanadianPhone } from "@/lib/utils/phone";

export type CreateDeliveryResult = {
  id: string;
  externalId: string;
};

export async function createDelivery(input: unknown): Promise<CreateDeliveryResult> {
  const { store } = await requireSessionContext();
  const parsed = createDeliverySchema.parse(input);

  if (parsed.scheduledPickupAt) {
    const scheduleError = validateScheduledPickupAt(parsed.scheduledPickupAt);
    if (scheduleError) {
      throw new AppError("VALIDATION_ERROR", scheduleError, 400);
    }
  }

  const dropoffPhone = normalizeCanadianPhone(parsed.dropoffPhone);
  if (!dropoffPhone) {
    throw new AppError("VALIDATION_ERROR", "Enter a valid Canadian phone number", 400);
  }

  const geocoded = await geocodeAddress({
    query: parsed.dropoffAddress,
    storeId: store.id,
  });

  const provider = getDeliveryProviderForStore(store);
  const pickupAddress = storeProfileToAddress(store);
  const pickupFormatted = formatStoreProfileAddress(store);
  const liveMode = isUberLiveMode();
  const externalId = generateDeliveryExternalId();

  let quoteId = parsed.quoteId;
  let providerDelivery: ProviderDelivery;

  async function dispatchWithQuote(activeQuoteId: string): Promise<ProviderDelivery> {
    return provider.createDelivery({
      quoteId: activeQuoteId,
      externalId,
      pickup: {
        name: store.name,
        phone: store.phone,
        address: pickupAddress,
      },
      dropoff: {
        name: parsed.dropoffName,
        phone: parsed.dropoffPhone,
        address: geocoded.address,
      },
      pickupReadyAt: parsed.scheduledPickupAt,
      proofOfDelivery: parsed.proofOfDelivery,
      liveMode,
    });
  }

  try {
    providerDelivery = await dispatchWithQuote(quoteId);
  } catch (error) {
    if (isAppError(error) && error.code === "QUOTE_EXPIRED") {
      logger.info("delivery.quote.requote", { storeId: store.id, externalId });
      const freshQuote = await provider.createQuote({
        pickup: pickupAddress,
        dropoff: geocoded.address,
        pickupReadyAt: parsed.scheduledPickupAt,
      });
      quoteId = freshQuote.id;
      providerDelivery = await dispatchWithQuote(quoteId);
    } else {
      throw error;
    }
  }

  const delivery = await deliveryRepository.create({
    externalId,
    storeId: store.id,
    quoteId,
    pickupName: store.name,
    pickupPhone: store.phone,
    pickupAddress: pickupFormatted,
    pickupLat: store.latitude,
    pickupLng: store.longitude,
    dropoffName: parsed.dropoffName,
    dropoffPhone,
    dropoffAddress: geocoded.address.formatted,
    dropoffLat: geocoded.address.latitude,
    dropoffLng: geocoded.address.longitude,
    feeCents: providerDelivery.feeCents,
    currency: providerDelivery.currency,
    status: providerDelivery.status,
    trackingUrl: providerDelivery.trackingUrl,
    pickupReadyAt: parsed.scheduledPickupAt,
    scheduledFor: parsed.scheduledPickupAt,
    podSignature: parsed.proofOfDelivery.signature,
    podPicture: parsed.proofOfDelivery.picture,
    podPincode: parsed.proofOfDelivery.pincode,
    liveMode: providerDelivery.liveMode,
    providerDeliveryId: providerDelivery.providerDeliveryId,
    providerOrderId: providerDelivery.providerOrderId,
    providerPayload: providerDelivery.raw as Prisma.InputJsonValue,
  });

  logger.info("delivery.created", {
    deliveryId: delivery.id,
    storeId: store.id,
    externalId: delivery.externalId,
    liveMode: delivery.liveMode,
  });

  return { id: delivery.id, externalId: delivery.externalId };
}
