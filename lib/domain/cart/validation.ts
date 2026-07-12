import { z } from "zod";

export const addCartItemSchema = z.object({
  menuItemId: z.string().cuid(),
  quantity: z.number().int().min(1).max(99).default(1),
  modifierIds: z.array(z.string().cuid()).max(40).default([]),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0).max(99),
});

export type AddCartItemSchema = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemSchema = z.infer<typeof updateCartItemSchema>;
