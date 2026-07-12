import { getRecommendedQuote } from "@/lib/domain/delivery/compare-quotes";
import { getDeliveryProviderLabel } from "@/lib/domain/delivery/types";
import {
  parseInteractiveSelection,
  parseWhatsAppCommand,
  type ParsedWhatsAppCommand,
} from "@/lib/domain/whatsapp/commands";
import {
  buildAddressPickBody,
  buildCustomerNotFoundMessage,
  buildCustomerPickBody,
  buildExistingCustomerUpdatedMessage,
  buildHelpMessage,
  buildNewCustomerAddressPrompt,
  buildNewCustomerNamePrompt,
  buildNewCustomerPhonePrompt,
  buildProviderPickBody,
  buildQuoteMessage,
  buildSentMessage,
  buildUnauthorizedMessage,
} from "@/lib/domain/whatsapp/messages";
import type {
  WhatsAppConversationState,
  WhatsAppProviderOption,
  WhatsAppSessionPayload,
} from "@/lib/domain/whatsapp/types";
import { formatFee } from "@/lib/domain/whatsapp/types";
import { isWhatsAppEnabled } from "@/lib/integrations/whatsapp/config";
import {
  sendListMessage,
  sendReplyButtons,
  sendTextMessage,
} from "@/lib/integrations/whatsapp/client";
import { createDeliveryForStore } from "@/lib/services/delivery/create-delivery";
import { createQuoteForStore } from "@/lib/services/delivery/create-quote";
import { lookupCustomerForWhatsApp } from "@/lib/services/whatsapp/lookup-customer";
import { resolveNewCustomerForWhatsApp } from "@/lib/services/whatsapp/resolve-new-customer";
import { isAppError } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";
import { normalizeCanadianPhone } from "@/lib/utils/phone";

export type WhatsAppIncomingContent =
  | { kind: "text"; text: string }
  | { kind: "interactive"; interactiveId: string; interactiveTitle: string };

type HandleIncomingMessageInput = {
  storeId: string;
  staffPhoneE164: string;
  message: WhatsAppIncomingContent;
  phoneNumberId: string;
  isStaffAllowed: boolean;
  getConversation: () => Promise<{
    state: WhatsAppConversationState;
    payload: WhatsAppSessionPayload;
  } | null>;
  saveConversation: (input: {
    state: WhatsAppConversationState;
    payload: WhatsAppSessionPayload;
  }) => Promise<void>;
  clearConversation: () => Promise<void>;
};

const WIZARD_STATES = new Set<WhatsAppConversationState>([
  "awaiting_new_name",
  "awaiting_new_phone",
  "awaiting_new_address",
]);

async function replyText(to: string, body: string, phoneNumberId: string) {
  await sendTextMessage({ to, body, phoneNumberId });
}

async function replyConfirmQuote(
  to: string,
  body: string,
  phoneNumberId: string,
) {
  try {
    await sendReplyButtons({
      to,
      phoneNumberId,
      body,
      buttons: [
        { id: "send", title: "Send" },
        { id: "cancel", title: "Cancel" },
      ],
    });
  } catch {
    await replyText(to, body, phoneNumberId);
  }
}

function resolveCommand(
  message: WhatsAppIncomingContent,
  wizardActive: boolean,
): ParsedWhatsAppCommand {
  if (message.kind === "interactive") {
    return parseInteractiveSelection(message.interactiveId);
  }

  return parseWhatsAppCommand(message.text, { wizardActive });
}

async function sendCustomerPickList(
  input: HandleIncomingMessageInput,
  options: Array<{ id: string; name: string; phone: string; address: string }>,
) {
  try {
    await sendListMessage({
      to: input.staffPhoneE164,
      phoneNumberId: input.phoneNumberId,
      body: buildCustomerPickBody(),
      buttonLabel: "Pick customer",
      sectionTitle: "Customers",
      rows: options.map((option) => ({
        id: `cust:${option.id}`,
        title: option.name.slice(0, 24),
        description: `${option.phone} · ${option.address}`.slice(0, 72),
      })),
    });
  } catch {
    const lines = options.map(
      (option, index) => `${index + 1}. ${option.name} · ${option.phone}`,
    );
    await replyText(
      input.staffPhoneE164,
      [buildCustomerPickBody(), ...lines, "Reply with the number."].join("\n"),
      input.phoneNumberId,
    );
  }
}

