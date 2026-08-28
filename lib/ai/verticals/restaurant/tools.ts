import { tool } from "ai";
import { z } from "zod";
import { capSearchLimit } from "@/lib/ai/core/cost";
import type { ReadToolCache } from "@/lib/ai/core/tool-cache";
import {
  merchantCacheKey,
  productCacheKey,
  searchCacheKey,
} from "@/lib/ai/core/tool-cache";
import type { CartPort } from "@/lib/ai/ports/cart";
import type { CatalogPort } from "@/lib/ai/ports/catalog";
import type { MerchantPort } from "@/lib/ai/ports/merchant";

export type CommercePorts = {
  catalog: CatalogPort;
  cart: CartPort;
  merchant: MerchantPort;
};

export function createCommerceTools(
  ports: CommercePorts,
  readCache: ReadToolCache,
) {
  return {
    searchCatalog: tool({
      description:
        "Search the live catalog by craving, name, or keywords. Use before recommending dishes.",
      inputSchema: z.object({
        query: z.string().min(1).max(120),
        limit: z.number().int().min(1).max(8).optional(),
      }),
      execute: async ({ query, limit }) => {
        const capped = capSearchLimit(limit);
        return readCache.getOrSet(searchCacheKey(query, capped), async () => {
          const items = await ports.catalog.search(query, capped);
          return {
            items: items.map((i) => ({
              id: i.id,
              slug: i.slug,
              name: i.name,
              priceCents: i.priceCents,
              available: i.available,
              description: i.description,
            })),
          };
        });
      },
    }),

    getProduct: tool({
      description:
        "Get one product’s price, availability, description, and option/modifier requirements by slug or id.",
      inputSchema: z.object({
        slugOrId: z.string().min(1).max(120),
      }),
      execute: async ({ slugOrId }) => {
        return readCache.getOrSet(productCacheKey(slugOrId), async () => {
          const item = await ports.catalog.getBySlugOrId(slugOrId);
          if (!item) return { error: "Product not found." };
          return {
            id: item.id,
            slug: item.slug,
            name: item.name,
            description: item.description,
            priceCents: item.priceCents,
            available: item.available,
            optionGroups: item.optionGroups,
          };
        });
      },
    }),

    getMerchantStatus: tool({
      description:
        "Get whether the store is open, today’s hours message, and pickup/delivery basics.",
      inputSchema: z.object({}),
      execute: async () => {
        return readCache.getOrSet(merchantCacheKey(), () =>
          ports.merchant.getStatus(),
        );
      },
    }),

    openProduct: tool({
      description:
        "Open the product customize page when options are required or the user wants to see the dish.",
      inputSchema: z.object({
        slug: z.string().min(1).max(120),
      }),
      execute: async ({ slug }) => ({ href: `/item/${slug}`, slug }),
    }),

    addToCart: tool({
      description:
        "Add a simple product to the session cart when no required options. If customize is required, return needsCustomize instead.",
      inputSchema: z.object({
        productId: z.string().min(1).max(120),
        quantity: z.number().int().min(1).max(99).optional(),
      }),
      execute: async ({ productId, quantity }) => {
        return ports.cart.addSimple({
          productId,
          quantity: quantity ?? 1,
        });
      },
    }),
  };
}
