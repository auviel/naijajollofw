import { z } from "zod";
import { canadianPhoneSchema } from "@/lib/domain/delivery/validation";

export const listCustomersQuerySchema = z.object({
  q: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const searchCustomersQuerySchema = z.object({
  q: z.string().trim().min(1, "Enter at least one character to search"),
  limit: z.coerce.number().int().min(1).max(20).optional(),
});

export const updateCustomerSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required").optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required"),
  phone: canadianPhoneSchema,
  address: z.string().trim().min(1, "Address is required"),
});

export type ListCustomersQuerySchema = z.infer<typeof listCustomersQuerySchema>;
export type SearchCustomersQuerySchema = z.infer<typeof searchCustomersQuerySchema>;
export type UpdateCustomerSchema = z.infer<typeof updateCustomerSchema>;
export type CreateCustomerSchema = z.infer<typeof createCustomerSchema>;
