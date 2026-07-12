import {
  cartRepository,
  mapCartToView,
} from "@/lib/db/repositories/cart.repository";
import {
  mapMenuItemToDetail,
  menuRepository,
} from "@/lib/db/repositories/menu.repository";
import { resolveModifierSelections } from "@/lib/domain/cart/modifiers";
import type { CartView } from "@/lib/domain/cart/types";
import {
  addCartItemSchema,
  updateCartItemSchema,
} from "@/lib/domain/cart/validation";
import {
  getOrCreateCartSessionId,
  readCartSessionId,
  touchCartSessionCookie,
} from "@/lib/services/cart/session";
import { resolvePublicStoreId } from "@/lib/services/storefront/resolve-public-store";
import { AppError } from "@/lib/utils/errors";

export async function getCart(): Promise<CartView> {
  const storeId = await resolvePublicStoreId();
  const sessionId = await readCartSessionId();
  if (!sessionId) {
    return mapCartToView(storeId, null);
  }

  await touchCartSessionCookie(sessionId);

  const cart = await cartRepository.findByStoreAndSession(storeId, sessionId);
  return mapCartToView(storeId, cart);
}

export async function addCartItem(input: unknown): Promise<CartView> {
  const storeId = await resolvePublicStoreId();
  // Closed stores still accept cart adds — checkout schedules for next open.

  const parsed = addCartItemSchema.parse(input);
  const { sessionId } = await getOrCreateCartSessionId();

  const menuItem = await menuRepository.findPublicItemById(
    parsed.menuItemId,
    storeId,
  );
  if (!menuItem) {
    throw new AppError("NOT_FOUND", "Item not found", 404);
  }
  if (!menuItem.available) {
    throw new AppError("VALIDATION_ERROR", "This item is sold out.", 400);
  }

  const detail = mapMenuItemToDetail(menuItem);
  const modifiers = resolveModifierSelections(
    detail.modifierGroups,
    parsed.modifierIds,
  );

  const cart = await cartRepository.getOrCreate(storeId, sessionId);
  await cartRepository.addOrMergeLine({
    cartId: cart.id,
    menuItemId: menuItem.id,
    quantity: parsed.quantity,
    modifiers,
  });

  const refreshed = await cartRepository.findByStoreAndSession(storeId, sessionId);
  return mapCartToView(storeId, refreshed);
}

export async function updateCartItem(
  lineId: string,
  input: unknown,
): Promise<CartView> {
  const storeId = await resolvePublicStoreId();
  const parsed = updateCartItemSchema.parse(input);
  const { sessionId } = await getOrCreateCartSessionId();
  const cart = await cartRepository.findByStoreAndSession(storeId, sessionId);

  if (!cart) {
    throw new AppError("NOT_FOUND", "Cart not found", 404);
  }

  const line = await cartRepository.findLine(cart.id, lineId);
  if (!line) {
    throw new AppError("NOT_FOUND", "Cart item not found", 404);
  }

  await cartRepository.updateLineQuantity(cart.id, lineId, parsed.quantity);
  const refreshed = await cartRepository.findByStoreAndSession(storeId, sessionId);
  return mapCartToView(storeId, refreshed);
}

export async function removeCartItem(lineId: string): Promise<CartView> {
  const storeId = await resolvePublicStoreId();
  const { sessionId } = await getOrCreateCartSessionId();
  const cart = await cartRepository.findByStoreAndSession(storeId, sessionId);

  if (!cart) {
    throw new AppError("NOT_FOUND", "Cart not found", 404);
  }

  const line = await cartRepository.findLine(cart.id, lineId);
  if (!line) {
    throw new AppError("NOT_FOUND", "Cart item not found", 404);
  }

  await cartRepository.removeLine(cart.id, lineId);
  const refreshed = await cartRepository.findByStoreAndSession(storeId, sessionId);
  return mapCartToView(storeId, refreshed);
}
