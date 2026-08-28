import { buildSearchIndex } from "@/lib/domain/menu/search";
import { rankCatalogItems } from "@/lib/ai/catalog/rank";
import { canAddWithoutCustomize } from "@/lib/ai/core/can-add-simple";
import type { CartPort } from "@/lib/ai/ports/cart";
import type {
  CatalogPort,
  CatalogProductDetail,
  CatalogSearchItem,
} from "@/lib/ai/ports/catalog";
import type { MerchantPort } from "@/lib/ai/ports/merchant";
import { addCartItem } from "@/lib/services/cart/cart-actions";
import {
  getPublicMenuItem,
  getPublicStorefront,
} from "@/lib/services/storefront/get-public-menu";
import { getPublicStoreOpenStatus } from "@/lib/services/store/store-hours";
import { AppError } from "@/lib/utils/errors";

function toSearchItem(item: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  available: boolean;
}): CatalogSearchItem {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    description: item.description,
    priceCents: item.priceCents,
    imageUrl: item.imageUrl,
    available: item.available,
  };
}

export function createRestaurantCatalogPort(): CatalogPort {
  return {
    async search(query, limit = 5) {
      const { catalog } = await getPublicStorefront();
      const index = buildSearchIndex(catalog);
      return rankCatalogItems(
        index.items.map(toSearchItem),
        query,
        limit,
      );
    },

    async getBySlugOrId(slugOrId) {
      try {
        const { item } = await getPublicMenuItem(slugOrId);
        const detail: CatalogProductDetail = {
          ...toSearchItem(item),
          optionGroups: item.modifierGroups.map((g) => ({
            id: g.id,
            name: g.name,
            required: g.required,
            minSelect: g.minSelect,
            maxSelect: g.maxSelect,
            options: g.modifiers.map((m) => ({
              id: m.id,
              name: m.name,
              priceDeltaCents: m.priceDeltaCents,
              available: m.available,
            })),
          })),
        };
        return detail;
      } catch (err) {
        if (err instanceof AppError && err.status === 404) return null;
        throw err;
      }
    },
  };
}

export function createRestaurantCartPort(): CartPort {
  return {
    async addSimple({ productId, quantity }) {
      const catalog = createRestaurantCatalogPort();
      const item = await catalog.getBySlugOrId(productId);
      if (!item) {
        return { ok: false, error: "Item not found." };
      }
      if (!item.available) {
        return { ok: false, error: "This item is sold out." };
      }
      if (!canAddWithoutCustomize(item.optionGroups)) {
        return {
          ok: false,
          needsCustomize: true,
          slug: item.slug,
          reason: "This dish needs customization. Open the item page.",
        };
      }
      try {
        await addCartItem({
          menuItemId: item.id,
          quantity,
          modifierIds: [],
        });
        return { ok: true, name: item.name, quantity };
      } catch (err) {
        const message =
          err instanceof AppError ? err.message : "Could not add to cart.";
        return { ok: false, error: message };
      }
    },
  };
}

export function createRestaurantMerchantPort(): MerchantPort {
  return {
    async getStatus() {
      const status = await getPublicStoreOpenStatus();
      return {
        isOpen: status.isOpen,
        message: status.message,
        todayLabel: status.todayLabel,
        nextOpenLabel: status.nextOpenLabel,
        timezone: status.timezone,
        fulfillmentBlurb:
          "Customers choose pickup or delivery at checkout. Chat cannot place the order yet — guide them to cart/checkout.",
      };
    },
  };
}

export function createRestaurantPorts() {
  return {
    catalog: createRestaurantCatalogPort(),
    cart: createRestaurantCartPort(),
    merchant: createRestaurantMerchantPort(),
  };
}
