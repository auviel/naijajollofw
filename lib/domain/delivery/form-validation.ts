import { normalizeCanadianPhone } from "@/lib/utils/phone";

export type DeliveryFormField = "dropoffName" | "dropoffPhone" | "dropoffAddress";

export type DeliveryFormErrors = Partial<Record<DeliveryFormField, string>>;

export function validateDeliveryFormFields(input: {
  dropoffName: string;
  dropoffPhone: string;
  addressVerified: boolean;
  geocodeError: string | null;
}): DeliveryFormErrors {
  const errors: DeliveryFormErrors = {};

  if (!input.dropoffName.trim()) {
    errors.dropoffName = "Enter the customer name.";
  }

  if (!normalizeCanadianPhone(input.dropoffPhone)) {
    errors.dropoffPhone = "Enter a valid Canadian phone number (10 digits).";
  }

  if (!input.addressVerified) {
    errors.dropoffAddress =
      input.geocodeError ?? "Enter and verify a complete Canadian address.";
  }

  return errors;
}

export function validateLoginFields(input: {
  email: string;
  password: string;
}): Partial<Record<"email" | "password", string>> {
  const errors: Partial<Record<"email" | "password", string>> = {};

  if (!input.email.trim()) {
    errors.email = "Enter your email address.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (!input.password) {
    errors.password = "Enter your password.";
  }

  return errors;
}
