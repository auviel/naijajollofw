import { buildSearchIndex } from "@/lib/domain/menu/search";
import { rankCatalogItems } from "@/lib/ai/catalog/rank";
import { canAddWithoutCustomize } from "@/lib/ai/core/can-add-simple";
import type { CartPort, CartSummary } from "@/lib/ai/ports/cart";
import type {
  CatalogPort,
  CatalogProductDetail,
  CatalogSearchItem,
} from "@/lib/ai/ports/catalog";
import type { MerchantPort } from "@/lib/ai/ports/merchant";
import {
  cartRepository,
  mapCartToView,
} from "@/lib/db/repositories/cart.repository";
import {
  addCartItem,
  removeCartItem,
  updateCartItem,
} from "@/lib/services/cart/cart-actions";
import { readCartSessionId } from "@/lib/services/cart/session";
import { resolvePublicStoreId } from "@/lib/services/storefront/resolve-public-store";
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
  categoryName?: string | null;
}): CatalogSearchItem {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    description: item.description,
    priceCents: item.priceCents,
    imageUrl: item.imageUrl,
    available: item.available,
    categoryName: item.categoryName ?? null,
  };
}

/** Bypass React `cache()` on getCart so tool chains see fresh lines. */
async function loadCartSummary(): Promise<CartSummary> {
  const storeId = await resolvePublicStoreId();
  const sessionId = await readCartSessionId();
  if (!sessionId) {
    return {
      itemCount: 0,
      subtotalCents: 0,
      currency: "CAD",
      sessionId: null,
      lines: [],
    };
  }
  const cart = await cartRepository.findByStoreAndSession(storeId, sessionId);
  const view = mapCartToView(storeId, cart);
  return {
    itemCount: view.itemCount,
    subtotalCents: view.subtotalCents,
    currency: view.currency,
    sessionId,
    lines: view.items.map((line) => ({
      lineId: line.id,
      menuItemId: line.menuItemId,
      name: line.name,
      quantity: line.quantity,
      lineTotalCents: line.lineTotalCents,
      available: line.available,
    })),
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
    async getSummary() {
      return loadCartSummary();
    },

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
        const cart = await addCartItem({
          menuItemId: item.id,
          quantity,
          modifierIds: [],
        });
        const sessionId = await readCartSessionId();
        return {
          ok: true,
          name: item.name,
          quantity,
          sessionId,
          itemCount: cart.itemCount,
          subtotalCents: cart.subtotalCents,
        };
      } catch (err) {
        const message =
          err instanceof AppError ? err.message : "Could not add to cart.";
        return { ok: false, error: message };
      }
    },

    async updateLine({ lineId, quantity }) {
      try {
        const cart = await updateCartItem(lineId, { quantity });
        const sessionId = await readCartSessionId();
        return {
          ok: true,
          sessionId,
          itemCount: cart.itemCount,
          subtotalCents: cart.subtotalCents,
          message:
            quantity <= 0
              ? "Removed that item from the cart."
              : `Updated quantity to ${quantity}.`,
        };
      } catch (err) {
        const message =
          err instanceof AppError ? err.message : "Could not update cart.";
        return { ok: false, error: message };
      }
    },

    async removeLine({ lineId }) {
      try {
        const cart = await removeCartItem(lineId);
        const sessionId = await readCartSessionId();
        return {
          ok: true,
          sessionId,
          itemCount: cart.itemCount,
          subtotalCents: cart.subtotalCents,
          message: "Removed that item from the cart.",
        };
      } catch (err) {
        const message =
          err instanceof AppError ? err.message : "Could not remove from cart.";
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
