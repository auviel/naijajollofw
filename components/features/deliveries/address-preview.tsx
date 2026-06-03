import type { GeocodedAddress } from "@/lib/integrations/geocoding/types";

export function canRequestQuote(result: GeocodedAddress | null): boolean {
  return result !== null && result.confidence !== "low";
}
