import { z } from "zod";
import { normalizeCanadianPhone } from "@/lib/utils/phone";

const canadianPhoneSchema = z
  .string()
  .min(10, "Valid phone number is required")
  .refine((value) => normalizeCanadianPhone(value) !== null, {
    message: "Enter a valid Canadian phone number",
  });

export const updateStoreProfileSchema = z.object({
  name: z.string().trim().min(1, "Store name is required"),
  phone: canadianPhoneSchema,
  addressLine2: z.string().trim().optional(),
  addressQuery: z.string().trim().min(5, "Enter a complete Canadian store address"),
});

export type UpdateStoreProfileInput = z.infer<typeof updateStoreProfileSchema>;
