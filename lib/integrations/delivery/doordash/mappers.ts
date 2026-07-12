import type { NormalizedAddress } from "@/lib/domain/address/types";
import type { DeliveryStatus } from "@/lib/domain/delivery/types";
import { normalizeCanadianPhone } from "@/lib/utils/phone";
import type {
  ProviderCreateDeliveryRequest,
  ProviderDelivery,
  ProviderQuote,
  ProviderQuoteRequest,
} from "../types";
import { DOORDASH_QUOTE_TTL_MS } from "./types";
import type { DoorDashDeliveryResponse, DoorDashQuoteResponse } from "./types";

export function formatDoorDashAddress(address: NormalizedAddress): string {
  if (address.formatted) {
    return address.formatted;
  }

  return [
    address.line1,
    address.line2,
    address.city,
    address.province,
    address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");
}

export function formatDoorDashPhone(phone: string): string {
  const normalized = normalizeCanadianPhone(phone);
  if (!normalized) {
    throw new Error(`Invalid Canadian phone number: ${phone}`);
  }
  return normalized;
}

function parseDoorDashFeeCents(fee: number | undefined): number {
  if (fee === undefined) {
    return 0;
  }

  // DoorDash returns fee in cents for Drive v2.
  return Math.round(fee);
}

export function mapDoorDashStatusToDomain(status: string | undefined): DeliveryStatus {
  const normalized = (status ?? "pending").toLowerCase().replace(/-/g, "_");

  const map: Record<string, DeliveryStatus> = {
    created: "pending",
    confirmed: "pending",
    quote: "pending",
    scheduled: "scheduled",
    dasher_confirmed: "en_route_to_pickup",
    enroute_to_pickup: "en_route_to_pickup",
    arrived_at_pickup: "arrived_at_pickup",
    at_pickup: "arrived_at_pickup",
    picked_up: "en_route_to_dropoff",
    enroute_to_dropoff: "en_route_to_dropoff",
    arrived_at_dropoff: "arrived_at_dropoff",
    at_dropoff: "arrived_at_dropoff",
    delivered: "completed",
    dropped_off: "completed",
    cancelled: "cancelled",
    canceled: "cancelled",
    delivery_cancelled: "cancelled",
    failed: "failed",
    delivery_attempted: "failed",
  };

  return map[normalized] ?? "pending";
}

export function mapDoorDashQuoteResponse(
  raw: DoorDashQuoteResponse,
  externalDeliveryId: string,
): ProviderQuote {
  const pickupEta = raw.pickup_time_estimated ?? raw.pickup_time;
  const dropoffEta = raw.dropoff_time_estimated ?? raw.dropoff_time;
  const pickupDurationMinutes =
    pickupEta && dropoffEta
      ? Math.max(
          1,
          Math.round(
            (new Date(dropoffEta).getTime() - new Date(pickupEta).getTime()) /
              60_000,
          ),
        )
      : undefined;

  return {
    id: externalDeliveryId,
    feeCents: parseDoorDashFeeCents(raw.fee),
    currency: (raw.currency ?? "CAD").toUpperCase(),
    expiresAt: new Date(Date.now() + DOORDASH_QUOTE_TTL_MS),
    pickupDurationMinutes,
    dropoffEta: dropoffEta ? new Date(dropoffEta) : undefined,
  };
}

export function mapDoorDashDeliveryResponse(
  raw: DoorDashDeliveryResponse,
): ProviderDelivery {
  return {
    providerDeliveryId: raw.external_delivery_id,
    providerOrderId: raw.delivery_id ? String(raw.delivery_id) : undefined,
    status: mapDoorDashStatusToDomain(raw.delivery_status),
    feeCents: parseDoorDashFeeCents(raw.fee),
    currency: (raw.currency ?? "CAD").toUpperCase(),
    trackingUrl: raw.tracking_url ?? "",
    liveMode: false,
    proofOfDelivery:
      raw.dropoff_signature_image_url ||
      raw.dropoff_verification_image_url ||
      raw.dropoff_contact_name
        ? {
            signatureImageUrl: raw.dropoff_signature_image_url,
            signerName: raw.dropoff_contact_name,
            pictureImageUrl: raw.dropoff_verification_image_url,
          }
        : undefined,
    courier: raw.dasher_name
      ? {
          name: raw.dasher_name,
          phone: raw.dasher_phone_number,
          pickupEta: raw.pickup_time_estimated
            ? new Date(raw.pickup_time_estimated)
            : undefined,
          dropoffEta: raw.dropoff_time_estimated
            ? new Date(raw.dropoff_time_estimated)
            : undefined,
        }
      : undefined,
    raw,
  };
}

export function buildDoorDashQuoteBody(
  input: ProviderQuoteRequest,
  externalDeliveryId: string,
  externalBusinessId: string,
) {
  if (!input.pickupContact || !input.dropoffContact) {
    throw new Error("DoorDash quotes require pickup and dropoff contact details.");
  }

  const body: Record<string, unknown> = {
    external_delivery_id: externalDeliveryId,
    external_business_id: externalBusinessId,
    external_store_id: input.externalStoreId ?? externalBusinessId,
    pickup_address: formatDoorDashAddress(input.pickup),
    pickup_business_name: input.pickupContact.name,
    pickup_phone_number: formatDoorDashPhone(input.pickupContact.phone),
    dropoff_address: formatDoorDashAddress(input.dropoff),
    dropoff_phone_number: formatDoorDashPhone(input.dropoffContact.phone),
    dropoff_contact_given_name: input.dropoffContact.name,
    order_value: 1000,
    dropoff_contact_send_notifications: true,
  };

  if (input.pickupReadyAt) {
    body.pickup_time = input.pickupReadyAt.toISOString();
  }

  return body;
}

export function buildDoorDashServiceabilityBody(
  input: ProviderQuoteRequest,
  externalBusinessId: string,
) {
  if (!input.pickupContact || !input.dropoffContact) {
    throw new Error("DoorDash serviceability checks require pickup and dropoff contact details.");
  }

  return {
    pickup_address: formatDoorDashAddress(input.pickup),
    dropoff_address: formatDoorDashAddress(input.dropoff),
    pickup_external_business_id: externalBusinessId,
    pickup_external_store_id: input.externalStoreId ?? externalBusinessId,
    dropoff_phone_number: formatDoorDashPhone(input.dropoffContact.phone),
    order_value: 1000,
    ...(input.pickupReadyAt ? { pickup_time: input.pickupReadyAt.toISOString() } : {}),
  };
}

export function buildDoorDashAcceptQuoteBody(input: ProviderCreateDeliveryRequest) {
  const dropoffOptions: Record<string, unknown> = {};

  if (input.proofOfDelivery.signature) {
    dropoffOptions.signature = "required";
  }

  if (input.proofOfDelivery.picture) {
    dropoffOptions.proof_of_delivery = "photo_required";
  }

  return {
    tip: 0,
    dropoff_phone_number: formatDoorDashPhone(input.dropoff.phone),
    dropoff_contact_given_name: input.dropoff.name,
    dropoff_options: dropoffOptions,
    ...(input.proofOfDelivery.pincode
      ? { dropoff_pin_code_verification: { pin_code_type: "random" } }
      : {}),
  };
}

export function mapDoorDashWebhookStatus(
  eventType: string | undefined,
  deliveryStatus: string | undefined,
): string {
  if (deliveryStatus) {
    return deliveryStatus;
  }

  const normalized = (eventType ?? "").toLowerCase();

  const eventMap: Record<string, string> = {
    delivery_created: "created",
    dasher_confirmed: "dasher_confirmed",
    dasher_enroute_to_pickup: "enroute_to_pickup",
    dasher_at_pickup: "arrived_at_pickup",
    dasher_picked_up: "picked_up",
    dasher_enroute_to_dropoff: "enroute_to_dropoff",
    dasher_at_dropoff: "arrived_at_dropoff",
    dasher_dropped_off: "delivered",
    delivery_cancelled: "cancelled",
    delivery_attempted: "failed",
  };

  return eventMap[normalized] ?? normalized;
}
