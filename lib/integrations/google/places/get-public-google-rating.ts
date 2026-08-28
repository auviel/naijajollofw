import { unstable_cache } from "next/cache";
import {
  GOOGLE_MAPS_REVIEWS_URL,
  getGooglePlaceId,
  getGooglePlacesApiKey,
  getGoogleRatingOverride,
} from "@/lib/integrations/google/places/config";
import type { PublicGoogleRating } from "@/lib/integrations/google/places/types";

const SEARCH_QUERY = "Naija Jollof Waterloo 280 Lester Street Waterloo ON";

type PlacesSearchResponse = {
  places?: {
    id?: string;
    rating?: number;
    userRatingCount?: number;
    googleMapsUri?: string;
  }[];
};

type PlaceDetailsResponse = {
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
};

async function fetchPlaceDetails(
  placeId: string,
  apiKey: string,
): Promise<PlaceDetailsResponse | null> {
  const resource = placeId.startsWith("places/") ? placeId : `places/${placeId}`;
  const response = await fetch(`https://places.googleapis.com/v1/${resource}`, {
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "rating,userRatingCount,googleMapsUri",
    },
    next: { revalidate: 86_400 },
  });

  if (!response.ok) return null;
  return (await response.json()) as PlaceDetailsResponse;
}

async function searchPlaceRating(apiKey: string): Promise<PlaceDetailsResponse | null> {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.rating,places.userRatingCount,places.googleMapsUri",
    },
    body: JSON.stringify({ textQuery: SEARCH_QUERY }),
    next: { revalidate: 86_400 },
  });

  if (!response.ok) return null;

  const data = (await response.json()) as PlacesSearchResponse;
  const place = data.places?.[0];
  if (!place?.rating || place.userRatingCount == null) return null;

  return {
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    googleMapsUri: place.googleMapsUri,
  };
}

async function loadGoogleRating(): Promise<PublicGoogleRating | null> {
  const override = getGoogleRatingOverride();
  if (override) {
    return {
      ...override,
      reviewsUrl: GOOGLE_MAPS_REVIEWS_URL,
      source: "manual",
    };
  }

  const apiKey = getGooglePlacesApiKey();
  if (!apiKey) return null;

  const placeId = getGooglePlaceId();
  const details = placeId
    ? await fetchPlaceDetails(placeId, apiKey)
    : await searchPlaceRating(apiKey);

  if (!details?.rating || details.userRatingCount == null) return null;

  return {
    rating: details.rating,
    reviewCount: details.userRatingCount,
    reviewsUrl: details.googleMapsUri?.trim() || GOOGLE_MAPS_REVIEWS_URL,
    source: "places_api",
  };
}

const getCachedGoogleRating = unstable_cache(
  loadGoogleRating,
  ["public-google-rating-v1"],
  { revalidate: 86_400 },
);

export async function getPublicGoogleRating(): Promise<PublicGoogleRating | null> {
  try {
    return await getCachedGoogleRating();
  } catch {
    return null;
  }
}
