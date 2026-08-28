import { describe, expect, it } from "vitest";
import {
  getGoogleRatingOverride,
  GOOGLE_MAPS_REVIEWS_URL,
} from "@/lib/integrations/google/places/config";
import { buildRestaurantJsonLd } from "@/lib/seo/json-ld";

describe("google places config", () => {
  it("exposes the public maps reviews URL", () => {
    expect(GOOGLE_MAPS_REVIEWS_URL).toContain("maps");
  });

  it("parses manual rating override from env", () => {
    const prevRating = process.env.GOOGLE_PLACE_RATING;
    const prevCount = process.env.GOOGLE_PLACE_REVIEW_COUNT;
    process.env.GOOGLE_PLACE_RATING = "4.7";
    process.env.GOOGLE_PLACE_REVIEW_COUNT = "120";

    expect(getGoogleRatingOverride()).toEqual({
      rating: 4.7,
      reviewCount: 120,
    });

    if (prevRating === undefined) delete process.env.GOOGLE_PLACE_RATING;
    else process.env.GOOGLE_PLACE_RATING = prevRating;
    if (prevCount === undefined) delete process.env.GOOGLE_PLACE_REVIEW_COUNT;
    else process.env.GOOGLE_PLACE_REVIEW_COUNT = prevCount;
  });
});

describe("aggregate rating schema", () => {
  it("includes aggregateRating when google rating is provided", () => {
    const json = buildRestaurantJsonLd({
      store: {
        id: "s1",
        name: "Naija Jollof Waterloo",
        phone: "+15198851517",
        email: "hello@naijajollofw.ca",
        addressLine1: "280 Lester St",
        city: "Waterloo",
        province: "ON",
        postalCode: "N2L 3W5",
        country: "CA",
        latitude: 43.47,
        longitude: -80.53,
        enabledUberDirect: true,
        enabledDoorDashDrive: false,
      },
      schedule: { timezone: "America/Toronto", configured: false, days: [] },
      googleRating: {
        rating: 4.8,
        reviewCount: 175,
        reviewsUrl: GOOGLE_MAPS_REVIEWS_URL,
        source: "manual",
      },
    });

    expect(json.aggregateRating).toMatchObject({
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: 175,
    });
  });
});
