import { describe, expect, it } from "vitest";
import { validateCustomerDetailFields } from "@/lib/domain/customer/form-validation";
import {
  validateDeliveryFormFields,
  validateLoginFields,
} from "@/lib/domain/delivery/form-validation";
import {
  validateDinerRegisterForm,
  validateDinerResetPasswordForm,
  validateDinerSigninFields,
} from "@/lib/domain/diner/form-validation";
import {
  hasMenuItemFormErrors,
  modifierSelectionErrors,
  validateMenuItemForm,
} from "@/lib/domain/menu/form-validation";
import { validateCheckoutForm } from "@/lib/domain/order/form-validation";
import {
  validateHoursSchedule,
  validatePrepMinutesInput,
} from "@/lib/domain/store/form-validation";

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

describe("validateCheckoutForm", () => {
  it("requires name, phone, and a schedule when closed", () => {
    const errors = validateCheckoutForm({
      customerName: "",
      customerPhone: "123",
      customerEmail: "not-an-email",
      fulfillmentType: "pickup",
      dropoffAddress: "",
      mustSchedule: true,
      scheduledFor: null,
    });

    expect(errors.customerName).toBeTruthy();
    expect(errors.customerPhone).toBeTruthy();
    expect(errors.customerEmail).toMatch(/email/i);
    expect(errors.scheduledFor).toMatch(/time/i);
  });

  it("requires a verified delivery address", () => {
    const errors = validateCheckoutForm({
      customerName: "Ada",
      customerPhone: "5195550100",
      customerEmail: "",
      fulfillmentType: "delivery",
      dropoffAddress: "12",
      mustSchedule: false,
      scheduledFor: null,
    });

    expect(errors.dropoffAddress).toBeTruthy();
  });

  it("accepts a valid pickup checkout", () => {
    expect(
      validateCheckoutForm({
        customerName: "Ada Okonkwo",
        customerPhone: "5195550100",
        customerEmail: "ada@example.com",
        fulfillmentType: "pickup",
        dropoffAddress: "",
        mustSchedule: false,
        scheduledFor: null,
      }),
    ).toEqual({});
  });
});

describe("diner form validation", () => {
  it("validates sign-in fields", () => {
    expect(validateDinerSigninFields({ email: "", password: "" })).toEqual({
      email: "Enter your email address.",
      password: "Enter your password.",
    });
  });

  it("maps register schema errors to fields", () => {
    const errors = validateDinerRegisterForm({
      name: "A",
      email: "bad",
      phone: "123",
      password: "short",
    });

    expect(errors.name).toBeTruthy();
    expect(errors.email).toBeTruthy();
    expect(errors.phone).toBeTruthy();
    expect(errors.password).toBeTruthy();
  });

  it("requires matching reset passwords", () => {
    const errors = validateDinerResetPasswordForm({
      token: "a".repeat(24),
      password: "newSecure1",
      confirmPassword: "otherPass1",
    });

    expect(errors.confirmPassword).toMatch(/match/i);
  });
});

describe("menu form validation", () => {
  it("requires item details and modifier names", () => {
    const result = validateMenuItemForm({
      categoryId: "",
      name: "",
      priceDollars: "abc",
      groups: [
        {
          key: "g1",
          name: "",
          minSelect: "2",
          maxSelect: "1",
          modifiers: [{ key: "m1", name: "", priceDollars: "x" }],
        },
      ],
    });

    expect(hasMenuItemFormErrors(result)).toBe(true);
    expect(result.fieldErrors.categoryId).toBeTruthy();
    expect(result.fieldErrors.name).toBeTruthy();
    expect(result.fieldErrors.priceDollars).toBeTruthy();
    expect(result.groupErrors.g1?.name).toBeTruthy();
    expect(result.modifierErrors.m1?.name).toBeTruthy();
  });

  it("flags missing required modifiers", () => {
    const errors = modifierSelectionErrors(
      [
        {
          id: "spice",
          name: "Spice level",
          required: true,
          minSelect: 1,
          maxSelect: 1,
          sortOrder: 0,
          modifiers: [
            {
              id: "mild",
              name: "Mild",
              priceDeltaCents: 0,
              available: true,
              sortOrder: 0,
            },
          ],
        },
      ],
      new Map([["spice", []]]),
    );

    expect(errors.spice).toMatch(/Spice level/);
  });
});

describe("staff form validation", () => {
  it("requires customer name on detail save", () => {
    expect(validateCustomerDetailFields({ name: "  " }).name).toMatch(/name/i);
  });

  it("validates prep minutes range", () => {
    expect(validatePrepMinutesInput("abc")).toMatch(/minutes/i);
    expect(validatePrepMinutesInput("2")).toMatch(/5 and 180/);
    expect(validatePrepMinutesInput("15")).toBeNull();
  });

  it("flags invalid open hours", () => {
    const result = validateHoursSchedule([
      {
        dayOfWeek: 0,
        closed: false,
        openTime: "11:00",
        closeTime: "11:00",
      },
      {
        dayOfWeek: 1,
        closed: true,
        openTime: null,
        closeTime: null,
      },
      {
        dayOfWeek: 2,
        closed: true,
        openTime: null,
        closeTime: null,
      },
      {
        dayOfWeek: 3,
        closed: true,
        openTime: null,
        closeTime: null,
      },
      {
        dayOfWeek: 4,
        closed: true,
        openTime: null,
        closeTime: null,
      },
      {
        dayOfWeek: 5,
        closed: true,
        openTime: null,
        closeTime: null,
      },
      {
        dayOfWeek: 6,
        closed: true,
        openTime: null,
        closeTime: null,
      },
    ]);

    expect(result.dayErrors[0]).toBeTruthy();
  });
});
