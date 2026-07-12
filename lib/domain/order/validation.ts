import { z } from "zod";
import { canadianPhoneSchema } from "@/lib/domain/delivery/validation";

export const checkoutRequestSchema = z
  .object({
    sourceId: z.string().min(1, "Payment token is required").optional(),
    idempotencyKey: z.string().uuid("Idempotency key must be a UUID"),
    customerName: z.string().trim().min(1, "Name is required").max(120),
    customerPhone: canadianPhoneSchema,
    fulfillmentType: z.enum(["pickup", "delivery"]),
    tipCents: z.number().int().min(0).max(50_000).default(0),
    notes: z.string().trim().max(500).optional(),
    dropoffAddress: z.string().trim().min(5).max(300).optional(),
    /** Apt / unit / suite — optional; folded into dropoffAddress on save. */
    dropoffUnit: z.string().trim().max(40).optional(),
    dropoffLat: z.number().min(-90).max(90).optional(),
    dropoffLng: z.number().min(-180).max(180).optional(),
    /** Guest-picked ready time (required when store is closed). */
    scheduledFor: z.coerce.date().optional(),
    /** Receipt email — optional; confirmation sent when present. */
    customerEmail: z
      .string()
      .trim()
      .email("Enter a valid email")
      .max(120)
      .optional()
      .or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.fulfillmentType === "delivery") {
      if (!data.dropoffAddress) {
        ctx.addIssue({
          code: "custom",
          path: ["dropoffAddress"],
          message: "Delivery address is required",
        });
      }
      if (data.dropoffLat == null || data.dropoffLng == null) {
        ctx.addIssue({
          code: "custom",
          path: ["dropoffAddress"],
          message: "Confirm a valid delivery address before paying",
        });
      }
    }
  });

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;
