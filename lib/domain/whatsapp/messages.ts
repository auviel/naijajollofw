import { formatFee, formatEta } from "@/lib/domain/whatsapp/types";

export function buildHelpMessage(): string {
  return [
    "Courier dispatch",
    "• Customer name → quote → Send",
    "• NEW (any case) or 3 lines: name / phone / address",
    "• NEW Name, phone, address (comma, |, or line breaks)",
    "• HELP · CANCEL · PING",
  ].join("\n");
}

export function buildUnauthorizedMessage(): string {
  return "This number is not authorized to dispatch for this store.";
}

export function buildQuoteMessage(input: {
  customerName: string;
  dropoffAddress: string;
  providerLabel: string;
  feeCents: number;
  currency: string;
  dropoffEta?: string;
}): string {
  const eta = formatEta(input.dropoffEta);
  const etaLine = eta ? ` · ~${eta}` : "";

  return [
    `📦 ${input.customerName}`,
    `📍 ${input.dropoffAddress}`,
    `🚗 ${input.providerLabel} · ${formatFee(input.feeCents, input.currency)}${etaLine}`,
    "",
    "Tap Send or reply YES",
  ].join("\n");
}

export function buildSentMessage(input: {
  customerName: string;
  dropoffAddress: string;
  trackingUrl?: string;
}): string {
  const lines = [
    "✅ Sent",
    `📦 ${input.customerName}`,
    `📍 ${input.dropoffAddress}`,
  ];

  if (input.trackingUrl) {
    lines.push(`Track: ${input.trackingUrl}`);
  }

  return lines.join("\n");
}

export function buildNewCustomerNamePrompt(name?: string): string {
  if (name) {
    return `📋 New customer: ${name}\nWhat's their phone? (Canadian)`;
  }

  return "📋 New customer\nWhat's their name?";
}

export function buildNewCustomerPhonePrompt(name: string): string {
  return `📋 ${name}\nWhat's their phone? (Canadian)`;
}

export function buildNewCustomerAddressPrompt(name: string): string {
  return `📋 ${name}\nWhat's the dropoff address?`;
}

export function buildCustomerNotFoundMessage(query: string): string {
  return `No customer "${query}".\nReply NEW to add them, or try a different name.`;
}

export function buildCustomerSuggestionMessage(name: string): string {
  return `Did you mean ${name}?\nSend their full name, or NEW to add someone.`;
}

export function buildExistingCustomerUpdatedMessage(name: string): string {
  return `Using ${name} — details updated if needed.`;
}

export function buildProviderPickBody(): string {
  return "Choose a carrier:";
}

export function buildCustomerPickBody(): string {
  return "Multiple customers matched. Pick one:";
}

export function buildAddressPickBody(customerName: string): string {
  return `${customerName} has multiple addresses. Pick one:`;
}
