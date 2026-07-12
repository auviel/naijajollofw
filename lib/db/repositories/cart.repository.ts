import type { Cart, CartItem, MenuItem, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import type { CartModifierSelection, CartView } from "@/lib/domain/cart/types";
import {
  lineUnitPriceCents,
  modifiersSignature,
} from "@/lib/domain/cart/modifiers";

type CartItemWithMenu = CartItem & {
  menuItem: MenuItem;
};

function parseModifiers(value: Prisma.JsonValue): CartModifierSelection[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }
    const record = entry as Record<string, unknown>;
    if (
      typeof record.groupId !== "string" ||
      typeof record.groupName !== "string" ||
      typeof record.modifierId !== "string" ||
      typeof record.name !== "string" ||
      typeof record.priceDeltaCents !== "number"
    ) {
      return [];
    }
    return [
      {
        groupId: record.groupId,
        groupName: record.groupName,
        modifierId: record.modifierId,
        name: record.name,
        priceDeltaCents: record.priceDeltaCents,
      },
    ];
  });
}

function mapLine(item: CartItemWithMenu) {
  const modifiers = parseModifiers(item.modifiers);
  const unitPriceCents = lineUnitPriceCents(item.menuItem.priceCents, modifiers);

  return {
    id: item.id,
    menuItemId: item.menuItemId,
    name: item.menuItem.name,
    description: item.menuItem.description,
    unitPriceCents,
    quantity: item.quantity,
    available: item.menuItem.available,
    modifiers,
    lineTotalCents: unitPriceCents * item.quantity,
  };
}

export function mapCartToView(
  storeId: string,
  cart: (Cart & { items: CartItemWithMenu[] }) | null,
): CartView {
  if (!cart) {
    return {
      id: null,
      storeId,
      itemCount: 0,
      subtotalCents: 0,
      currency: "CAD",
      items: [],
    };
  }

  const items = cart.items.map(mapLine);
  return {
    id: cart.id,
    storeId,
    itemCount: items.reduce((sum, line) => sum + line.quantity, 0),
    subtotalCents: items.reduce((sum, line) => sum + line.lineTotalCents, 0),
    currency: "CAD",
    items,
  };
}

const cartInclude = {
  items: {
    orderBy: { createdAt: "asc" as const },
    include: { menuItem: true },
  },
} satisfies Prisma.CartInclude;

export const cartRepository = {
  async findByStoreAndSession(storeId: string, sessionId: string) {
    return prisma.cart.findUnique({
      where: {
        storeId_sessionId: { storeId, sessionId },
      },
      include: cartInclude,
    });
  },

  async getOrCreate(storeId: string, sessionId: string) {
    const existing = await this.findByStoreAndSession(storeId, sessionId);
    if (existing) {
      return existing;
    }

    return prisma.cart.create({
      data: { storeId, sessionId },
      include: cartInclude,
    });
  },

  async findLine(cartId: string, lineId: string) {
    return prisma.cartItem.findFirst({
      where: { id: lineId, cartId },
      include: { menuItem: true },
    });
  },

  async addOrMergeLine(input: {
    cartId: string;
    menuItemId: string;
    quantity: number;
    modifiers: CartModifierSelection[];
  }) {
    const signature = modifiersSignature(input.modifiers);
    const existingLines = await prisma.cartItem.findMany({
      where: { cartId: input.cartId, menuItemId: input.menuItemId },
    });

    const match = existingLines.find(
      (line) => modifiersSignature(parseModifiers(line.modifiers)) === signature,
    );

    if (match) {
      await prisma.cartItem.update({
        where: { id: match.id },
        data: { quantity: match.quantity + input.quantity },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: input.cartId,
          menuItemId: input.menuItemId,
          quantity: input.quantity,
          modifiers: input.modifiers as Prisma.InputJsonValue,
        },
      });
    }

    await prisma.cart.update({
      where: { id: input.cartId },
      data: { updatedAt: new Date() },
    });
  },

  async updateLineQuantity(cartId: string, lineId: string, quantity: number) {
    if (quantity <= 0) {
      await prisma.cartItem.deleteMany({ where: { id: lineId, cartId } });
    } else {
      await prisma.cartItem.updateMany({
        where: { id: lineId, cartId },
        data: { quantity },
      });
    }

    await prisma.cart.update({
      where: { id: cartId },
      data: { updatedAt: new Date() },
    });
  },

  async removeLine(cartId: string, lineId: string) {
    await prisma.cartItem.deleteMany({ where: { id: lineId, cartId } });
    await prisma.cart.update({
      where: { id: cartId },
      data: { updatedAt: new Date() },
    });
  },

  async clearCart(cartId: string) {
    await prisma.cartItem.deleteMany({ where: { cartId } });
    await prisma.cart.update({
      where: { id: cartId },
      data: { updatedAt: new Date() },
    });
  },
};
