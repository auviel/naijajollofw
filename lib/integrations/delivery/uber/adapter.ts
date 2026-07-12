import type { DeliveryProvider } from "../provider.interface";
import type {
  ProviderCancelRequest,
  ProviderCreateDeliveryRequest,
  ProviderDelivery,
  ProviderQuote,
  ProviderQuoteRequest,
  ProviderWebhookEvent,
} from "../types";
import { createUberDirectClient } from "./client";
import {
  parseUberStatusChangedWebhook,
  UBER_STATUS_CHANGED_EVENT,
} from "./webhook";

function getClient() {
  return createUberDirectClient();
}

export const uberDirectAdapter: DeliveryProvider = {
  id: "uber_direct",

  async createQuote(input: ProviderQuoteRequest): Promise<ProviderQuote> {
    return getClient().createQuote(input);
  },

  async createDelivery(
    input: ProviderCreateDeliveryRequest,
  ): Promise<ProviderDelivery> {
    return getClient().createDelivery(input);
  },

  async getDelivery(externalId: string): Promise<ProviderDelivery> {
    return getClient().getDelivery(externalId);
  },

  async listDeliveries(options?: {
    limit?: number;
    offset?: number;
  }): Promise<ProviderDelivery[]> {
    return getClient().listDeliveries(options);
  },

  async cancelDelivery(
    externalId: string,
    input: ProviderCancelRequest,
  ): Promise<void> {
    await getClient().cancelDelivery(externalId, input);
  },

  async parseWebhook(
    raw: unknown,
    headers: Headers,
  ): Promise<ProviderWebhookEvent | null> {
    void headers;

    if (typeof raw !== "string") {
      throw new Error("Uber webhook body must be a raw string for signature verification.");
    }

    const payload = parseUberStatusChangedWebhook(raw);

    if (payload.event_type !== UBER_STATUS_CHANGED_EVENT) {
      return null;
    }

    return {
      eventId: payload.event_id,
      providerOrderId: payload.meta.order_id ?? "",
      status: payload.meta.status,
      externalOrderId: payload.meta.external_order_id,
      resourceHref: payload.resource_href,
    };
  },
};
