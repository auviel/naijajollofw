import { describe, expect, it } from "vitest";
import {
  getGeocodeConfidence,
  isGeocodeConfidenceAcceptable,
  MIN_GEOCODE_RELEVANCE,
} from "@/lib/domain/address/geocode";
import {
  mapMapboxFeatureToGeocodedAddress,
  parseMapboxFeature,
} from "@/lib/integrations/geocoding/mapbox/parser";
import type { MapboxFeature } from "@/lib/integrations/geocoding/types";

const torontoFeature: MapboxFeature = {
  id: "address.123",
  type: "Feature",
  place_type: ["address"],
  relevance: 0.96,
  text: "Queen Street West",
  address: "123",
  place_name: "123 Queen Street West, Toronto, Ontario M5H 2M9, Canada",
  center: [-79.390984, 43.648809],
  context: [
    { id: "neighborhood.1", text: "Downtown" },
    { id: "postcode.2", text: "M5H 2M9" },
    { id: "place.3", text: "Toronto" },
    { id: "region.4", text: "Ontario", short_code: "CA-ON" },
    { id: "country.5", text: "Canada", short_code: "CA" },
  ],
};

describe("geocode confidence", () => {
  it("uses configured minimum relevance threshold", () => {
    expect(MIN_GEOCODE_RELEVANCE).toBe(0.7);
    expect(isGeocodeConfidenceAcceptable(0.69)).toBe(false);
    expect(isGeocodeConfidenceAcceptable(0.7)).toBe(true);
  });

  it("maps relevance to confidence bands", () => {
    expect(getGeocodeConfidence(0.95)).toBe("high");
    expect(getGeocodeConfidence(0.75)).toBe("medium");
    expect(getGeocodeConfidence(0.5)).toBe("low");
  });
});

describe("parseMapboxFeature", () => {
  it("parses Canadian Mapbox features into normalized addresses", () => {
    const address = parseMapboxFeature(torontoFeature);

    expect(address.line1).toBe("123 Queen Street West");
    expect(address.city).toBe("Toronto");
    expect(address.province).toBe("ON");
    expect(address.postalCode).toBe("M5H 2M9");
    expect(address.country).toBe("CA");
    expect(address.latitude).toBe(43.648809);
    expect(address.longitude).toBe(-79.390984);
  });

  it("normalizes lowercase Mapbox country codes", () => {
    const address = parseMapboxFeature({
      ...torontoFeature,
      context: [
        ...(torontoFeature.context ?? []).filter((item) => !item.id.startsWith("country.")),
        { id: "country.5", text: "Canada", short_code: "ca" },
      ],
    });

    expect(address.country).toBe("CA");
  });
});

describe("mapMapboxFeatureToGeocodedAddress", () => {
  it("returns preview data for acceptable matches", () => {
    const result = mapMapboxFeatureToGeocodedAddress(torontoFeature);

    expect(result.confidence).toBe("high");
    expect(result.preview).toContain("Toronto");
    expect(result.address.country).toBe("CA");
  });

  it("accepts lowercase Mapbox country codes", () => {
    const result = mapMapboxFeatureToGeocodedAddress({
      ...torontoFeature,
      context: [
        ...(torontoFeature.context ?? []).filter((item) => !item.id.startsWith("country.")),
        { id: "country.5", text: "Canada", short_code: "ca" },
      ],
    });

    expect(result.address.country).toBe("CA");
  });

  it("rejects low-confidence matches", () => {
    expect(() =>
      mapMapboxFeatureToGeocodedAddress({ ...torontoFeature, relevance: 0.4 }),
    ).toThrow("GEOCODE_LOW_CONFIDENCE");
  });

  it("rejects non-Canadian matches", () => {
    expect(() =>
      mapMapboxFeatureToGeocodedAddress({
        ...torontoFeature,
        context: [
          { id: "place.3", text: "New York" },
          { id: "region.4", text: "New York", short_code: "US-NY" },
          { id: "country.5", text: "United States", short_code: "US" },
        ],
      }),
    ).toThrow("GEOCODE_NOT_CANADA");
  });
});