async function sendAddressPickList(
  input: HandleIncomingMessageInput,
  customerName: string,
  options: Array<{ id: string; formatted: string }>,
) {
  try {
    await sendListMessage({
      to: input.staffPhoneE164,
      phoneNumberId: input.phoneNumberId,
      body: buildAddressPickBody(customerName),
      buttonLabel: "Pick address",
      sectionTitle: "Addresses",
      rows: options.map((option) => ({
        id: `addr:${option.id}`,
        title: option.formatted.slice(0, 24),
        description: option.formatted.slice(0, 72),
      })),
    });
  } catch {
    const lines = options.map((option, index) => `${index + 1}. ${option.formatted}`);
    await replyText(
      input.staffPhoneE164,
      [buildAddressPickBody(customerName), ...lines, "Reply with the number."].join("\n"),
      input.phoneNumberId,
    );
  }
}

async function sendProviderPickList(
  input: HandleIncomingMessageInput,
  options: WhatsAppProviderOption[],
) {
  try {
    await sendListMessage({
      to: input.staffPhoneE164,
      phoneNumberId: input.phoneNumberId,
      body: buildProviderPickBody(),
      buttonLabel: "Pick carrier",
      sectionTitle: "Carriers",
      rows: options.map((option, index) => ({
        id: `prov:${index}`,
        title: option.label.slice(0, 24),
        description: formatFee(option.feeCents, option.currency).slice(0, 72),
      })),
    });
  } catch {
    const lines = options.map(
      (option, index) =>
        `${index + 1}. ${option.label} — ${(option.feeCents / 100).toFixed(2)} ${option.currency}`,
    );
    await replyText(
      input.staffPhoneE164,
      [buildProviderPickBody(), ...lines, "Reply with the number."].join("\n"),
      input.phoneNumberId,
    );
  }
}

