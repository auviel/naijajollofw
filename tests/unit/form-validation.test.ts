import { describe, expect, it } from "vitest";
import {
  validateDeliveryFormFields,
  validateLoginFields,
} from "@/lib/domain/delivery/form-validation";

describe("validateDeliveryFormFields", () => {
  it("returns no errors for valid input", () => {
    const errors = validateDeliveryFormFields({
      dropoffName: "Jane Doe",
      dropoffPhone: "5195550100",
      addressVerified: true,
      geocodeError: null,
    });

    expect(errors).toEqual({});
  });

  it("returns plain-language field errors", () => {
    const errors = validateDeliveryFormFields({
      dropoffName: "",
      dropoffPhone: "123",
      addressVerified: false,
      geocodeError: "No matching address found.",
    });

    expect(errors.dropoffName).toMatch(/customer name/i);
    expect(errors.dropoffPhone).toMatch(/Canadian phone/i);
    expect(errors.dropoffAddress).toBe("No matching address found.");
  });
});

describe("validateLoginFields", () => {
  it("validates email and password", () => {
    expect(validateLoginFields({ email: "", password: "" })).toEqual({
      email: "Enter your email address.",
      password: "Enter your password.",
    });
  });
});
