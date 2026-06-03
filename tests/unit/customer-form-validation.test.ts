import { describe, expect, it } from "vitest";
import { validateCustomerFormFields } from "@/lib/domain/customer/form-validation";

describe("validateCustomerFormFields", () => {
  it("requires name, phone, and verified address", () => {
    const errors = validateCustomerFormFields({
      name: "",
      phone: "123",
      addressVerified: false,
      geocodeError: null,
    });

    expect(errors.name).toMatch(/name/i);
    expect(errors.phone).toMatch(/phone/i);
    expect(errors.address).toBeTruthy();
  });

  it("passes with valid input", () => {
    const errors = validateCustomerFormFields({
      name: "Jane Doe",
      phone: "5195550100",
      addressVerified: true,
      geocodeError: null,
    });

    expect(errors).toEqual({});
  });
});
