import type { Prisma } from "@prisma/client";
import { requireSessionContext } from "@/lib/auth/session";
import { isProviderLiveMode } from "@/lib/config/environment";
import { deliveryRepository } from "@/lib/db/repositories/delivery.repository";
import { validateScheduledPickupAt } from "@/lib/domain/delivery/schedule";
import type { DeliveryProviderId } from "@/lib/domain/delivery/types";
import { createDeliverySchema } from "@/lib/domain/delivery/validation";
import {
  formatStoreProfileAddress,
  storeProfileToAddress,
} from "@/lib/domain/store/format";
import { getDoorDashExternalStoreId } from "@/lib/domain/store/delivery-settings";
import { getDeliveryProviderById } from "@/lib/integrations/delivery/provider.registry";
import { resolveUberPincode } from "@/lib/integrations/delivery/uber/mappers";
import type { ProviderDelivery, ProviderQuoteRequest } from "@/lib/integrations/delivery/types";
import { upsertCustomerFromDropoff } from "@/lib/services/customer/upsert-from-dropoff";
import { buildProofUpdate } from "@/lib/services/delivery/sync-from-provider";
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
  const providerId = parsed.providerId as DeliveryProviderId;

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

  const provider = getDeliveryProviderById(providerId);
  const pickupAddress = storeProfileToAddress(store);
  const pickupFormatted = formatStoreProfileAddress(store);
  const liveMode = isProviderLiveMode(providerId);
  let quoteId = parsed.quoteId;
  let externalId =
    providerId === "doordash_drive" ? parsed.quoteId : generateDeliveryExternalId();
  let providerDelivery: ProviderDelivery;

  const quoteRequest: ProviderQuoteRequest = {
    pickup: pickupAddress,
    dropoff: geocoded.address,
    pickupReadyAt: parsed.scheduledPickupAt,
    pickupContact: {
      name: store.name,
      phone: store.phone,
    },
    dropoffContact: {
      name: parsed.dropoffName.trim(),
      phone: dropoffPhone,
    },
    externalStoreId: getDoorDashExternalStoreId(store),
  };

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
        name: parsed.dropoffName.trim(),
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
      logger.info("delivery.quote.requote", {
        storeId: store.id,
        externalId,
        providerId,
      });
      const freshQuote = await provider.createQuote(quoteRequest);
      quoteId = freshQuote.id;
      if (providerId === "doordash_drive") {
        externalId = quoteId;
      }
      providerDelivery = await dispatchWithQuote(quoteId);
    } else {
      throw error;
    }
  }

  const pincodeValue = resolveUberPincode(
    undefined,
    providerDelivery.proofOfDelivery?.pincodeValue,
    providerDelivery.liveMode,
  );
  const proofOfDelivery = buildProofUpdate(
    providerDelivery.proofOfDelivery || pincodeValue
      ? {
          ...providerDelivery.proofOfDelivery,
          pincodeValue,
        }
      : undefined,
  );

  const customerId = await upsertCustomerFromDropoff({
    storeId: store.id,
    name: parsed.dropoffName.trim(),
    phoneE164: dropoffPhone,
    address: geocoded.address,
  });

  const delivery = await deliveryRepository.create({
    externalId: providerId === "doordash_drive" ? quoteId : externalId,
    storeId: store.id,
    customerId,
    providerId: provider.id,
    quoteId,
    pickupName: store.name,
    pickupPhone: store.phone,
    pickupAddress: pickupFormatted,
    pickupLat: store.latitude,
    pickupLng: store.longitude,
    dropoffName: parsed.dropoffName.trim(),
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
    ...(proofOfDelivery ? { proofOfDelivery } : {}),
  });

  logger.info("delivery.created", {
    deliveryId: delivery.id,
    storeId: store.id,
    externalId: delivery.externalId,
    providerId: delivery.providerId,
    liveMode: delivery.liveMode,
  });

  return { id: delivery.id, externalId: delivery.externalId };
}
