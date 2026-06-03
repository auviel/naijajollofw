import type { CourierInfo, DeliveryDetail, DeliveryListItem } from "@/lib/domain/delivery/types";

export function reviveDate(value: Date | string | null | undefined): Date | null {
  if (value == null) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function reviveCourier(courier: CourierInfo | null): CourierInfo | null {
  if (!courier) {
    return null;
  }

  return {
    ...courier,
    pickupEta: reviveDate(courier.pickupEta) ?? undefined,
    dropoffEta: reviveDate(courier.dropoffEta) ?? undefined,
  };
}

/** Restore Date fields after fetching delivery detail JSON from the API. */
export function reviveDeliveryDetail(detail: DeliveryDetail): DeliveryDetail {
  const createdAt = reviveDate(detail.createdAt);
  if (!createdAt) {
    throw new Error("Delivery detail is missing a valid createdAt value");
  }

  return {
    ...detail,
    createdAt,
    scheduledFor: reviveDate(detail.scheduledFor),
    pickupReadyAt: reviveDate(detail.pickupReadyAt),
    cancelledAt: reviveDate(detail.cancelledAt),
    courier: reviveCourier(detail.courier),
  };
}

/** Restore Date fields after fetching delivery list JSON from the API. */
export function reviveDeliveryListItem(item: DeliveryListItem): DeliveryListItem {
  const createdAt = reviveDate(item.createdAt);
  if (!createdAt) {
    throw new Error("Delivery list item is missing a valid createdAt value");
  }

  return {
    ...item,
    createdAt,
    scheduledFor: reviveDate(item.scheduledFor),
  };
}

export function reviveDeliveryListItems(items: DeliveryListItem[]): DeliveryListItem[] {
  return items.map(reviveDeliveryListItem);
}
