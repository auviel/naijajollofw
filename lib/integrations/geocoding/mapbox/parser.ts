import type { NormalizedAddress } from "@/lib/domain/address/types";
import {
  getGeocodeConfidence,
  isGeocodeConfidenceAcceptable,
} from "@/lib/domain/address/geocode";
import type { GeocodedAddress, MapboxContextItem, MapboxFeature } from "../types";

function contextValue(
  feature: MapboxFeature,
  prefix: string,
): MapboxContextItem | undefined {
  return feature.context?.find((item) => item.id.startsWith(`${prefix}.`));
}

function parseProvince(feature: MapboxFeature): string {
  const region = contextValue(feature, "region");
  if (!region) {
    return "";
  }

  if (region.short_code?.startsWith("CA-")) {
    return region.short_code.replace("CA-", "");
  }

  return region.text;
}

function parsePostalCode(feature: MapboxFeature): string {
  return contextValue(feature, "postcode")?.text ?? "";
}

function parseCity(feature: MapboxFeature): string {
  return (
    contextValue(feature, "place")?.text ??
    contextValue(feature, "locality")?.text ??
    ""
  );
}

function parseLine1(feature: MapboxFeature): string {
  if (feature.address) {
    return `${feature.address} ${feature.text}`.trim();
  }

  return feature.text.trim();
}

function parseCountry(feature: MapboxFeature): string {
  const shortCode = contextValue(feature, "country")?.short_code;
  if (shortCode) {
    return shortCode.toUpperCase();
  }

  return "CA";
}

/** Parse a Mapbox Geocoding API feature into a normalized Canadian address. */
export function parseMapboxFeature(feature: MapboxFeature): NormalizedAddress {
  const [longitude, latitude] = feature.center;
  const country = parseCountry(feature);

  return {
    line1: parseLine1(feature),
    city: parseCity(feature),
    province: parseProvince(feature),
    postalCode: parsePostalCode(feature),
    country,
    latitude,
    longitude,
    formatted: feature.place_name,
  };
}

export function mapMapboxFeatureToGeocodedAddress(
  feature: MapboxFeature,
): GeocodedAddress {
  const relevance = feature.relevance;
  const confidence = getGeocodeConfidence(relevance);

  if (!isGeocodeConfidenceAcceptable(relevance)) {
    throw new Error("GEOCODE_LOW_CONFIDENCE");
  }

  const address = parseMapboxFeature(feature);

  if (address.country !== "CA") {
    throw new Error("GEOCODE_NOT_CANADA");
  }

  if (!address.city || !address.province) {
    throw new Error("GEOCODE_INCOMPLETE");
  }

  return {
    address,
    relevance,
    confidence,
    preview: address.formatted,
  };
}
