import { normalizeCanadianPhone } from "@/lib/utils/phone";

export type CustomerFormField = "name" | "phone" | "address";

export type CustomerFormErrors = Partial<Record<CustomerFormField, string>>;

export function validateCustomerFormFields(input: {
  name: string;
  phone: string;
  addressVerified: boolean;
  geocodeError: string | null;
}): CustomerFormErrors {
  const errors: CustomerFormErrors = {};

  if (!input.name.trim()) {
    errors.name = "Enter the customer name.";
  }

  if (!normalizeCanadianPhone(input.phone)) {
    errors.phone = "Enter a valid Canadian phone number (10 digits).";
  }

  if (!input.addressVerified) {
    errors.address =
      input.geocodeError ?? "Enter and verify a complete Canadian address.";
  }

  return errors;
}
