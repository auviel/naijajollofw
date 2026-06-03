import type { NormalizedAddress } from "@/lib/domain/address/types";
import type { ManifestItem } from "@/lib/domain/delivery/manifest";
import { mapProviderStatusToDomain } from "@/lib/domain/delivery/status";
import type { ProofOfDeliveryConfig } from "@/lib/domain/delivery/types";
import { normalizeCanadianPhone } from "@/lib/utils/phone";
import type {
  ProviderCreateDeliveryRequest,
  ProviderDelivery,
  ProviderQuote,
  ProviderQuoteRequest,
} from "../types";
import type {
  UberDeliveryQuoteResponse,
  UberDeliveryResponse,
  UberManifestItem,
} from "./types";

/** Format a normalized address as Uber's JSON address string. */
export function formatUberAddressJson(address: NormalizedAddress): string {
  const streetAddress = [address.line1, address.line2].filter(
    (line): line is string => Boolean(line && line.length > 0),
  );

  return JSON.stringify({
    street_address: streetAddress,
    city: address.city,
    state: address.province,
    zip_code: address.postalCode,
    country: address.country,
  });
}

export function formatUberPhone(phone: string): string {
  const normalized = normalizeCanadianPhone(phone);
  if (!normalized) {
    throw new Error(`Invalid Canadian phone number: ${phone}`);
  }
  return normalized;
}

export function formatManifestItems(items: ManifestItem[]): UberManifestItem[] {
  return items.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    size: item.size,
  }));
}

export function mapUberQuoteResponse(raw: UberDeliveryQuoteResponse): ProviderQuote {
  return {
    id: raw.id,
    feeCents: raw.fee,
    currency: raw.currency.toUpperCase(),
    expiresAt: new Date(raw.expires),
    pickupDurationMinutes: raw.pickup_duration,
    dropoffEta: raw.dropoff_eta ? new Date(raw.dropoff_eta) : undefined,
  };
}

export function mapUberDeliveryStatus(status: string): ReturnType<typeof mapProviderStatusToDomain> {
  const normalized = status.toLowerCase().replace(/-/g, "_");

  const apiStatusMap: Record<string, ReturnType<typeof mapProviderStatusToDomain>> = {
    pending: "pending",
    scheduled: "scheduled",
    pickup: "en_route_to_pickup",
    pickup_complete: "arrived_at_pickup",
    dropoff: "en_route_to_dropoff",
    delivered: "completed",
    canceled: "cancelled",
    cancelled: "cancelled",
    returned: "failed",
    failed: "failed",
  };

  if (apiStatusMap[normalized]) {
    return apiStatusMap[normalized];
  }

  return mapProviderStatusToDomain(status);
}

export function mapUberDeliveryResponse(raw: UberDeliveryResponse): ProviderDelivery {
  const proof = raw.dropoff?.verification;
  const courier = raw.courier;
  const pincodeValue =
    proof?.pincode?.value ?? raw.verification_requirements?.pincode?.value;

  return {
    providerDeliveryId: raw.id,
    providerOrderId: raw.uuid,
    status: mapUberDeliveryStatus(raw.status),
    feeCents: raw.fee ?? 0,
    currency: (raw.currency ?? "cad").toUpperCase(),
    trackingUrl: raw.tracking_url ?? "",
    liveMode: raw.live_mode ?? false,
    proofOfDelivery: proof || pincodeValue
      ? {
          signatureImageUrl: proof?.signature_proof?.image_url,
          signerName: proof?.signature_proof?.signer_name,
          pictureImageUrl: proof?.picture?.image_url,
          pincodeValue,
        }
      : undefined,
    courier:
      courier || raw.pickup_eta || raw.dropoff_eta
        ? {
            name: courier?.name,
            phone: courier?.phone_number,
            vehicleType: courier?.vehicle_type,
            pickupEta: raw.pickup_eta ? new Date(raw.pickup_eta) : undefined,
            dropoffEta: raw.dropoff_eta ? new Date(raw.dropoff_eta) : undefined,
          }
        : undefined,
    raw,
  };
}

export function buildQuoteRequestBody(input: ProviderQuoteRequest) {
  return {
    pickup_address: formatUberAddressJson(input.pickup),
    dropoff_address: formatUberAddressJson(input.dropoff),
    pickup_latitude: input.pickup.latitude,
    pickup_longitude: input.pickup.longitude,
    dropoff_latitude: input.dropoff.latitude,
    dropoff_longitude: input.dropoff.longitude,
    ...(input.pickupReadyAt
      ? { pickup_ready_dt: input.pickupReadyAt.toISOString() }
      : {}),
  };
}

export function buildCreateDeliveryBody(
  input: ProviderCreateDeliveryRequest,
  manifestItems: ManifestItem[],
  liveMode: boolean,
) {
  const body: Record<string, unknown> = {
    quote_id: input.quoteId,
    external_id: input.externalId,
    pickup_address: formatUberAddressJson(input.pickup.address),
    pickup_name: input.pickup.name,
    pickup_phone_number: formatUberPhone(input.pickup.phone),
    pickup_latitude: input.pickup.address.latitude,
    pickup_longitude: input.pickup.address.longitude,
    dropoff_address: formatUberAddressJson(input.dropoff.address),
    dropoff_name: input.dropoff.name,
    dropoff_phone_number: formatUberPhone(input.dropoff.phone),
    dropoff_latitude: input.dropoff.address.latitude,
    dropoff_longitude: input.dropoff.address.longitude,
    manifest_items: formatManifestItems(manifestItems),
    dropoff_verification: buildDropoffVerification(input.proofOfDelivery),
  };

  if (input.pickupReadyAt) {
    body.pickup_ready_dt = input.pickupReadyAt.toISOString();
  }

  if (!liveMode) {
    body.test_specifications = {
      robo_courier_specification: {
        mode: "auto",
      },
    };
  }

  return body;
}

function buildDropoffVerification(proofOfDelivery: ProofOfDeliveryConfig) {
  const verification: Record<string, unknown> = {};

  if (proofOfDelivery.picture) {
    verification.picture = true;
  }

  if (proofOfDelivery.signature) {
    verification.signature_requirement = {
      enabled: true,
      collect_signer_name: true,
      collect_signer_relationship: false,
    };
  }

  if (proofOfDelivery.pincode) {
    verification.pincode = {
      enabled: true,
    };
  }

  return verification;
}

export function buildCancelOrderBody(input: {
  reason: string;
  details?: string;
  cancellingParty: "MERCHANT" | "CUSTOMER";
}) {
  return {
    reason: input.reason,
    ...(input.details ? { details: input.details } : {}),
    cancelling_party: input.cancellingParty,
  };
}
