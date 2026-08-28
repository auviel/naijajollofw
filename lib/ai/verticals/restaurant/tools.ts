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
import { formatCadFromCents } from "@/lib/utils/currency";

export type CommercePorts = {
  catalog: CatalogPort;
  cart: CartPort;
  merchant: MerchantPort;
};

/** Model-facing catalog row — CAD strings only (no cents integers). */
function toModelCatalogItem(i: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceCents: number;
  available: boolean;
  categoryName?: string | null;
}) {
  return {
    id: i.id,
    slug: i.slug,
    name: i.name,
    price: formatCadFromCents(i.priceCents),
    category: i.categoryName ?? null,
    available: i.available,
    description: i.description,
  };
}

export function createCommerceTools(
  ports: CommercePorts,
  readCache: ReadToolCache,
) {
  return {
    searchCatalog: tool({
      description:
        "Search the live catalog by craving, name, or keywords (including soft drinks, juice, soda). Use before recommending. Quote the CAD price string field named price (e.g. $5.00). If empty is true, do not suggest unrelated food — ask for another craving or a drink/dish name.",
      inputSchema: z.object({
        query: z.string().min(1).max(120),
        limit: z.number().int().min(1).max(8).optional(),
      }),
      execute: async ({ query, limit }) => {
        const capped = capSearchLimit(limit);
        return readCache.getOrSet(searchCacheKey(query, capped), async () => {
          const items = await ports.catalog.search(query, capped);
          if (items.length === 0) {
            return {
              currency: "CAD",
              empty: true,
              items: [],
              hint: "No matching menu items. Do not recommend unrelated sides, bread, or meat. Ask the diner to name a dish or try another drink/food craving.",
            };
          }
          return {
            currency: "CAD",
            empty: false,
            items: items.map(toModelCatalogItem),
          };
        });
      },
    }),

    getProduct: tool({
      description:
        "Get one product price, availability, description, and option/modifier requirements by slug or id. Quote the CAD price string, never invent numbers.",
      inputSchema: z.object({
        slugOrId: z.string().min(1).max(120),
      }),
      execute: async ({ slugOrId }) => {
        return readCache.getOrSet(productCacheKey(slugOrId), async () => {
          const item = await ports.catalog.getBySlugOrId(slugOrId);
          if (!item) return { error: "Product not found." };
          return {
            ...toModelCatalogItem(item),
            currency: "CAD",
            optionGroups: item.optionGroups.map((g) => ({
              id: g.id,
              name: g.name,
              required: g.required,
              minSelect: g.minSelect,
              maxSelect: g.maxSelect,
              options: g.options.map((o) => ({
                id: o.id,
                name: o.name,
                priceDelta: formatCadFromCents(o.priceDeltaCents),
                available: o.available,
              })),
            })),
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
      execute: async ({ slug }) => {
        const clean = slug.trim();
        if (!clean || clean === "undefined" || clean === "null") {
          return { error: "Missing product slug." };
        }
        return { href: `/item/${clean}`, slug: clean };
      },
    }),

    getCart: tool({
      description:
        "Read the diner’s current cart (lines, quantities, subtotal). Quote subtotal / line total CAD strings.",
      inputSchema: z.object({}),
      execute: async () => {
        const summary = await ports.cart.getSummary();
        return {
          currency: summary.currency,
          itemCount: summary.itemCount,
          subtotal: formatCadFromCents(summary.subtotalCents),
          sessionId: summary.sessionId,
          lines: summary.lines.map((line) => ({
            lineId: line.lineId,
            menuItemId: line.menuItemId,
            name: line.name,
            quantity: line.quantity,
            total: formatCadFromCents(line.lineTotalCents),
            available: line.available,
          })),
        };
      },
    }),

    addToCart: tool({
      description:
        "Add a simple product to the session cart when no required options. If customize is required, return needsCustomize instead. Never claim success without this tool.",
      inputSchema: z.object({
        productId: z.string().min(1).max(120),
        quantity: z.number().int().min(1).max(99).optional(),
      }),
      execute: async ({ productId, quantity }) => {
        const result = await ports.cart.addSimple({
          productId,
          quantity: quantity ?? 1,
        });
        if (!result.ok) return result;
        return {
          ok: true as const,
          name: result.name,
          quantity: result.quantity,
          sessionId: result.sessionId,
          itemCount: result.itemCount,
          subtotal: formatCadFromCents(result.subtotalCents),
        };
      },
    }),

    updateCartItem: tool({
      description:
        "Change the quantity of a cart line. Use getCart first to learn lineId. Set quantity to 0 to remove.",
      inputSchema: z.object({
        lineId: z.string().min(1).max(120),
        quantity: z.number().int().min(0).max(99),
      }),
      execute: async ({ lineId, quantity }) => {
        const result =
          quantity <= 0
            ? await ports.cart.removeLine({ lineId })
            : await ports.cart.updateLine({ lineId, quantity });
        if (!result.ok) return result;
        return {
          ok: true as const,
          sessionId: result.sessionId,
          itemCount: result.itemCount,
          message: result.message,
          subtotal: formatCadFromCents(result.subtotalCents),
        };
      },
    }),

    removeCartItem: tool({
      description:
        "Remove one line from the cart by lineId. Use getCart first to learn lineId.",
      inputSchema: z.object({
        lineId: z.string().min(1).max(120),
      }),
      execute: async ({ lineId }) => {
        const result = await ports.cart.removeLine({ lineId });
        if (!result.ok) return result;
        return {
          ok: true as const,
          sessionId: result.sessionId,
          itemCount: result.itemCount,
          message: result.message,
          subtotal: formatCadFromCents(result.subtotalCents),
        };
      },
    }),
  };
}
