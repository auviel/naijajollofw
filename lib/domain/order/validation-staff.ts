import { z } from "zod";
import { deliveryProviderIdSchema } from "@/lib/domain/delivery/validation";

export const orderTransitionSchema = z.object({
  to: z.enum([
    "accepted",
    "preparing",
    "ready",
    "ready_for_pickup",
    "out_for_delivery",
    "completed",
    "cancelled",
  ]),
  note: z.string().trim().max(500).optional(),
});

export type OrderTransitionInput = z.infer<typeof orderTransitionSchema>;

export const listOrdersQuerySchema = z.object({
  filter: z.string().optional(),
  q: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const fulfillManualSchema = z.object({
  note: z.string().trim().max(500).optional(),
});

export type FulfillManualInput = z.infer<typeof fulfillManualSchema>;

/** Quote selected; dropoff comes from the order. */
export const fulfillDelivergoSchema = z.object({
  providerId: deliveryProviderIdSchema,
  quoteId: z.string().min(1, "A valid quote is required"),
  scheduledPickupAt: z.coerce.date().optional(),
  idempotencyKey: z.string().optional(),
});

export type FulfillDelivergoInput = z.infer<typeof fulfillDelivergoSchema>;
