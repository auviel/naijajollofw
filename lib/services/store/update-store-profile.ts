import { updateStoreProfileSchema } from "@/lib/domain/store/validation";
import { isDoorDashEnabled } from "@/lib/config/environment";
import {
  mapStoreToProfile,
  storeRepository,
} from "@/lib/db/repositories/store.repository";
import { geocodeCanadianAddress } from "@/lib/integrations/geocoding/mapbox/client";
import type { StoreProfile } from "@/lib/domain/store/types";
import { AppError } from "@/lib/utils/errors";
import { normalizeCanadianPhone } from "@/lib/utils/phone";

export type UpdateStoreProfileServiceInput = {
  storeId: string;
  body: unknown;
};

function buildGeocodeQuery(addressQuery: string, addressLine2?: string): string {
  const query = addressQuery.trim();
  const line2 = addressLine2?.trim();

  if (!line2) {
    return query;
  }

  const commaIndex = query.indexOf(",");
  if (commaIndex === -1) {
    return `${query}, ${line2}`;
  }

  return `${query.slice(0, commaIndex)}, ${line2}${query.slice(commaIndex)}`;
}

export async function updateStoreProfile(
  input: UpdateStoreProfileServiceInput,
): Promise<StoreProfile> {
  const parsed = updateStoreProfileSchema.parse(input.body);
  const store = await storeRepository.findById(input.storeId);

  if (!store) {
    throw new AppError("NOT_FOUND", "Store not found", 404);
  }

  const geocodeQuery = buildGeocodeQuery(parsed.addressQuery, parsed.addressLine2);
  const geocoded = await geocodeCanadianAddress(geocodeQuery, {
    proximity: {
      latitude: store.latitude,
      longitude: store.longitude,
    },
  });

  const phone = normalizeCanadianPhone(parsed.phone);
  if (!phone) {
    throw new AppError("VALIDATION_ERROR", "Enter a valid Canadian phone number", 400);
  }

  const updated = await storeRepository.update(input.storeId, {
    name: parsed.name.trim(),
    phone,
    addressLine1: geocoded.address.line1,
    addressLine2: parsed.addressLine2?.trim() || null,
    city: geocoded.address.city,
    province: geocoded.address.province,
    postalCode: geocoded.address.postalCode,
    country: geocoded.address.country,
    latitude: geocoded.address.latitude,
    longitude: geocoded.address.longitude,
    ...(parsed.enabledUberDirect !== undefined
      ? { enabledUberDirect: parsed.enabledUberDirect }
      : {}),
    ...(parsed.enabledDoorDashDrive !== undefined
      ? { enabledDoorDashDrive: isDoorDashEnabled() ? parsed.enabledDoorDashDrive : false }
      : {}),
  });

  return mapStoreToProfile(updated);
}
