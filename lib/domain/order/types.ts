import type { FulfillmentMethod, OrderStatus } from "@prisma/client";
import type { CartModifierSelection } from "@/lib/domain/cart/types";
import type { TransitionAction } from "@/lib/domain/order/transitions";

export type OrderTotals = {
  subtotalCents: number;
  tipCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
};

export type PublicOrderLineView = {
  id: string;
  name: string;
  description: string | null;
  unitPriceCents: number;
  quantity: number;
  modifiers: CartModifierSelection[];
  lineTotalCents: number;
};

export type OrderEventView = {
  id: string;
  status: OrderStatus;
  actor: string;
  note: string | null;
  createdAt: string;
};

export type PublicOrderView = {
  id: string;
  publicToken: string;
  status: OrderStatus;
  fulfillmentType: "pickup" | "delivery";
  fulfillmentMethod: FulfillmentMethod;
  customerName: string;
  customerPhone: string;
  dropoffAddress: string | null;
  notes: string | null;
  scheduledFor: string | null;
  subtotalCents: number;
  tipCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
  placedAt: string | null;
  createdAt: string;
  storeName: string;
  prepMinutes: number;
  statusMessage: string;
  timeline: {
    cancelled: boolean;
    steps: Array<{
      id: string;
      label: string;
      description: string;
      state: "complete" | "current" | "upcoming";
    }>;
  };
  tracking: {
    url: string | null;
    providerLabel: string | null;
    deliveryStatus: string | null;
  } | null;
  lineItems: PublicOrderLineView[];
  events: Array<{
    id: string;
    status: OrderStatus;
    note: string | null;
    createdAt: string;
  }>;
};

export type StaffOrderListItem = {
  id: string;
  status: OrderStatus;
  fulfillmentType: "pickup" | "delivery";
  fulfillmentMethod: FulfillmentMethod;
  customerName: string;
  customerPhone: string;
  dropoffAddress: string | null;
  notes: string | null;
  scheduledFor: string | null;
  deliveryId: string | null;
  manualDeliveryNote: string | null;
  itemCount: number;
  itemSummary: string;
  tipCents: number;
  totalCents: number;
  currency: string;
  placedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LinkedDeliverySummary = {
  id: string;
  status: string;
  providerId: string;
  trackingUrl: string | null;
  feeCents: number | null;
};

export type StaffOrderDetail = StaffOrderListItem & {
  publicToken: string;
  subtotalCents: number;
  taxCents: number;
  lineItems: PublicOrderLineView[];
  events: OrderEventView[];
  allowedActions: TransitionAction[];
  linkedDelivery: LinkedDeliverySummary | null;
  needsFulfillment: boolean;
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  pending_acceptance: "Sent to restaurant",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready",
  ready_for_pickup: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  completed: "Completed",
  cancelled: "Cancelled",
};

const ORDER_STATUS_LABEL_BY_STATUS = new Map<OrderStatus, string>(
  Object.entries(ORDER_STATUS_LABELS) as [OrderStatus, string][],
);

/** Safe label lookup — avoids bracket access on user-influenced status keys. */
export function getOrderStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS_LABEL_BY_STATUS.get(status) ?? "Unknown";
}

/** Staff-facing short labels for board columns / badges. */
export const STAFF_ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  ...ORDER_STATUS_LABELS,
  pending_acceptance: "Needs accept",
};
