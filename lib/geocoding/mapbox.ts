/** Re-export Mapbox geocoding for service-layer imports. */
export {
  geocodeCanadianAddress,
  suggestCanadianAddresses,
  type GeocodeOptions,
} from "@/lib/integrations/geocoding/mapbox/client";

export { MIN_GEOCODE_RELEVANCE } from "@/lib/domain/address/geocode";
