import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required").max(80),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required").max(80).optional(),
  sortOrder: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

const modifierInputSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().trim().min(1, "Modifier name is required").max(80),
  priceDeltaCents: z.number().int().min(0).max(100_000),
  available: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const modifierGroupInputSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().trim().min(1, "Group name is required").max(80),
  required: z.boolean().optional(),
  minSelect: z.number().int().min(0).max(20).optional(),
  maxSelect: z.number().int().min(1).max(20).optional(),
  sortOrder: z.number().int().min(0).optional(),
  modifiers: z.array(modifierInputSchema).max(30).optional(),
});

export const createMenuItemSchema = z.object({
  categoryId: z.string().cuid("Choose a category"),
  name: z.string().trim().min(1, "Item name is required").max(120),
  description: z.string().trim().max(500).nullable().optional(),
  priceCents: z.number().int().min(0, "Price must be zero or more").max(1_000_000),
  imageUrl: z
    .union([z.string().url(), z.literal(""), z.null()])
    .optional(),
  available: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  modifierGroups: z.array(modifierGroupInputSchema).max(10).optional(),
});

export const updateMenuItemSchema = z.object({
  categoryId: z.string().cuid().optional(),
  name: z.string().trim().min(1, "Item name is required").max(120).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  priceCents: z.number().int().min(0).max(1_000_000).optional(),
  imageUrl: z
    .union([z.string().url(), z.literal(""), z.null()])
    .optional(),
  available: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  modifierGroups: z.array(modifierGroupInputSchema).max(10).optional(),
});

export const setItemAvailabilitySchema = z.object({
  available: z.boolean(),
});

export type CreateCategorySchema = z.infer<typeof createCategorySchema>;
export type UpdateCategorySchema = z.infer<typeof updateCategorySchema>;
export type CreateMenuItemSchema = z.infer<typeof createMenuItemSchema>;
export type UpdateMenuItemSchema = z.infer<typeof updateMenuItemSchema>;
export type SetItemAvailabilitySchema = z.infer<typeof setItemAvailabilitySchema>;