async function startQuoteFlow(
  input: HandleIncomingMessageInput,
  payload: WhatsAppSessionPayload,
  options?: { prefixMessage?: string },
) {
  if (!payload.customerName || !payload.dropoffPhone || !payload.dropoffAddress) {
    await replyText(
      input.staffPhoneE164,
      "Missing customer details. Send a name or NEW to start again.",
      input.phoneNumberId,
    );
    await input.clearConversation();
    return;
  }

  try {
    if (options?.prefixMessage) {
      await replyText(input.staffPhoneE164, options.prefixMessage, input.phoneNumberId);
    }

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

      await replyConfirmQuote(
        input.staffPhoneE164,
        buildQuoteMessage({
          customerName: payload.customerName,
          dropoffAddress: payload.dropoffAddress,
          providerLabel: getDeliveryProviderLabel(quote.providerId),
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
      label: getDeliveryProviderLabel(quote.providerId),
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

    await sendProviderPickList(input, providerOptions);
  } catch (error) {
    const message = isAppError(error)
      ? error.message
      : "Unable to get a quote right now. Try again shortly.";
    await replyText(input.staffPhoneE164, message, input.phoneNumberId);
    await input.clearConversation();
  }
}

async function resolveAndQuoteNewCustomer(
  input: HandleIncomingMessageInput,
  fields: { name: string; phone: string; address: string },
) {
  const resolved = await resolveNewCustomerForWhatsApp({
    storeId: input.storeId,
    name: fields.name,
    phone: fields.phone,
    addressQuery: fields.address,
  });

  if (!resolved.ok) {
    await replyText(input.staffPhoneE164, resolved.error, input.phoneNumberId);
    await input.clearConversation();
    return;
  }

  const nextPayload: WhatsAppSessionPayload = {
    customerId: resolved.data.customerId,
    customerName: resolved.data.customerName,
    dropoffPhone: resolved.data.dropoffPhone,
    dropoffAddress: resolved.data.dropoffAddress,
  };

  await input.saveConversation({ state: "idle", payload: nextPayload });
  await startQuoteFlow(input, nextPayload, {
    prefixMessage: buildExistingCustomerUpdatedMessage(resolved.data.customerName),
  });
}

async function handleConfirm(
  input: HandleIncomingMessageInput,
  payload: WhatsAppSessionPayload,
) {
  if (
    !payload.quoteId ||
    !payload.providerId ||
    !payload.customerName ||
    !payload.dropoffPhone ||
    !payload.dropoffAddress
  ) {
    await replyText(
      input.staffPhoneE164,
      "That quote expired. Send the customer name or NEW to start again.",
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
    await replyText(
      input.staffPhoneE164,
      buildSentMessage({
        customerName: payload.customerName,
        dropoffAddress: payload.dropoffAddress,
        trackingUrl: delivery.trackingUrl,
      }),
      input.phoneNumberId,
    );
  } catch (error) {
    const message = isAppError(error)
      ? error.message
      : "Unable to create the delivery. Try quoting again.";
    await replyText(input.staffPhoneE164, message, input.phoneNumberId);
    await input.clearConversation();
  }
}

async function handleCustomerLookup(
  input: HandleIncomingMessageInput,
  query: string,
  customerId?: string,
) {
  const lookup = await lookupCustomerForWhatsApp({
    storeId: input.storeId,
    query,
    customerId,
  });

  if (lookup.type === "not_found") {
    await replyText(
      input.staffPhoneE164,
      buildCustomerNotFoundMessage(lookup.query),
      input.phoneNumberId,
    );
    await input.clearConversation();
    return;
  }

  if (lookup.type === "incomplete") {
    await replyText(
      input.staffPhoneE164,
      `${lookup.customerName}: ${lookup.reason}\nReply NEW to add details.`,
      input.phoneNumberId,
    );
    await input.clearConversation();
    return;
  }

  if (lookup.type === "multiple_customers") {
    await input.saveConversation({
      state: "awaiting_customer_pick",
      payload: {
        customerName: query,
        customerOptions: lookup.options,
      },
    });
    await sendCustomerPickList(input, lookup.options);
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
    await sendAddressPickList(input, lookup.customer.name, lookup.addressOptions);
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
}

export async function handleIncomingWhatsAppMessage(
  input: HandleIncomingMessageInput,
): Promise<void> {
  if (!isWhatsAppEnabled()) {
    return;
  }

  if (!input.isStaffAllowed) {
    await replyText(input.staffPhoneE164, buildUnauthorizedMessage(), input.phoneNumberId);
    return;
  }

  const conversation = await input.getConversation();
  const payload = conversation?.payload ?? {};
  const state = conversation?.state ?? "idle";
  const wizardActive = WIZARD_STATES.has(state);
  const command = resolveCommand(input.message, wizardActive);

  if (command.type === "help") {
    await replyText(input.staffPhoneE164, buildHelpMessage(), input.phoneNumberId);
    return;
  }

  if (command.type === "ping") {
    await replyText(input.staffPhoneE164, "pong", input.phoneNumberId);
    return;
  }

  if (command.type === "cancel") {
    await input.clearConversation();
    await replyText(input.staffPhoneE164, "Cancelled.", input.phoneNumberId);
    return;
  }

  if (state === "awaiting_new_name" && command.type === "wizard_input") {
    const name = command.text.trim();
    if (!name) {
      await replyText(input.staffPhoneE164, buildNewCustomerNamePrompt(), input.phoneNumberId);
      return;
    }

    await input.saveConversation({
      state: "awaiting_new_phone",
      payload: { pendingNewName: name },
    });
    await replyText(
      input.staffPhoneE164,
      buildNewCustomerPhonePrompt(name),
      input.phoneNumberId,
    );
    return;
  }

  if (state === "awaiting_new_phone" && command.type === "wizard_input") {
    const phone = normalizeCanadianPhone(command.text);
    if (!phone || !payload.pendingNewName) {
      await replyText(
        input.staffPhoneE164,
        "Enter a valid Canadian phone number.",
        input.phoneNumberId,
      );
      return;
    }

    await input.saveConversation({
      state: "awaiting_new_address",
      payload: {
        pendingNewName: payload.pendingNewName,
        pendingNewPhone: phone,
      },
    });
    await replyText(
      input.staffPhoneE164,
      buildNewCustomerAddressPrompt(payload.pendingNewName),
      input.phoneNumberId,
    );
    return;
  }

  if (state === "awaiting_new_address" && command.type === "wizard_input") {
    if (!payload.pendingNewName || !payload.pendingNewPhone) {
      await input.clearConversation();
      await replyText(input.staffPhoneE164, "Session expired. Send NEW to start again.", input.phoneNumberId);
      return;
    }

    await resolveAndQuoteNewCustomer(input, {
      name: payload.pendingNewName,
      phone: payload.pendingNewPhone,
      address: command.text.trim(),
    });
    return;
  }

  if (state === "awaiting_confirm" && command.type === "yes") {
    await handleConfirm(input, payload);
    return;
  }

  if (state === "awaiting_address_pick") {
    let addressId: string | undefined;

    if (command.type === "pick") {
      const index = command.index - 1;
      addressId = index >= 0 ? payload.addressOptions?.at(index)?.id : undefined;
    } else if (
      command.type === "interactive" &&
      command.id.toLowerCase().startsWith("addr:")
    ) {
      addressId = command.id.slice("addr:".length);
    }

    if (!addressId || !payload.customerId) {
      await replyText(
        input.staffPhoneE164,
        "Invalid option. Pick from the list or send CANCEL.",
        input.phoneNumberId,
      );
      return;
    }

    const lookup = await lookupCustomerForWhatsApp({
      storeId: input.storeId,
      query: payload.customerName ?? "",
      customerId: payload.customerId,
      addressId,
    });

    if (lookup.type !== "ready") {
      await replyText(
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

  if (state === "awaiting_customer_pick") {
    let customerId: string | undefined;

    if (command.type === "pick") {
      const index = command.index - 1;
      customerId = index >= 0 ? payload.customerOptions?.at(index)?.id : undefined;
    } else if (
      command.type === "interactive" &&
      command.id.toLowerCase().startsWith("cust:")
    ) {
      customerId = command.id.slice("cust:".length);
    }

    if (!customerId) {
      await replyText(
        input.staffPhoneE164,
        "Invalid option. Pick from the list or send CANCEL.",
        input.phoneNumberId,
      );
      return;
    }

    const lookup = await lookupCustomerForWhatsApp({
      storeId: input.storeId,
      query: payload.customerName ?? "",
      customerId,
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
      await sendAddressPickList(input, lookup.customer.name, lookup.addressOptions);
      return;
    }

    if (lookup.type !== "ready") {
      await replyText(
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

  if (state === "awaiting_provider_pick" && command.type === "pick") {
    const index = command.index - 1;
    const option = index >= 0 ? payload.providerOptions?.at(index) : undefined;
    if (!option) {
      await replyText(
        input.staffPhoneE164,
        "Invalid option. Pick from the list or send CANCEL.",
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

    await replyConfirmQuote(
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

  if (command.type === "new_wizard") {
    if (command.name && command.phone) {
      await input.saveConversation({
        state: "awaiting_new_address",
        payload: {
          pendingNewName: command.name,
          pendingNewPhone: command.phone,
        },
      });
      await replyText(
        input.staffPhoneE164,
        buildNewCustomerAddressPrompt(command.name),
        input.phoneNumberId,
      );
      return;
    }

    if (command.name) {
      await input.saveConversation({
        state: "awaiting_new_phone",
        payload: { pendingNewName: command.name },
      });
      await replyText(
        input.staffPhoneE164,
        buildNewCustomerPhonePrompt(command.name),
        input.phoneNumberId,
      );
      return;
    }

    await input.saveConversation({ state: "awaiting_new_name", payload: {} });
    await replyText(
      input.staffPhoneE164,
      buildNewCustomerNamePrompt(),
      input.phoneNumberId,
    );
    return;
  }

  if (command.type === "new_one_line") {
    await resolveAndQuoteNewCustomer(input, {
      name: command.name,
      phone: command.phone,
      address: command.address,
    });
    return;
  }

  if (command.type === "customer_name") {
    await handleCustomerLookup(input, command.name);
    return;
  }

  if (state === "awaiting_confirm") {
    await replyText(
      input.staffPhoneE164,
      "Tap Send or reply YES. CANCEL to reset.",
      input.phoneNumberId,
    );
    return;
  }

  if (command.type === "unknown") {
    await replyText(
      input.staffPhoneE164,
      command.text.includes("NEW block")
        ? command.text
        : "Send a customer name, NEW for a new customer, or HELP.",
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

    await replyText(
      input.staffPhoneE164,
      "Something went wrong. Try again or send HELP.",
      input.phoneNumberId,
    );
  }
}
