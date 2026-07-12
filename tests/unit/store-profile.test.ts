import { describe, expect, it } from "vitest";
import { validateStoreProfileFields } from "@/lib/domain/store/form-validation";
import { updateStoreProfileSchema } from "@/lib/domain/store/validation";
import type { GeocodedAddress } from "@/lib/integrations/geocoding/types";

const geocodedAddress: GeocodedAddress = {
  address: {
    line1: "280 Lester St",
    city: "Waterloo",
    province: "ON",
    postalCode: "N2L 0G2",
    country: "CA",
    latitude: 43.478885,
    longitude: -80.524498,
    formatted: "280 Lester St, Waterloo, Ontario N2L 0G2, Canada",
  },
  relevance: 0.95,
  confidence: "high",
  preview: "280 Lester St, Waterloo, Ontario N2L 0G2, Canada",
};

describe("updateStoreProfileSchema", () => {
  it("accepts valid store profile updates", () => {
    const parsed = updateStoreProfileSchema.parse({
      name: "Demo Market — Lester St",
      phone: "5195550199",
      email: "hello@naijajollofw.ca",
      addressLine2: "#102",
      addressQuery: "280 Lester St, Waterloo, ON N2L 0G2",
    });

    expect(parsed.name).toBe("Demo Market — Lester St");
    expect(parsed.email).toBe("hello@naijajollofw.ca");
    expect(parsed.addressLine2).toBe("#102");
  });

  it("rejects invalid phone numbers", () => {
    expect(() =>
      updateStoreProfileSchema.parse({
        name: "Demo Market",
        phone: "123",
        email: "hello@naijajollofw.ca",
        addressQuery: "280 Lester St, Waterloo, ON N2L 0G2",
      }),
    ).toThrow();
  });

  it("rejects invalid emails", () => {
    expect(() =>
      updateStoreProfileSchema.parse({
        name: "Demo Market",
        phone: "5195550199",
        email: "not-an-email",
        addressQuery: "280 Lester St, Waterloo, ON N2L 0G2",
      }),
    ).toThrow();
  });
});

describe("validateStoreProfileFields", () => {
  it("returns no errors for a valid profile", () => {
    const errors = validateStoreProfileFields({
      name: "Demo Market",
      phone: "5195550199",
      email: "hello@naijajollofw.ca",
      geocoded: geocodedAddress,
      geocodeError: null,
    });

    expect(errors).toEqual({});
  });

  it("requires a verified address", () => {
    const errors = validateStoreProfileFields({
      name: "Demo Market",
      phone: "5195550199",
      email: "hello@naijajollofw.ca",
      geocoded: null,
      geocodeError: "No matching address found.",
    });

    expect(errors.addressQuery).toBe("No matching address found.");
  });
});
