import { geocodeSuggestRequestSchema } from "@/lib/domain/address/validation";
import { storeRepository } from "@/lib/db/repositories/store.repository";
import { suggestCanadianAddresses } from "@/lib/integrations/geocoding/mapbox/client";
import type { AddressSuggestion } from "@/lib/integrations/geocoding/types";
import { AppError } from "@/lib/utils/errors";

export type SuggestAddressesInput = {
  query: string;
  storeId: string;
};

export async function suggestAddresses(
  input: SuggestAddressesInput,
): Promise<AddressSuggestion[]> {
  const parsed = geocodeSuggestRequestSchema.parse({ query: input.query });
  const store = await storeRepository.findById(input.storeId);

  if (!store) {
    throw new AppError("NOT_FOUND", "Store not found", 404);
  }

  return suggestCanadianAddresses(parsed.query, {
    proximity: {
      latitude: store.latitude,
      longitude: store.longitude,
    },
  });
}
