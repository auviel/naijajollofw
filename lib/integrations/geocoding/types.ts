import type { NormalizedAddress } from "@/lib/domain/address/types";
import type { GeocodeConfidence } from "@/lib/domain/address/geocode";

export type GeocodedAddress = {
  address: NormalizedAddress;
  relevance: number;
  confidence: GeocodeConfidence;
  preview: string;
};

export type AddressSuggestion = {
  id: string;
  label: string;
};

export type MapboxContextItem = {
  id: string;
  text: string;
  short_code?: string;
  wikidata?: string;
};

export type MapboxFeature = {
  id: string;
  type: string;
  place_type: string[];
  relevance: number;
  text: string;
  place_name: string;
  address?: string;
  center: [number, number];
  context?: MapboxContextItem[];
};

export type MapboxGeocodeResponse = {
  type: string;
  features: MapboxFeature[];
};
