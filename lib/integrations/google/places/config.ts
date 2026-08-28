/** Public Maps / reviews deep link (short URL). */
export const GOOGLE_MAPS_REVIEWS_URL =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_REVIEWS_URL?.trim() ||
  "https://maps.app.goo.gl/wG9369vQfH76S6BYA";

export function getGooglePlacesApiKey(): string | null {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  return key || null;
}

export function getGooglePlaceId(): string | null {
  const id = process.env.NEXT_PUBLIC_GOOGLE_PLACE_ID?.trim();
  return id || null;
}

/** Optional manual override when Places API is not configured yet. */
export function getGoogleRatingOverride(): {
  rating: number;
  reviewCount: number;
} | null {
  const ratingRaw = process.env.GOOGLE_PLACE_RATING?.trim();
  const countRaw = process.env.GOOGLE_PLACE_REVIEW_COUNT?.trim();
  if (!ratingRaw || !countRaw) return null;

  const rating = Number.parseFloat(ratingRaw);
  const reviewCount = Number.parseInt(countRaw, 10);
  if (!Number.isFinite(rating) || rating <= 0 || rating > 5) return null;
  if (!Number.isFinite(reviewCount) || reviewCount < 0) return null;

  return { rating, reviewCount };
}

export function getGoogleSiteVerification(): string | null {
  const token = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  return token || null;
}
