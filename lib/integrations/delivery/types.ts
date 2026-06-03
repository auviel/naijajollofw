import type { NormalizedAddress } from "@/lib/domain/address/types";
import type {
  DeliveryProviderId,
  DeliveryStatus,
  ProofOfDeliveryConfig,
} from "@/lib/domain/delivery/types";

export type ProviderQuoteRequest = {
  pickup: NormalizedAddress;
  dropoff: NormalizedAddress;
  pickupReadyAt?: Date;
};

export type ProviderQuote = {
  id: string;
  feeCents: number;
  currency: string;
  expiresAt: Date;
  pickupDurationMinutes?: number;
  dropoffEta?: Date;
};

export type ProviderCreateDeliveryRequest = {
  quoteId: string;
  externalId: string;
  pickup: {
    name: string;
    phone: string;
    address: NormalizedAddress;
  };
  dropoff: {
    name: string;
    phone: string;
    address: NormalizedAddress;
  };
  pickupReadyAt?: Date;
  proofOfDelivery: ProofOfDeliveryConfig;
  liveMode: boolean;
};

export type ProviderDelivery = {
  providerDeliveryId: string;
  providerOrderId?: string;
  status: DeliveryStatus;
  feeCents: number;
  currency: string;
  trackingUrl: string;
  liveMode: boolean;
  proofOfDelivery?: {
    signatureImageUrl?: string;
    signerName?: string;
    pictureImageUrl?: string;
    pincodeValue?: string;
  };
  courier?: {
    name?: string;
    phone?: string;
    vehicleType?: string;
    pickupEta?: Date;
    dropoffEta?: Date;
  };
  raw?: unknown;
};

export type ProviderCancelRequest = {
  reason: string;
  details?: string;
  cancellingParty: "MERCHANT" | "CUSTOMER";
};

export type ProviderWebhookEvent = {
  eventId: string;
  providerOrderId: string;
  status: string;
  externalOrderId?: string;
  resourceHref?: string;
};

export type { DeliveryProviderId };
