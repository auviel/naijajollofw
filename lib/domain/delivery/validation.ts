import { z } from "zod";
import { normalizeCanadianPhone } from "@/lib/utils/phone";

export const proofOfDeliveryConfigSchema = z.object({
  signature: z.boolean(),
  picture: z.boolean(),
  pincode: z.boolean(),
});

export const canadianPhoneSchema = z
  .string()
  .min(10, "Valid phone number is required")
  .refine((value) => normalizeCanadianPhone(value) !== null, {
    message: "Enter a valid Canadian phone number",
  });

export const deliveryProviderIdSchema = z.enum(["uber_direct", "doordash_drive"]);

export const createDeliverySchema = z.object({
  providerId: deliveryProviderIdSchema,
  quoteId: z.string().min(1, "A valid quote is required"),
  dropoffName: z.string().min(1, "Customer name is required"),
  dropoffPhone: canadianPhoneSchema,
  dropoffAddress: z.string().min(5, "Dropoff address is required"),
  scheduledPickupAt: z.coerce.date().optional(),
  proofOfDelivery: proofOfDeliveryConfigSchema.default({
    signature: false,
    picture: false,
    pincode: true,
  }),
  idempotencyKey: z.string().optional(),
});

export const createQuoteSchema = z.object({
  dropoffAddress: z.string().min(5, "Dropoff address is required"),
  dropoffName: z.string().min(1, "Customer name is required"),
  dropoffPhone: canadianPhoneSchema,
  scheduledPickupAt: z.coerce.date().optional(),
});

export const cancelDeliverySchema = z
  .object({
    reason: z.enum([
      "CUSTOMER_CALLED_TO_CANCEL",
      "OUT_OF_ITEMS",
      "RESTAURANT_TOO_BUSY",
      "OTHER",
    ]),
    details: z.string().optional(),
  })
  .refine(
    (data) =>
      data.reason !== "OTHER" ||
      Boolean(data.details && data.details.trim().length > 0),
    {
      message: "Details are required when reason is Other",
      path: ["details"],
    },
  );

export type CreateDeliverySchema = z.infer<typeof createDeliverySchema>;
export type CreateQuoteSchema = z.infer<typeof createQuoteSchema>;
export type CancelDeliverySchema = z.infer<typeof cancelDeliverySchema>;

export const listDeliveriesQuerySchema = z.object({
  filter: z.string().optional(),
  q: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export type ListDeliveriesQuerySchema = z.infer<typeof listDeliveriesQuerySchema>;
