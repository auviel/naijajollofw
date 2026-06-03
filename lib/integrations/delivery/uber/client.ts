import { createDefaultManifest } from "@/lib/domain/delivery/manifest";
import { logger } from "@/lib/utils/logger";
import type {
  ProviderCancelRequest,
  ProviderCreateDeliveryRequest,
  ProviderDelivery,
  ProviderQuote,
  ProviderQuoteRequest,
} from "../types";
import { getUberDirectConfig, type UberDirectConfig } from "./config";
import { mapUberApiError } from "./errors";
import {
  buildCancelOrderBody,
  buildCreateDeliveryBody,
  buildQuoteRequestBody,
  mapUberDeliveryResponse,
  mapUberQuoteResponse,
} from "./mappers";
import type {
  UberDeliveryQuoteResponse,
  UberDeliveryResponse,
  UberListDeliveriesResponse,
  UberTokenResponse,
} from "./types";

type TokenCache = {
  accessToken: string;
  expiresAtMs: number;
};

let tokenCache: TokenCache | null = null;

export class UberDirectClient {
  constructor(private readonly config: UberDirectConfig) {}

  get isLiveMode(): boolean {
    return this.config.liveMode;
  }

  async createQuote(input: ProviderQuoteRequest): Promise<ProviderQuote> {
    const raw = await this.request<UberDeliveryQuoteResponse>(
      `/v1/customers/${this.config.customerId}/delivery_quotes`,
      {
        method: "POST",
        body: buildQuoteRequestBody(input),
      },
    );

    return mapUberQuoteResponse(raw);
  }

  async createDelivery(input: ProviderCreateDeliveryRequest): Promise<ProviderDelivery> {
    const raw = await this.request<UberDeliveryResponse>(
      `/v1/customers/${this.config.customerId}/deliveries`,
      {
        method: "POST",
        body: buildCreateDeliveryBody(
          input,
          createDefaultManifest(),
          this.config.liveMode,
        ),
      },
    );

    return mapUberDeliveryResponse(raw);
  }

  async getDelivery(deliveryId: string): Promise<ProviderDelivery> {
    const raw = await this.request<UberDeliveryResponse>(
      `/v1/customers/${this.config.customerId}/deliveries/${deliveryId}`,
      { method: "GET" },
    );

    return mapUberDeliveryResponse(raw);
  }

  async listDeliveries(options?: {
    limit?: number;
    offset?: number;
  }): Promise<ProviderDelivery[]> {
    const params = new URLSearchParams();
    if (options?.limit !== undefined) {
      params.set("limit", String(options.limit));
    }
    if (options?.offset !== undefined) {
      params.set("offset", String(options.offset));
    }

    const query = params.toString();
    const path = `/v1/customers/${this.config.customerId}/deliveries${query ? `?${query}` : ""}`;

    const raw = await this.request<UberListDeliveriesResponse | UberDeliveryResponse[]>(
      path,
      { method: "GET" },
    );

    const deliveries = Array.isArray(raw)
      ? raw
      : (raw.data ?? raw.deliveries ?? []);

    return deliveries.map(mapUberDeliveryResponse);
  }

  async cancelDelivery(
    deliveryId: string,
    input: ProviderCancelRequest,
  ): Promise<void> {
    await this.request<unknown>(
      `/v1/customers/${this.config.customerId}/deliveries/${deliveryId}/cancel`,
      {
        method: "POST",
        body: buildCancelOrderBody(input),
      },
    );
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();

    if (tokenCache && now < tokenCache.expiresAtMs - 60_000) {
      return tokenCache.accessToken;
    }

    const response = await fetch(this.config.authUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: "client_credentials",
        scope: "eats.deliveries",
      }),
    });

    const body = (await response.json().catch(() => ({}))) as
      | UberTokenResponse
      | { error?: string };

    if (!response.ok || !("access_token" in body)) {
      logger.error("uber.auth.failed", { status: response.status });
      throw mapUberApiError(response.status, body);
    }

    tokenCache = {
      accessToken: body.access_token,
      expiresAtMs: now + body.expires_in * 1000,
    };

    return body.access_token;
  }

  private async request<T>(
    path: string,
    options: {
      method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
      body?: Record<string, unknown>;
    },
  ): Promise<T> {
    const accessToken = await this.getAccessToken();
    const url = `${this.config.apiBase}${path}`;

    const response = await fetch(url, {
      method: options.method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });

    const text = await response.text();
    const parsed = text ? JSON.parse(text) : {};

    if (!response.ok) {
      logger.error("uber.api.error", {
        path,
        status: response.status,
        code: (parsed as { code?: string }).code,
      });
      throw mapUberApiError(response.status, parsed);
    }

    return parsed as T;
  }
}

export function createUberDirectClient(): UberDirectClient {
  return new UberDirectClient(getUberDirectConfig());
}

/** Reset cached token — useful in tests. */
export function resetUberTokenCache(): void {
  tokenCache = null;
}
