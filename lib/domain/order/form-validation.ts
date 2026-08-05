import { checkoutRequestSchema } from "@/lib/domain/order/validation";
import { zodErrorToFieldErrors } from "@/lib/forms/zod-field-errors";

export type CheckoutFormField =
  | "customerName"
  | "customerPhone"
  | "customerEmail"
  | "dropoffAddress"
  | "scheduledFor";

export type CheckoutFormErrors = Partial<Record<CheckoutFormField, string>>;

export function omitCheckoutFieldError(
  current: CheckoutFormErrors,
  key: CheckoutFormField,
): CheckoutFormErrors {
  switch (key) {
    case "customerName":
      return current.customerName
        ? { ...current, customerName: undefined }
        : current;
    case "customerPhone":
      return current.customerPhone
        ? { ...current, customerPhone: undefined }
        : current;
    case "customerEmail":
      return current.customerEmail
        ? { ...current, customerEmail: undefined }
        : current;
    case "dropoffAddress":
      return current.dropoffAddress
        ? { ...current, dropoffAddress: undefined }
        : current;
    case "scheduledFor":
      return current.scheduledFor
        ? { ...current, scheduledFor: undefined }
        : current;
  }
}

export function validateCheckoutForm(input: {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  fulfillmentType: "pickup" | "delivery";
  dropoffAddress: string;
  dropoffLat?: number;
  dropoffLng?: number;
  mustSchedule: boolean;
  scheduledFor: string | null;
}): CheckoutFormErrors {
  const parsed = checkoutRequestSchema.safeParse({
    idempotencyKey: "00000000-0000-4000-8000-000000000000",
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    customerEmail: input.customerEmail.trim() || undefined,
    fulfillmentType: input.fulfillmentType,
    tipCents: 0,
    dropoffAddress:
      input.fulfillmentType === "delivery"
        ? input.dropoffAddress.trim() || undefined
        : undefined,
    dropoffLat: input.fulfillmentType === "delivery" ? input.dropoffLat : undefined,
    dropoffLng: input.fulfillmentType === "delivery" ? input.dropoffLng : undefined,
    scheduledFor: input.scheduledFor ?? undefined,
  });

  const errors: CheckoutFormErrors = parsed.success
    ? {}
    : (zodErrorToFieldErrors(parsed.error) as CheckoutFormErrors);

  if (input.mustSchedule && !input.scheduledFor) {
    errors.scheduledFor = "Choose a time for your order.";
  }

  return errors;
}
