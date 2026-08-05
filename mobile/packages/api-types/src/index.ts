export type OrderStatus =
  | "pending_payment"
  | "pending_acceptance"
  | "accepted"
  | "preparing"
  | "ready"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "completed"
  | "cancelled";

export type FulfillmentType = "pickup" | "delivery";
export type FulfillmentMethod = "unassigned" | "delivergo" | "manual";
export type MobileApp = "staff" | "diner";

export type TransitionAction = {
  to: OrderStatus;
  label: string;
  variant: "primary" | "secondary" | "danger";
};

export type StaffOrderListItem = {
  id: string;
  displayNumber: string | null;
  dayTicket: number | null;
  dayTicketIsToday: boolean;
  status: OrderStatus;
  fulfillmentType: FulfillmentType;
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

export type StaffOrderDetail = StaffOrderListItem & {
  publicToken: string;
  subtotalCents: number;
  taxCents: number;
  lineItems: Array<{
    id: string;
    name: string;
    quantity: number;
    modifiers: Array<{ name: string }>;
    lineTotalCents: number;
  }>;
  events: Array<{
    id: string;
    status: OrderStatus;
    actor: string;
    note: string | null;
    createdAt: string;
  }>;
  allowedActions: TransitionAction[];
  linkedDelivery: {
    id: string;
    status: string;
    providerId: string;
    trackingUrl: string | null;
    feeCents: number | null;
  } | null;
  needsFulfillment: boolean;
};

export type ListStaffOrdersResult = {
  items: StaffOrderListItem[];
  filter: string;
  channel: string;
  search: string;
  pendingAcceptanceCount: number;
  prepMinutes: number;
};

export type PublicOrderView = {
  id: string;
  publicToken: string;
  displayNumber: string | null;
  status: OrderStatus;
  fulfillmentType: FulfillmentType;
  statusMessage: string;
  totalCents: number;
  currency: string;
  placedAt: string | null;
  scheduledFor: string | null;
  storeName: string;
  lineItems: Array<{
    id: string;
    name: string;
    quantity: number;
    lineTotalCents: number;
  }>;
  tracking: { url: string | null } | null;
};

export type CartView = {
  id: string | null;
  storeId: string;
  itemCount: number;
  subtotalCents: number;
  currency: string;
  items: Array<{
    id: string;
    menuItemId: string;
    name: string;
    quantity: number;
    lineTotalCents: number;
    available: boolean;
  }>;
};

export const KITCHEN_BOARD_COLUMNS = [
  { id: "new", title: "New", statuses: ["pending_acceptance"] as const },
  {
    id: "cooking",
    title: "Cooking",
    statuses: ["accepted", "preparing"] as const,
  },
  {
    id: "ready",
    title: "Ready / Out",
    statuses: ["ready", "ready_for_pickup", "out_for_delivery"] as const,
  },
] as const;

export function isKitchenBoardDeferred(
  order: { status: string; scheduledFor: string | null },
  prepMinutes: number,
  nowMs = Date.now(),
): boolean {
  if (order.status !== "pending_acceptance" || !order.scheduledFor) {
    return false;
  }
  const scheduledMs = new Date(order.scheduledFor).getTime();
  if (!Number.isFinite(scheduledMs)) {
    return false;
  }
  return scheduledMs - Math.max(0, prepMinutes) * 60_000 > nowMs;
}

export function formatCadFromCents(cents: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(cents / 100);
}

export const CART_SESSION_HEADER = "x-cart-sid";
