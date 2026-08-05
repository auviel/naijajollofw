import { canRequestQuote } from "@/components/features/deliveries/address-preview";
import type { StoreHoursDay } from "@/lib/domain/store/hours";
import { updateStoreHoursSchema } from "@/lib/domain/store/hours-validation";
import { updatePrepMinutesSchema } from "@/lib/domain/store/prep-validation";
import type { GeocodedAddress } from "@/lib/integrations/geocoding/types";
import { normalizeCanadianPhone } from "@/lib/utils/phone";

export type StoreProfileFormField =
  | "name"
  | "phone"
  | "email"
  | "addressLine2"
  | "addressQuery";

export type StoreProfileFormErrors = Partial<Record<StoreProfileFormField, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateStoreProfileFields(input: {
  name: string;
  phone: string;
  email: string;
  geocoded: GeocodedAddress | null;
  geocodeError: string | null;
}): StoreProfileFormErrors {
  const errors: StoreProfileFormErrors = {};

  if (!input.name.trim()) {
    errors.name = "Enter your store name.";
  }

  if (!normalizeCanadianPhone(input.phone)) {
    errors.phone = "Enter a valid Canadian phone number (10 digits).";
  }

  if (!EMAIL_RE.test(input.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (!canRequestQuote(input.geocoded)) {
    errors.addressQuery =
      input.geocodeError ?? "Enter and verify a complete Canadian store address.";
  }

  return errors;
}

export function validateHoursSchedule(days: StoreHoursDay[]): {
  formError?: string;
  dayErrors: Record<number, string>;
} {
  const parsed = updateStoreHoursSchema.safeParse({ days });
  if (parsed.success) {
    return { dayErrors: {} };
  }

  const dayErrors: Record<number, string> = {};
  let formError: string | undefined;

  for (const issue of parsed.error.issues) {
    if (issue.path[0] === "days" && typeof issue.path[1] === "number") {
      const day = days[issue.path[1]];
      const dayOfWeek = day?.dayOfWeek ?? issue.path[1];
      if (!dayErrors[dayOfWeek]) {
        dayErrors[dayOfWeek] = issue.message;
      }
      continue;
    }
    formError ??= issue.message;
  }

  return { formError, dayErrors };
}

export function validatePrepMinutesInput(value: string): string | null {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return "Enter a valid number of minutes.";
  }
  const result = updatePrepMinutesSchema.safeParse({ prepMinutes: parsed });
  if (!result.success) {
    return "Prep time must be between 5 and 180 minutes.";
  }
  return null;
}
