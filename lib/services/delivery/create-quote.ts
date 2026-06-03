import { requireSessionContext } from "@/lib/auth/session";
import { sortQuotesForDisplay } from "@/lib/domain/delivery/compare-quotes";
import { validateScheduledPickupAt } from "@/lib/domain/delivery/schedule";
import type {
  DeliveryQuote,
  DeliveryQuoteFailure,
  DeliveryProviderId,
} from "@/lib/domain/delivery/types";
import { createQuoteSchema } from "@/lib/domain/delivery/validation";
import { storeProfileToAddress } from "@/lib/domain/store/format";
import type { StoreProfile } from "@/lib/domain/store/types";
import { getDoorDashExternalStoreId } from "@/lib/domain/store/delivery-settings";
import { storeRepository } from "@/lib/db/repositories/store.repository";
import { getEnabledDeliveryProvidersForStore } from "@/lib/integrations/delivery/provider.registry";
import type { ProviderQuoteRequest } from "@/lib/integrations/delivery/types";
import type { GeocodedAddress } from "@/lib/integrations/geocoding/types";
import { geocodeAddress } from "@/lib/services/geocoding/geocode-address";
import { AppError, isAppError } from "@/lib/utils/errors";
import { getDoorDashUserMessage } from "@/lib/integrations/delivery/doordash/user-errors";
import { normalizeCanadianPhone } from "@/lib/utils/phone";

export type CreateQuoteResult = {
  quotes: DeliveryQuote[];
  failures: DeliveryQuoteFailure[];
  geocoded: GeocodedAddress;
};

function mapProviderQuote(
  providerId: DeliveryProviderId,
  quote: Omit<DeliveryQuote, "providerId">,
): DeliveryQuote {
  return { providerId, ...quote };
}

function buildQuoteRequest(
  store: StoreProfile,
  geocoded: GeocodedAddress,
  scheduledPickupAt: Date | undefined,
  dropoffName: string,
  dropoffPhone: string,
): ProviderQuoteRequest {
  return {
    pickup: storeProfileToAddress(store),
    dropoff: geocoded.address,
    pickupReadyAt: scheduledPickupAt,
    pickupContact: {
      name: store.name,
      phone: store.phone,
    },
    dropoffContact: {
      name: dropoffName,
      phone: dropoffPhone,
    },
    externalStoreId: getDoorDashExternalStoreId(store),
  };
}

export async function createQuoteForStore(
  storeId: string,
  input: unknown,
): Promise<CreateQuoteResult> {
  const store = await storeRepository.getProfileById(storeId);
  if (!store) {
    throw new AppError("NOT_FOUND", "Store not found", 404);
  }

  return createQuoteWithStore(store, input);
}

export async function createQuote(input: unknown): Promise<CreateQuoteResult> {
  const { store } = await requireSessionContext();
  return createQuoteWithStore(store, input);
}

async function createQuoteWithStore(
  store: StoreProfile,
  input: unknown,
): Promise<CreateQuoteResult> {
  const parsed = createQuoteSchema.parse(input);

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

  const providers = getEnabledDeliveryProvidersForStore(store);
  if (providers.length === 0) {
    throw new AppError(
      "PROVIDER_ERROR",
      "No delivery providers are configured. Add Uber or DoorDash credentials.",
      500,
    );
  }

  const quoteRequest = buildQuoteRequest(
    store,
    geocoded,
    parsed.scheduledPickupAt,
    parsed.dropoffName.trim(),
    dropoffPhone,
  );

  const results = await Promise.allSettled(
    providers.map(async (provider) => {
      const quote = await provider.createQuote(quoteRequest);
      return mapProviderQuote(provider.id, quote);
    }),
  );

  const quotes: DeliveryQuote[] = [];
  const failures: DeliveryQuoteFailure[] = [];

  results.forEach((result, index) => {
    const provider = providers[index]!;
    if (result.status === "fulfilled") {
      quotes.push(result.value);
      return;
    }

    failures.push({
      providerId: provider.id,
      error:
        provider.id === "doordash_drive" && isAppError(result.reason)
          ? getDoorDashUserMessage(result.reason)
          : isAppError(result.reason)
            ? result.reason.message
            : result.reason instanceof Error
              ? result.reason.message
              : "Unable to get a quote",
    });
  });

  if (quotes.length === 0) {
    const message =
      failures.map((failure) => failure.error).join(" ") ||
      "No delivery quotes are available for this address.";
    throw new AppError("PROVIDER_ERROR", message, 400);
  }

  return {
    quotes: sortQuotesForDisplay(quotes),
    failures,
    geocoded,
  };
}
