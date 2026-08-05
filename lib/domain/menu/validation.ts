import { z } from "zod";
import {
  MENU_ITEM_DESCRIPTION_MAX,
  MENU_ITEM_NAME_MAX,
} from "@/lib/domain/menu/limits";

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
  sourceItemId: z.string().cuid().nullable().optional(),
});

const modifierGroupInputSchema = z
  .object({
    id: z.string().cuid().optional(),
    name: z.string().trim().min(1, "Group name is required").max(80),
    required: z.boolean().optional(),
    minSelect: z.number().int().min(0).max(20).optional(),
    maxSelect: z.number().int().min(1).max(20).optional(),
    sortOrder: z.number().int().min(0).optional(),
    sourceCategoryId: z.string().cuid().nullable().optional(),
    sourceItemIds: z.array(z.string().cuid()).max(30).optional(),
    modifiers: z.array(modifierInputSchema).max(30).optional(),
  })
  .superRefine((group, ctx) => {
    const hasCategory = Boolean(group.sourceCategoryId);
    const sourceItemIds = group.sourceItemIds ?? [];
    const linkedFromModifiers = (group.modifiers ?? []).some(
      (modifier) => modifier.sourceItemId,
    );
    if (hasCategory && (sourceItemIds.length > 0 || linkedFromModifiers)) {
      ctx.addIssue({
        code: "custom",
        message: "Choose a category or products, not both.",
        path: ["sourceCategoryId"],
      });
    }
  });

/** Absolute https URL (R2/CDN) or site-relative path (legacy `/brand/...`). */
const imageUrlSchema = z
  .union([
    z.string().url(),
    z.string().regex(/^\/[\w./-]+$/, "Invalid image path"),
    z.literal(""),
    z.null(),
  ])
  .optional();

export const createMenuItemSchema = z
  .object({
    categoryId: z.string().cuid("Choose a category"),
    additionalCategoryIds: z.array(z.string().cuid()).max(20).optional(),
    name: z
      .string()
      .trim()
      .min(1, "Item name is required")
      .max(MENU_ITEM_NAME_MAX),
    description: z
      .string()
      .trim()
      .max(MENU_ITEM_DESCRIPTION_MAX)
      .nullable()
      .optional(),
    priceCents: z.number().int().min(0, "Price must be zero or more").max(1_000_000),
    imageUrl: imageUrlSchema,
    available: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
    modifierGroups: z.array(modifierGroupInputSchema).max(10).optional(),
  })
  .superRefine((item, ctx) => {
    const extras = item.additionalCategoryIds ?? [];
    if (new Set(extras).size !== extras.length) {
      ctx.addIssue({
        code: "custom",
        message: "Duplicate additional categories.",
        path: ["additionalCategoryIds"],
      });
    }
    if (extras.includes(item.categoryId)) {
      ctx.addIssue({
        code: "custom",
        message: "Primary category is already selected.",
        path: ["additionalCategoryIds"],
      });
    }
  });

export const updateMenuItemSchema = z
  .object({
    categoryId: z.string().cuid().optional(),
    additionalCategoryIds: z.array(z.string().cuid()).max(20).optional(),
    name: z
      .string()
      .trim()
      .min(1, "Item name is required")
      .max(MENU_ITEM_NAME_MAX)
      .optional(),
    description: z
      .string()
      .trim()
      .max(MENU_ITEM_DESCRIPTION_MAX)
      .nullable()
      .optional(),
    priceCents: z.number().int().min(0).max(1_000_000).optional(),
    imageUrl: imageUrlSchema,
    available: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
    modifierGroups: z.array(modifierGroupInputSchema).max(10).optional(),
  })
  .superRefine((item, ctx) => {
    const extras = item.additionalCategoryIds;
    if (!extras) return;
    if (new Set(extras).size !== extras.length) {
      ctx.addIssue({
        code: "custom",
        message: "Duplicate additional categories.",
        path: ["additionalCategoryIds"],
      });
    }
    if (item.categoryId && extras.includes(item.categoryId)) {
      ctx.addIssue({
        code: "custom",
        message: "Primary category is already selected.",
        path: ["additionalCategoryIds"],
      });
    }
  });

export const setItemAvailabilitySchema = z.object({
  available: z.boolean(),
});

export type CreateCategorySchema = z.infer<typeof createCategorySchema>;
export type UpdateCategorySchema = z.infer<typeof updateCategorySchema>;
export type CreateMenuItemSchema = z.infer<typeof createMenuItemSchema>;
export type UpdateMenuItemSchema = z.infer<typeof updateMenuItemSchema>;
export type SetItemAvailabilitySchema = z.infer<typeof setItemAvailabilitySchema>;
