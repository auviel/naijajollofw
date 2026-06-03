import type { DeliveryProviderId } from "@/lib/domain/delivery/types";

export type WhatsAppConversationState =
  | "idle"
  | "awaiting_confirm"
  | "awaiting_customer_pick"
  | "awaiting_address_pick"
  | "awaiting_provider_pick";

export type WhatsAppAddressOption = {
  id: string;
  formatted: string;
};

export type WhatsAppCustomerOption = {
  id: string;
  name: string;
  phone: string;
  address: string;
};

export type WhatsAppProviderOption = {
  providerId: DeliveryProviderId;
  quoteId: string;
  feeCents: number;
  currency: string;
  dropoffEta?: string;
  label: string;
};

export type WhatsAppSessionPayload = {
  customerId?: string;
  customerName?: string;
  dropoffPhone?: string;
  dropoffAddress?: string;
  customerOptions?: WhatsAppCustomerOption[];
  addressOptions?: WhatsAppAddressOption[];
  quoteId?: string;
  providerId?: DeliveryProviderId;
  feeCents?: number;
  currency?: string;
  dropoffEta?: string;
  providerOptions?: WhatsAppProviderOption[];
};

export const WHATSAPP_CONVERSATION_TTL_MS = 30 * 60 * 1000;

export type ParsedWhatsAppCommand =
  | { type: "help" }
  | { type: "cancel" }
  | { type: "yes" }
  | { type: "pick"; index: number }
  | { type: "customer_name"; name: string }
  | { type: "ping" }
  | { type: "unknown"; text: string };

export function parseWhatsAppCommand(rawText: string): ParsedWhatsAppCommand {
  const text = rawText.trim();
  const normalized = text.toLowerCase();

  if (!text) {
    return { type: "unknown", text };
  }

  if (normalized === "help" || normalized === "?") {
    return { type: "help" };
  }

  if (normalized === "cancel" || normalized === "no") {
    return { type: "cancel" };
  }

  if (normalized === "yes" || normalized === "y") {
    return { type: "yes" };
  }

  if (normalized === "ping") {
    return { type: "ping" };
  }

  const pickMatch = normalized.match(/^(\d+)$/);
  if (pickMatch) {
    return { type: "pick", index: Number.parseInt(pickMatch[1]!, 10) };
  }

  const sendMatch = text.match(/^send\s+(.+)$/i);
  if (sendMatch?.[1]?.trim()) {
    return { type: "customer_name", name: sendMatch[1].trim() };
  }

  return { type: "customer_name", name: text };
}

export function formatFee(feeCents: number, currency: string): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(feeCents / 100);
}

export function formatEta(iso?: string): string | null {
  if (!iso) {
    return null;
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function buildHelpMessage(): string {
  return [
    "deliverGO dispatch",
    "",
    "Send a customer name to quote a delivery.",
    "Reply YES to confirm.",
    "",
    "Commands:",
    "HELP — this message",
    "CANCEL — reset",
    "PING — check bot is live",
  ].join("\n");
}

export function buildUnauthorizedMessage(): string {
  return "This number is not authorized to dispatch for this store.";
}

export function buildWhatsAppDisabledMessage(): string {
  return "WhatsApp dispatch is not enabled for this store.";
}
