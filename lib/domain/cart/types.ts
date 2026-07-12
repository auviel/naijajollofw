export const CART_SESSION_COOKIE = "dg_cart_sid";
export const CART_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
/** localStorage backup of the guest cart sid (Safari ITP may drop the cookie early). */
export const CART_SESSION_STORAGE_KEY = "dg_cart_sid";

export type CartModifierSelection = {
  groupId: string;
  groupName: string;
  modifierId: string;
  name: string;
  priceDeltaCents: number;
};

export type CartLineView = {
  id: string;
  menuItemId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  unitPriceCents: number;
  quantity: number;
  available: boolean;
  modifiers: CartModifierSelection[];
  lineTotalCents: number;
};

export type CartView = {
  id: string | null;
  storeId: string;
  itemCount: number;
  subtotalCents: number;
  currency: string;
  items: CartLineView[];
};
