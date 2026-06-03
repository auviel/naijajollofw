export type DeliveryProviderId = "uber_direct";

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
  id: string;
  feeCents: number;
  currency: string;
  expiresAt: Date;
  pickupDurationMinutes?: number;
  dropoffEta?: Date;
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
  proofOfDelivery: DeliveryProofOfDelivery | null;
  courier: CourierInfo | null;
  cancellable: boolean;
  cancelledAt: Date | null;
  cancelReason: string | null;
};
