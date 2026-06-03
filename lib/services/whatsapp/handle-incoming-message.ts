import { getRecommendedQuote } from "@/lib/domain/delivery/compare-quotes";
import { DELIVERY_PROVIDER_LABELS } from "@/lib/domain/delivery/types";
import {
  buildHelpMessage,
  buildUnauthorizedMessage,
  buildWhatsAppDisabledMessage,
  formatEta,
  formatFee,
  parseWhatsAppCommand,
  type WhatsAppProviderOption,
  type WhatsAppSessionPayload,
} from "@/lib/domain/whatsapp/types";
import { sendTextMessage } from "@/lib/integrations/whatsapp/client";
import { createDeliveryForStore } from "@/lib/services/delivery/create-delivery";
import { createQuoteForStore } from "@/lib/services/delivery/create-quote";
import { lookupCustomerForWhatsApp } from "@/lib/services/whatsapp/lookup-customer";
import { isAppError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

type HandleIncomingMessageInput = {
  storeId: string;
  staffPhoneE164: string;
  text: string;
  phoneNumberId: string;
  isStaffAllowed: boolean;
  whatsappEnabled: boolean;
  getConversation: () => Promise<{
    state: string;
    payload: WhatsAppSessionPayload;
  } | null>;
  saveConversation: (input: {
    state:
      | "idle"
      | "awaiting_confirm"
      | "awaiting_customer_pick"
      | "awaiting_address_pick"
      | "awaiting_provider_pick";
    payload: WhatsAppSessionPayload;
  }) => Promise<void>;
  clearConversation: () => Promise<void>;
};

async function reply(to: string, body: string, phoneNumberId: string) {
  await sendTextMessage({ to, body, phoneNumberId });
}

function buildQuoteMessage(input: {
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
    input.customerName,
    input.dropoffAddress,
    `${input.providerLabel} — ${formatFee(input.feeCents, input.currency)}${etaLine}`,
    "Reply YES to send",
  ].join("\n");
}

function buildProviderPickMessage(options: WhatsAppProviderOption[]): string {
  const lines = options.map(
    (option, index) =>
      `${index + 1}. ${option.label} — ${formatFee(option.feeCents, option.currency)}`,
  );

  return ["Choose a carrier:", ...lines, "Reply with the number."].join("\n");
}

function buildAddressPickMessage(customerName: string, options: Array<{ formatted: string }>): string {
  const lines = options.map((option, index) => `${index + 1}. ${option.formatted}`);
  return [`${customerName} has multiple addresses:`, ...lines, "Reply with the number."].join("\n");
}

function buildCustomerPickMessage(
  options: Array<{ name: string; phone: string; address: string }>,
): string {
  const lines = options.map(
    (option, index) => `${index + 1}. ${option.name} · ${option.phone} · ${option.address}`,
  );
  return ["Multiple customers matched:", ...lines, "Reply with the number."].join("\n");
}

async function startQuoteFlow(
  input: HandleIncomingMessageInput,
  payload: WhatsAppSessionPayload,
) {
  if (!payload.customerName || !payload.dropoffPhone || !payload.dropoffAddress) {
    await reply(
      input.staffPhoneE164,
      "Missing customer details. Send a customer name to start again.",
      input.phoneNumberId,
    );
    await input.clearConversation();
    return;
  }

  try {
    const quoteResult = await createQuoteForStore(input.storeId, {
      dropoffName: payload.customerName,
      dropoffPhone: payload.dropoffPhone,
      dropoffAddress: payload.dropoffAddress,
    });

    if (quoteResult.quotes.length === 1) {
      const quote = quoteResult.quotes[0]!;
      const nextPayload: WhatsAppSessionPayload = {
        ...payload,
        quoteId: quote.id,
        providerId: quote.providerId,
        feeCents: quote.feeCents,
        currency: quote.currency,
        dropoffEta: quote.dropoffEta?.toISOString(),
      };

      await input.saveConversation({
        state: "awaiting_confirm",
        payload: nextPayload,
      });

      await reply(
        input.staffPhoneE164,
        buildQuoteMessage({
          customerName: payload.customerName,
          dropoffAddress: payload.dropoffAddress,
          providerLabel: DELIVERY_PROVIDER_LABELS[quote.providerId],
          feeCents: quote.feeCents,
          currency: quote.currency,
          dropoffEta: quote.dropoffEta?.toISOString(),
        }),
        input.phoneNumberId,
      );
      return;
    }

    const providerOptions: WhatsAppProviderOption[] = quoteResult.quotes.map((quote) => ({
      providerId: quote.providerId,
      quoteId: quote.id,
      feeCents: quote.feeCents,
      currency: quote.currency,
      dropoffEta: quote.dropoffEta?.toISOString(),
      label: DELIVERY_PROVIDER_LABELS[quote.providerId],
    }));

    const recommended = getRecommendedQuote(quoteResult.quotes);
    const nextPayload: WhatsAppSessionPayload = {
      ...payload,
      providerOptions,
      quoteId: recommended?.id,
      providerId: recommended?.providerId,
      feeCents: recommended?.feeCents,
      currency: recommended?.currency,
      dropoffEta: recommended?.dropoffEta?.toISOString(),
    };

    await input.saveConversation({
      state: "awaiting_provider_pick",
      payload: nextPayload,
    });

    await reply(
      input.staffPhoneE164,
      buildProviderPickMessage(providerOptions),
      input.phoneNumberId,
    );
  } catch (error) {
    const message = isAppError(error)
      ? error.message
      : "Unable to get a quote right now. Try again shortly.";
    await reply(input.staffPhoneE164, message, input.phoneNumberId);
    await input.clearConversation();
  }
}

export async function handleIncomingWhatsAppMessage(
  input: HandleIncomingMessageInput,
): Promise<void> {
  if (!input.whatsappEnabled) {
    await reply(input.staffPhoneE164, buildWhatsAppDisabledMessage(), input.phoneNumberId);
    return;
  }

  if (!input.isStaffAllowed) {
    await reply(input.staffPhoneE164, buildUnauthorizedMessage(), input.phoneNumberId);
    return;
  }

  const command = parseWhatsAppCommand(input.text);
  const conversation = await input.getConversation();
  const payload = conversation?.payload ?? {};

  if (command.type === "help") {
    await reply(input.staffPhoneE164, buildHelpMessage(), input.phoneNumberId);
    return;
  }

  if (command.type === "ping") {
    await reply(input.staffPhoneE164, "pong", input.phoneNumberId);
    return;
  }

  if (command.type === "cancel") {
    await input.clearConversation();
    await reply(input.staffPhoneE164, "Cancelled.", input.phoneNumberId);
    return;
  }

  if (conversation?.state === "awaiting_confirm" && command.type === "yes") {
    if (!payload.quoteId || !payload.providerId || !payload.customerName || !payload.dropoffPhone || !payload.dropoffAddress) {
      await reply(
        input.staffPhoneE164,
        "That quote expired. Send the customer name again.",
        input.phoneNumberId,
      );
      await input.clearConversation();
      return;
    }

    try {
      const delivery = await createDeliveryForStore(
        input.storeId,
        {
          providerId: payload.providerId,
          quoteId: payload.quoteId,
          dropoffName: payload.customerName,
          dropoffPhone: payload.dropoffPhone,
          dropoffAddress: payload.dropoffAddress,
          proofOfDelivery: {
            signature: false,
            picture: true,
            pincode: true,
          },
        },
        { source: "whatsapp" },
      );

      await input.clearConversation();

      const lines = ["Sent ✓", `Ref: ${delivery.externalId}`];
      if (delivery.trackingUrl) {
        lines.push(`Track: ${delivery.trackingUrl}`);
      }

      await reply(input.staffPhoneE164, lines.join("\n"), input.phoneNumberId);
    } catch (error) {
      const message = isAppError(error)
        ? error.message
        : "Unable to create the delivery. Try quoting again.";
      await reply(input.staffPhoneE164, message, input.phoneNumberId);
      await input.clearConversation();
    }

    return;
  }

  if (conversation?.state === "awaiting_address_pick" && command.type === "pick") {
    const address = payload.addressOptions?.[command.index - 1];
    if (!address || !payload.customerId) {
      await reply(
        input.staffPhoneE164,
        "Invalid option. Reply with the number from the list or CANCEL.",
        input.phoneNumberId,
      );
      return;
    }

    const lookup = await lookupCustomerForWhatsApp({
      storeId: input.storeId,
      query: payload.customerName ?? "",
      customerId: payload.customerId,
      addressId: address.id,
    });

    if (lookup.type !== "ready") {
      await reply(
        input.staffPhoneE164,
        "Unable to use that address. Send the customer name again.",
        input.phoneNumberId,
      );
      await input.clearConversation();
      return;
    }

    const nextPayload: WhatsAppSessionPayload = {
      customerId: lookup.customer.id,
      customerName: lookup.customer.name,
      dropoffPhone: lookup.dropoffPhone,
      dropoffAddress: lookup.dropoffAddress,
    };

    await input.saveConversation({ state: "idle", payload: nextPayload });
    await startQuoteFlow(input, nextPayload);
    return;
  }

  if (conversation?.state === "awaiting_customer_pick" && command.type === "pick") {
    const customer = payload.customerOptions?.[command.index - 1];
    if (!customer) {
      await reply(
        input.staffPhoneE164,
        "Invalid option. Reply with the number from the list or CANCEL.",
        input.phoneNumberId,
      );
      return;
    }

    const lookup = await lookupCustomerForWhatsApp({
      storeId: input.storeId,
      query: customer.name,
      customerId: customer.id,
    });

    if (lookup.type === "multiple_addresses") {
      await input.saveConversation({
        state: "awaiting_address_pick",
        payload: {
          customerId: lookup.customer.id,
          customerName: lookup.customer.name,
          dropoffPhone: lookup.dropoffPhone,
          addressOptions: lookup.addressOptions,
        },
      });

      await reply(
        input.staffPhoneE164,
        buildAddressPickMessage(lookup.customer.name, lookup.addressOptions),
        input.phoneNumberId,
      );
      return;
    }

    if (lookup.type !== "ready") {
      await reply(
        input.staffPhoneE164,
        "Unable to use that customer. Send the customer name again.",
        input.phoneNumberId,
      );
      await input.clearConversation();
      return;
    }

    const nextPayload: WhatsAppSessionPayload = {
      customerId: lookup.customer.id,
      customerName: lookup.customer.name,
      dropoffPhone: lookup.dropoffPhone,
      dropoffAddress: lookup.dropoffAddress,
    };

    await input.saveConversation({ state: "idle", payload: nextPayload });
    await startQuoteFlow(input, nextPayload);
    return;
  }

  if (conversation?.state === "awaiting_provider_pick" && command.type === "pick") {
    const option = payload.providerOptions?.[command.index - 1];
    if (!option) {
      await reply(
        input.staffPhoneE164,
        "Invalid option. Reply with the number from the list or CANCEL.",
        input.phoneNumberId,
      );
      return;
    }

    const nextPayload: WhatsAppSessionPayload = {
      ...payload,
      quoteId: option.quoteId,
      providerId: option.providerId,
      feeCents: option.feeCents,
      currency: option.currency,
      dropoffEta: option.dropoffEta,
    };

    await input.saveConversation({
      state: "awaiting_confirm",
      payload: nextPayload,
    });

    await reply(
      input.staffPhoneE164,
      buildQuoteMessage({
        customerName: payload.customerName ?? "Customer",
        dropoffAddress: payload.dropoffAddress ?? "",
        providerLabel: option.label,
        feeCents: option.feeCents,
        currency: option.currency,
        dropoffEta: option.dropoffEta,
      }),
      input.phoneNumberId,
    );
    return;
  }

  if (command.type === "customer_name") {
    const lookup = await lookupCustomerForWhatsApp({
      storeId: input.storeId,
      query: command.name,
      customerId: payload.customerId,
    });

    if (lookup.type === "not_found") {
      await reply(
        input.staffPhoneE164,
        `No customer found for "${lookup.query}". Add them in the dashboard first.`,
        input.phoneNumberId,
      );
      await input.clearConversation();
      return;
    }

    if (lookup.type === "incomplete") {
      await reply(
        input.staffPhoneE164,
        `${lookup.customerName}: ${lookup.reason}`,
        input.phoneNumberId,
      );
      await input.clearConversation();
      return;
    }

    if (lookup.type === "multiple_customers") {
      await input.saveConversation({
        state: "awaiting_customer_pick",
        payload: {
          customerName: command.name,
          customerOptions: lookup.options,
        },
      });

      await reply(
        input.staffPhoneE164,
        buildCustomerPickMessage(lookup.options),
        input.phoneNumberId,
      );
      return;
    }

    if (lookup.type === "multiple_addresses") {
      await input.saveConversation({
        state: "awaiting_address_pick",
        payload: {
          customerId: lookup.customer.id,
          customerName: lookup.customer.name,
          dropoffPhone: lookup.dropoffPhone,
          addressOptions: lookup.addressOptions,
        },
      });

      await reply(
        input.staffPhoneE164,
        buildAddressPickMessage(lookup.customer.name, lookup.addressOptions),
        input.phoneNumberId,
      );
      return;
    }

    const nextPayload: WhatsAppSessionPayload = {
      customerId: lookup.customer.id,
      customerName: lookup.customer.name,
      dropoffPhone: lookup.dropoffPhone,
      dropoffAddress: lookup.dropoffAddress,
    };

    await input.saveConversation({ state: "idle", payload: nextPayload });
    await startQuoteFlow(input, nextPayload);
    return;
  }

  if (conversation?.state === "awaiting_confirm") {
    await reply(
      input.staffPhoneE164,
      "Reply YES to send this delivery or CANCEL to reset.",
      input.phoneNumberId,
    );
    return;
  }

  if (command.type === "unknown") {
    await reply(
      input.staffPhoneE164,
      "Send a customer name to quote, or reply HELP.",
      input.phoneNumberId,
    );
  }
}

export async function handleIncomingWhatsAppMessageSafe(
  input: HandleIncomingMessageInput,
): Promise<void> {
  try {
    await handleIncomingWhatsAppMessage(input);
  } catch (error) {
    logger.error("whatsapp.message.failed", {
      storeId: input.storeId,
      error: error instanceof Error ? error.message : String(error),
    });

    await reply(
      input.staffPhoneE164,
      "Something went wrong. Try again or send HELP.",
      input.phoneNumberId,
    );
  }
}
