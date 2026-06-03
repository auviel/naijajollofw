import type { Delivery } from "@prisma/client";
import type {
  CourierInfo,
  DeliveryDetail,
  DeliveryProofOfDelivery,
  DeliveryStatus,
  ProofOfDeliveryConfig,
} from "@/lib/domain/delivery/types";
import { isCancellable } from "@/lib/domain/delivery/status";
import type { ProofOfDeliveryData } from "@/lib/db/repositories/delivery.repository";
import { extractUberPincode } from "@/lib/integrations/delivery/uber/mappers";
import type { UberDeliveryResponse } from "@/lib/integrations/delivery/uber/types";

function parseProofOfDelivery(
  delivery: Delivery,
): DeliveryProofOfDelivery | null {
  if (delivery.status !== "completed") {
    return null;
  }

  const stored = delivery.proofOfDelivery as ProofOfDeliveryData | null;

  if (!stored) {
    return { pending: true };
  }

  const hasContent =
    Boolean(stored.signatureImageUrl) ||
    Boolean(stored.pictureImageUrl) ||
    Boolean(stored.signerName) ||
    Boolean(stored.pincodeValue);

  if (!hasContent) {
    return { pending: true, fetchedAt: stored.fetchedAt };
  }

  return {
    signatureImageUrl: stored.signatureImageUrl,
    signerName: stored.signerName,
    pictureImageUrl: stored.pictureImageUrl,
    pincodeValue: stored.pincodeValue,
    fetchedAt: stored.fetchedAt,
  };
}

function parseCourierFromPayload(payload: unknown): CourierInfo | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const raw = payload as UberDeliveryResponse;
  const courier = raw.courier;

  const info: CourierInfo = {
    name: courier?.name,
    phone: courier?.phone_number,
    vehicleType: courier?.vehicle_type,
    pickupEta: raw.pickup_eta ? new Date(raw.pickup_eta) : undefined,
    dropoffEta: raw.dropoff_eta ? new Date(raw.dropoff_eta) : undefined,
  };

  const hasData =
    Boolean(info.name) ||
    Boolean(info.phone) ||
    Boolean(info.vehicleType) ||
    Boolean(info.pickupEta) ||
    Boolean(info.dropoffEta);

  return hasData ? info : null;
}

function parsePincodeFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  return extractUberPincode(payload as UberDeliveryResponse) ?? null;
}

export function mapDeliveryToDetail(delivery: Delivery): DeliveryDetail {
  const status = delivery.status as DeliveryStatus;

  return {
    id: delivery.id,
    externalId: delivery.externalId,
    providerId: delivery.providerId as DeliveryDetail["providerId"],
    status,
    createdAt: delivery.createdAt,
    feeCents: delivery.feeCents,
    currency: delivery.currency,
    trackingUrl: delivery.trackingUrl,
    liveMode: delivery.liveMode,
    scheduledFor: delivery.scheduledFor,
    pickupReadyAt: delivery.pickupReadyAt,
    pickup: {
      name: delivery.pickupName,
      phone: delivery.pickupPhone,
      address: delivery.pickupAddress,
    },
    dropoff: {
      name: delivery.dropoffName,
      phone: delivery.dropoffPhone,
      address: delivery.dropoffAddress,
    },
    podConfig: {
      signature: delivery.podSignature,
      picture: delivery.podPicture,
      pincode: delivery.podPincode,
    },
    pincodeValue: delivery.podPincode
      ? ((delivery.proofOfDelivery as ProofOfDeliveryData | null)?.pincodeValue ??
        parsePincodeFromPayload(delivery.providerPayload))
      : null,
    proofOfDelivery: parseProofOfDelivery(delivery),
    courier: parseCourierFromPayload(delivery.providerPayload),
    cancellable: isCancellable(status),
    cancelledAt: delivery.cancelledAt,
    cancelReason: delivery.cancelReason,
  };
}
