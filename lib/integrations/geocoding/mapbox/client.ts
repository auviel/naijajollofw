import { AppError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";
import type { AddressSuggestion, GeocodedAddress } from "../types";
import { getMapboxAccessToken } from "./config";
import { mapMapboxFeatureToGeocodedAddress } from "./parser";
import type { MapboxGeocodeResponse } from "../types";

export type GeocodeOptions = {
  proximity?: {
    latitude: number;
    longitude: number;
  };
  limit?: number;
};

function mapGeocodeError(error: unknown): never {
  if (error instanceof AppError) {
    throw error;
  }

  if (error instanceof Error) {
    switch (error.message) {
      case "GEOCODE_LOW_CONFIDENCE":
        throw new AppError(
          "INVALID_ADDRESS",
          "Address could not be verified with enough confidence. Try a more complete Canadian address.",
          400,
        );
      case "GEOCODE_NOT_CANADA":
        throw new AppError(
          "INVALID_ADDRESS",
          "Only Canadian delivery addresses are supported.",
          400,
        );
      case "GEOCODE_INCOMPLETE":
        throw new AppError(
          "INVALID_ADDRESS",
          "Address is missing city or province. Please enter a complete address.",
          400,
        );
      case "GEOCODE_NO_RESULTS":
        throw new AppError(
          "INVALID_ADDRESS",
          "No matching address found. Check the address and try again.",
          400,
        );
    }
  }

  logger.error("geocode.unhandled", { error: String(error) });
  throw new AppError(
    "INTERNAL_ERROR",
    "Unable to geocode address right now. Please try again.",
    500,
  );
}

function buildGeocodeUrl(query: string, params: URLSearchParams): string {
  const encodedQuery = encodeURIComponent(query.trim());
  return `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?${params.toString()}`;
}

async function fetchMapboxFeatures(
  query: string,
  params: URLSearchParams,
): Promise<MapboxGeocodeResponse> {
  const token = getMapboxAccessToken();
  params.set("access_token", token);

  const response = await fetch(buildGeocodeUrl(query, params), {
    method: "GET",
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  const body = (await response.json().catch(() => ({}))) as
    | MapboxGeocodeResponse
    | { message?: string };

  if (!response.ok) {
    logger.error("mapbox.geocode.failed", {
      status: response.status,
      message: (body as { message?: string }).message,
    });
    throw new AppError(
      "INTERNAL_ERROR",
      "Geocoding service returned an error. Please try again.",
      502,
    );
  }

  return body as MapboxGeocodeResponse;
}

/** Return Canadian address suggestions for autocomplete. */
export async function suggestCanadianAddresses(
  query: string,
  options?: GeocodeOptions,
): Promise<AddressSuggestion[]> {
  try {
    const params = new URLSearchParams({
      country: "CA",
      limit: String(options?.limit ?? 5),
      types: "address,postcode,place",
      autocomplete: "true",
    });

    if (options?.proximity) {
      params.set(
        "proximity",
        `${options.proximity.longitude},${options.proximity.latitude}`,
      );
    }

    const body = await fetchMapboxFeatures(query, params);
    return (body.features ?? []).map((feature) => ({
      id: feature.id,
      label: feature.place_name,
    }));
  } catch (error) {
    mapGeocodeError(error);
  }
}

/** Geocode a single-line Canadian address using Mapbox. */
export async function geocodeCanadianAddress(
  query: string,
  options?: GeocodeOptions,
): Promise<GeocodedAddress> {
  try {
    const params = new URLSearchParams({
      country: "CA",
      limit: String(options?.limit ?? 1),
      types: "address,postcode,place",
      autocomplete: "false",
    });

    if (options?.proximity) {
      params.set(
        "proximity",
        `${options.proximity.longitude},${options.proximity.latitude}`,
      );
    }

    const body = await fetchMapboxFeatures(query, params);
    const feature = body.features?.[0];
    if (!feature) {
      throw new Error("GEOCODE_NO_RESULTS");
    }

    return mapMapboxFeatureToGeocodedAddress(feature);
  } catch (error) {
    mapGeocodeError(error);
  }
}
