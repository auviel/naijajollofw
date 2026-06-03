import { canRequestQuote } from "@/components/features/deliveries/address-preview";
import type { GeocodedAddress } from "@/lib/integrations/geocoding/types";
import { normalizeCanadianPhone } from "@/lib/utils/phone";

export type StoreProfileFormField =
  | "name"
  | "phone"
  | "addressLine2"
  | "addressQuery";

export type StoreProfileFormErrors = Partial<Record<StoreProfileFormField, string>>;

export function validateStoreProfileFields(input: {
  name: string;
  phone: string;
  geocoded: GeocodedAddress | null;
  geocodeError: string | null;
}): StoreProfileFormErrors {
  const errors: StoreProfileFormErrors = {};

  if (!input.name.trim()) {
    errors.name = "Enter your store name.";
  }

  if (!normalizeCanadianPhone(input.phone)) {
    errors.phone = "Enter a valid Canadian phone number (10 digits).";
  }

  if (!canRequestQuote(input.geocoded)) {
    errors.addressQuery =
      input.geocodeError ?? "Enter and verify a complete Canadian store address.";
  }

  return errors;
}
