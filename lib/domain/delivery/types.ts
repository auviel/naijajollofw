export type DeliveryProviderId = "uber_direct" | "doordash_drive";

export const DELIVERY_PROVIDER_LABELS: Record<DeliveryProviderId, string> = {
  uber_direct: "Uber Direct",
  doordash_drive: "DoorDash Drive",
};

/** Safe label lookup — avoids dynamic bracket access on user-influenced keys. */
export function getDeliveryProviderLabel(providerId: DeliveryProviderId): string {
  switch (providerId) {
    case "uber_direct":
      return DELIVERY_PROVIDER_LABELS.uber_direct;
    case "doordash_drive":
      return DELIVERY_PROVIDER_LABELS.doordash_drive;
    default: {
      const _exhaustive: never = providerId;
      return _exhaustive;
    }
  }
}

export type DeliveryStatus =
  | "draft"
  | "pending"
  | "scheduled"
  | "en_route_to_pickup"
  | "arrived_at_pickup"
  | "en_route_to_dropoff"
  | "arrived_at_dropoff"
  | "completed"
  | "cancelled"
  | "failed";

export type ProofOfDeliveryConfig = {
  signature: boolean;
  picture: boolean;
  pincode: boolean;
};

export type CreateDeliveryInput = {
  dropoffName: string;
  dropoffPhone: string;
  dropoffAddress: string;
  scheduledPickupAt?: Date;
  proofOfDelivery: ProofOfDeliveryConfig;
  idempotencyKey?: string;
};

export type DeliveryQuote = {
  providerId: DeliveryProviderId;
  id: string;
  feeCents: number;
  currency: string;
  expiresAt: Date;
  pickupDurationMinutes?: number;
  dropoffEta?: Date;
};

export type DeliveryQuoteFailure = {
  providerId: DeliveryProviderId;
  error: string;
};

export type DeliveryRecord = {
  id: string;
  externalId: string;
  storeId: string;
  providerId: DeliveryProviderId;
  providerDeliveryId: string;
  status: DeliveryStatus;
  feeCents: number;
  currency: string;
  trackingUrl: string;
  liveMode: boolean;
  createdAt: Date;
};

export type DeliveryListItem = {
  id: string;
  externalId: string;
  providerId: DeliveryProviderId;
  dropoffName: string;
  dropoffAddress: string;
  status: DeliveryStatus;
  feeCents: number | null;
  currency: string;
  createdAt: Date;
  scheduledFor: Date | null;
};

export type CourierInfo = {
  name?: string;
  phone?: string;
  vehicleType?: string;
  pickupEta?: Date;
  dropoffEta?: Date;
};

export type DeliveryProofOfDelivery = {
  signatureImageUrl?: string;
  signerName?: string;
  pictureImageUrl?: string;
  pincodeValue?: string;
  fetchedAt?: string;
  pending?: boolean;
};

export type DeliveryLocation = {
  name: string;
  phone: string;
  address: string;
};

export type DeliveryDetail = {
  id: string;
  externalId: string;
  providerId: DeliveryProviderId;
  status: DeliveryStatus;
  createdAt: Date;
  feeCents: number | null;
  currency: string;
  trackingUrl: string | null;
  liveMode: boolean;
  scheduledFor: Date | null;
  pickupReadyAt: Date | null;
  pickup: DeliveryLocation;
  dropoff: DeliveryLocation;
  podConfig: ProofOfDeliveryConfig;
  pincodeValue: string | null;
  proofOfDelivery: DeliveryProofOfDelivery | null;
  courier: CourierInfo | null;
  cancellable: boolean;
  cancelledAt: Date | null;
  cancelReason: string | null;
};
