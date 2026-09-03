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
  thumbImageUrls: string[];
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
    imageUrl: string | null;
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
  subtotalCents?: number;
  tipCents?: number;
  taxCents?: number;
  totalCents: number;
  currency: string;
  placedAt: string | null;
  scheduledFor: string | null;
  notes?: string | null;
  storeName: string;
  timeline?: {
    cancelled: boolean;
    steps: Array<{
      id: string;
      label: string;
      description: string;
      state: "complete" | "current" | "upcoming";
    }>;
  };
  lineItems: Array<{
    id: string;
    name: string;
    quantity: number;
    lineTotalCents: number;
    modifiers?: Array<{ name: string }>;
  }>;
  tracking: { url: string | null; providerLabel?: string | null } | null;
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
  modifiers: Array<{
    groupId: string;
    groupName: string;
    modifierId: string;
    name: string;
    priceDeltaCents: number;
  }>;
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

export type DinerMe = {
  id: string;
  email: string;
  name: string;
  phoneE164: string | null;
  storeId: string;
  storeName: string;
  emailVerified: boolean;
};

export type StoreOpenStatus = {
  isOpen: boolean;
  alwaysOpen: boolean;
  timezone: string;
  message: string;
  todayLabel: string;
  nextOpenAt: string | null;
  nextOpenLabel: string | null;
};

export type CheckoutScheduleOption = {
  dateKey: string;
  dayOfWeek: number;
  label: string;
  shortLabel: string;
  slots: Array<{ startAt: string; label: string }>;
};

export type CheckoutConfig = {
  configured: boolean;
  simulatePayments: boolean;
  applicationId: string | null;
  locationId: string | null;
  environment: "sandbox" | "production";
  taxRateBps: number;
  cart: CartView;
  preview: {
    subtotalCents: number;
    tipCents: number;
    taxCents: number;
    totalCents: number;
    currency: string;
  };
  openStatus: StoreOpenStatus;
  schedule: {
    timeZone: string;
    options: CheckoutScheduleOption[];
  };
  mobilePayments: { sourceIdFromInAppSdk: boolean; currency: string };
};

export type MobilePublicConfig = {
  turnstileSiteKey: string | null;
  turnstileEnabled: boolean;
};

export type LoginChallenge = {
  requiresTurnstile: boolean;
  ipBlocked: boolean;
  failures: number;
  turnstileSiteKey: string | null;
};

export type AddressSuggestion = {
  id: string;
  label: string;
};

export type GeocodedAddress = {
  address: {
    line1: string;
    line2?: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
    latitude: number;
    longitude: number;
    formatted: string;
  };
  relevance: number;
  confidence: "high" | "medium" | "low";
  preview: string;
};

export type DinerAddress = {
  id: string;
  line1: string;
  line2: string | null;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  formatted: string;
  label: string | null;
  isDefault: boolean;
};

export type SavedCard = {
  id: string;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  cardholderName: string | null;
};

export type DinerPaymentState = {
  available: boolean;
  cards: SavedCard[];
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
