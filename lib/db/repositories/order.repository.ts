import type {
  Delivery,
  Order,
  OrderEvent,
  OrderLineItem,
  OrderStatus,
  Prisma,
  Store,
} from "@prisma/client";
import { prisma } from "@/lib/db/client";
import type { CartModifierSelection } from "@/lib/domain/cart/types";
import {
  getDeliveryProviderLabel,
} from "@/lib/domain/delivery/types";
import {
  buildGuestOrderTimeline,
  buildGuestStatusMessage,
} from "@/lib/domain/order/guest-timeline";
import type {
  PublicOrderView,
  StaffOrderDetail,
  StaffOrderListItem,
} from "@/lib/domain/order/types";
import { getTransitionActions } from "@/lib/domain/order/transitions";

type OrderWithRelations = Order & {
  lineItems: OrderLineItem[];
  events: OrderEvent[];
  delivery?: Delivery | null;
  store?: Pick<Store, "name" | "prepMinutes"> | null;
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

function summarizeLines(lineItems: OrderLineItem[]): {
  itemCount: number;
  itemSummary: string;
} {
  const itemCount = lineItems.reduce((sum, line) => sum + line.quantity, 0);
  const names = lineItems.map((line) =>
    line.quantity > 1 ? `${line.quantity}× ${line.name}` : line.name,
  );
  const itemSummary =
    names.length <= 2
      ? names.join(", ")
      : `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
  return { itemCount, itemSummary };
}

export function mapOrderToPublicView(order: OrderWithRelations): PublicOrderView {
  const storeName = order.store?.name ?? "Restaurant";
  const prepMinutes = order.store?.prepMinutes ?? 25;
  const timeline = buildGuestOrderTimeline(order.status, order.fulfillmentType);
  const tracking =
    order.fulfillmentMethod === "delivergo" && order.delivery
      ? {
          url: order.delivery.trackingUrl,
          providerLabel:
            order.delivery.providerId === "uber_direct" ||
            order.delivery.providerId === "doordash_drive"
              ? getDeliveryProviderLabel(order.delivery.providerId)
              : order.delivery.providerId,
          deliveryStatus: order.delivery.status,
        }
      : null;

  return {
    id: order.id,
    publicToken: order.publicToken,
    status: order.status,
    fulfillmentType: order.fulfillmentType,
    fulfillmentMethod: order.fulfillmentMethod,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    dropoffAddress: order.dropoffAddress,
    notes: order.notes,
    scheduledFor: order.scheduledFor?.toISOString() ?? null,
    subtotalCents: order.subtotalCents,
    tipCents: order.tipCents,
    taxCents: order.taxCents,
    totalCents: order.totalCents,
    currency: order.currency,
    placedAt: order.placedAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    storeName,
    prepMinutes,
    statusMessage: buildGuestStatusMessage({
      status: order.status,
      fulfillmentType: order.fulfillmentType,
      prepMinutes,
      storeName,
    }),
    timeline,
    tracking,
    lineItems: order.lineItems.map((line) => ({
      id: line.id,
      name: line.name,
      description: line.description,
      unitPriceCents: line.unitPriceCents,
      quantity: line.quantity,
      modifiers: parseModifiers(line.modifiers),
      lineTotalCents: line.lineTotalCents,
    })),
    events: order.events.map((event) => ({
      id: event.id,
      status: event.status,
      note: event.note,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}

export function mapOrderToStaffListItem(
  order: Order & { lineItems: OrderLineItem[] },
): StaffOrderListItem {
  const { itemCount, itemSummary } = summarizeLines(order.lineItems);
  return {
    id: order.id,
    status: order.status,
    fulfillmentType: order.fulfillmentType,
    fulfillmentMethod: order.fulfillmentMethod,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    dropoffAddress: order.dropoffAddress,
    notes: order.notes,
    scheduledFor: order.scheduledFor?.toISOString() ?? null,
    deliveryId: order.deliveryId,
    manualDeliveryNote: order.manualDeliveryNote,
    itemCount,
    itemSummary,
    tipCents: order.tipCents,
    totalCents: order.totalCents,
    currency: order.currency,
    placedAt: order.placedAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export function mapOrderToStaffDetail(order: OrderWithRelations): StaffOrderDetail {
  const base = mapOrderToStaffListItem(order);
  const needsFulfillment =
    order.status === "ready" &&
    (order.fulfillmentType === "pickup" ||
      (order.fulfillmentType === "delivery" &&
        order.fulfillmentMethod === "unassigned"));

  return {
    ...base,
    publicToken: order.publicToken,
    subtotalCents: order.subtotalCents,
    taxCents: order.taxCents,
    lineItems: order.lineItems.map((line) => ({
      id: line.id,
      name: line.name,
      description: line.description,
      unitPriceCents: line.unitPriceCents,
      quantity: line.quantity,
      modifiers: parseModifiers(line.modifiers),
      lineTotalCents: line.lineTotalCents,
    })),
    events: order.events.map((event) => ({
      id: event.id,
      status: event.status,
      actor: event.actor,
      note: event.note,
      createdAt: event.createdAt.toISOString(),
    })),
    allowedActions: getTransitionActions(order.status, {
      fulfillmentType: order.fulfillmentType,
      fulfillmentMethod: order.fulfillmentMethod,
    }),
    linkedDelivery: order.delivery
      ? {
          id: order.delivery.id,
          status: order.delivery.status,
          providerId: order.delivery.providerId,
          trackingUrl: order.delivery.trackingUrl,
          feeCents: order.delivery.feeCents,
        }
      : null,
    needsFulfillment,
  };
}

const orderInclude = {
  lineItems: { orderBy: { createdAt: "asc" as const } },
  events: { orderBy: { createdAt: "asc" as const } },
  delivery: true,
  store: { select: { name: true, prepMinutes: true } },
  user: { select: { email: true, name: true } },
} satisfies Prisma.OrderInclude;

const listInclude = {
  lineItems: { orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.OrderInclude;

export type CreateOrderInput = {
  storeId: string;
  userId?: string | null;
  fulfillmentType: "pickup" | "delivery";
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  dropoffAddress?: string | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  notes?: string | null;
  scheduledFor?: Date | null;
  subtotalCents: number;
  tipCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
  squarePaymentId: string;
  lineItems: Array<{
    name: string;
    description: string | null;
    unitPriceCents: number;
    quantity: number;
    modifiers: CartModifierSelection[];
    lineTotalCents: number;
    menuItemId: string;
  }>;
};

export const orderRepository = {
  async findByIdWithPublicToken(id: string, publicToken: string) {
    return prisma.order.findFirst({
      where: { id, publicToken },
      include: orderInclude,
    });
  },

  async findByIdForStore(id: string, storeId: string) {
    return prisma.order.findFirst({
      where: { id, storeId },
      include: orderInclude,
    });
  },

  async findManyForUser(userId: string, limit = 20) {
    return prisma.order.findMany({
      where: {
        userId,
        NOT: { status: "pending_payment" },
      },
      include: orderInclude,
      orderBy: [{ placedAt: "desc" }, { createdAt: "desc" }],
      take: limit,
    });
  },

  async findBySquarePaymentId(squarePaymentId: string) {
    return prisma.order.findUnique({
      where: { squarePaymentId },
      include: orderInclude,
    });
  },

  async findManyForStore(input: {
    storeId: string;
    statuses?: OrderStatus[];
    search?: string;
    limit?: number;
  }) {
    const search = input.search?.trim();
    return prisma.order.findMany({
      where: {
        storeId: input.storeId,
        ...(input.statuses ? { status: { in: input.statuses } } : {}),
        ...(search
          ? {
              OR: [
                { customerName: { contains: search, mode: "insensitive" } },
                { customerPhone: { contains: search } },
                { id: { contains: search } },
              ],
            }
          : {}),
        NOT: { status: "pending_payment" },
      },
      include: listInclude,
      orderBy: [{ placedAt: "desc" }, { createdAt: "desc" }],
      take: input.limit ?? 50,
    });
  },

  async countForStore(storeId: string, statuses?: OrderStatus[]) {
    return prisma.order.count({
      where: {
        storeId,
        ...(statuses ? { status: { in: statuses } } : {}),
        NOT: { status: "pending_payment" },
      },
    });
  },

  async createPaidOrder(input: CreateOrderInput) {
    const now = new Date();
    return prisma.order.create({
      data: {
        storeId: input.storeId,
        userId: input.userId ?? null,
        status: "pending_acceptance",
        fulfillmentType: input.fulfillmentType,
        fulfillmentMethod: "unassigned",
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail?.trim().toLowerCase() || null,
        dropoffAddress: input.dropoffAddress ?? null,
        dropoffLat: input.dropoffLat ?? null,
        dropoffLng: input.dropoffLng ?? null,
        notes: input.notes ?? null,
        scheduledFor: input.scheduledFor ?? null,
        subtotalCents: input.subtotalCents,
        tipCents: input.tipCents,
        taxCents: input.taxCents,
        totalCents: input.totalCents,
        currency: input.currency,
        squarePaymentId: input.squarePaymentId,
        placedAt: now,
        lineItems: {
          create: input.lineItems.map((line) => ({
            name: line.name,
            description: line.description,
            unitPriceCents: line.unitPriceCents,
            quantity: line.quantity,
            modifiers: line.modifiers as Prisma.InputJsonValue,
            lineTotalCents: line.lineTotalCents,
            menuItemId: line.menuItemId,
          })),
        },
        events: {
          create: [
            {
              status: "pending_acceptance",
              actor: "system",
              note: input.scheduledFor
                ? `Payment received · Scheduled order`
                : "Payment received via Square",
            },
          ],
        },
      },
      include: orderInclude,
    });
  },

  async transitionStatus(input: {
    orderId: string;
    storeId: string;
    to: OrderStatus;
    actor: string;
    note?: string | null;
  }) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.order.findFirst({
        where: { id: input.orderId, storeId: input.storeId },
      });
      if (!existing) {
        return null;
      }

      await tx.order.update({
        where: { id: existing.id },
        data: { status: input.to },
      });

      await tx.orderEvent.create({
        data: {
          orderId: existing.id,
          status: input.to,
          actor: input.actor,
          note: input.note ?? null,
        },
      });

      return tx.order.findFirstOrThrow({
        where: { id: existing.id },
        include: orderInclude,
      });
    });
  },

  async findByDeliveryId(deliveryId: string) {
    return prisma.order.findUnique({
      where: { deliveryId },
      include: orderInclude,
    });
  },

  async fulfillManual(input: {
    orderId: string;
    storeId: string;
    actor: string;
    note?: string | null;
  }) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.order.findFirst({
        where: { id: input.orderId, storeId: input.storeId },
      });
      if (!existing) {
        return null;
      }

      await tx.order.update({
        where: { id: existing.id },
        data: {
          fulfillmentMethod: "manual",
          manualDeliveryNote: input.note?.trim() || null,
          status: "out_for_delivery",
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId: existing.id,
          status: "out_for_delivery",
          actor: input.actor,
          note: input.note?.trim()
            ? `Manual delivery: ${input.note.trim()}`
            : "Dispatched via manual delivery",
        },
      });

      return tx.order.findFirstOrThrow({
        where: { id: existing.id },
        include: orderInclude,
      });
    });
  },

  async linkDelivergoDelivery(input: {
    orderId: string;
    storeId: string;
    deliveryId: string;
    actor: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.order.findFirst({
        where: { id: input.orderId, storeId: input.storeId },
      });
      if (!existing) {
        return null;
      }

      await tx.order.update({
        where: { id: existing.id },
        data: {
          fulfillmentMethod: "delivergo",
          deliveryId: input.deliveryId,
          status: "out_for_delivery",
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId: existing.id,
          status: "out_for_delivery",
          actor: input.actor,
          note: "Dispatched via deliverGO",
        },
      });

      return tx.order.findFirstOrThrow({
        where: { id: existing.id },
        include: orderInclude,
      });
    });
  },

  async applyLinkedDeliveryStatus(input: {
    orderId: string;
    to: OrderStatus;
    note: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.order.findUnique({ where: { id: input.orderId } });
      if (!existing) {
        return null;
      }
      if (existing.status === input.to) {
        return tx.order.findFirstOrThrow({
          where: { id: existing.id },
          include: orderInclude,
        });
      }
      if (existing.status === "completed" || existing.status === "cancelled") {
        return tx.order.findFirstOrThrow({
          where: { id: existing.id },
          include: orderInclude,
        });
      }

      await tx.order.update({
        where: { id: existing.id },
        data: { status: input.to },
      });
      await tx.orderEvent.create({
        data: {
          orderId: existing.id,
          status: input.to,
          actor: "delivery_webhook",
          note: input.note,
        },
      });

      return tx.order.findFirstOrThrow({
        where: { id: existing.id },
        include: orderInclude,
      });
    });
  },

  async updateStatusBySquarePaymentId(
    squarePaymentId: string,
    status: OrderStatus,
    note: string,
  ) {
    const existing = await prisma.order.findUnique({
      where: { squarePaymentId },
      include: orderInclude,
    });
    if (!existing) {
      return null;
    }
    if (existing.status === status) {
      return existing;
    }

    return prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: existing.id },
        data: { status },
      });
      await tx.orderEvent.create({
        data: {
          orderId: existing.id,
          status,
          actor: "square_webhook",
          note,
        },
      });
      return tx.order.findFirstOrThrow({
        where: { id: existing.id },
        include: orderInclude,
      });
    });
  },
};
