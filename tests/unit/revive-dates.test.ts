import { describe, expect, it } from "vitest";
import {
  reviveDate,
  reviveDeliveryDetail,
  reviveDeliveryListItems,
} from "@/lib/domain/delivery/revive-dates";
import type { DeliveryDetail } from "@/lib/domain/delivery/types";
import { formatDateTime } from "@/lib/utils/date";

const baseDetail: DeliveryDetail = {
  id: "del_1",
  externalId: "DG-1",
  status: "en_route_to_dropoff",
  createdAt: new Date("2026-06-03T11:40:00.000Z"),
  feeCents: 1000,
  currency: "CAD",
  trackingUrl: "https://example.com",
  liveMode: false,
  scheduledFor: null,
  pickupReadyAt: null,
  pickup: { name: "Store", phone: "+15195550199", address: "280 Lester St" },
  dropoff: { name: "Jane", phone: "+15195550100", address: "123 King St" },
  podConfig: { signature: false, picture: false, pincode: true },
  pincodeValue: "1234",
  proofOfDelivery: null,
  courier: {
    name: "Alex",
    pickupEta: new Date("2026-06-03T11:50:00.000Z"),
    dropoffEta: new Date("2026-06-03T12:10:00.000Z"),
  },
  cancellable: true,
  cancelledAt: null,
  cancelReason: null,
};

describe("reviveDeliveryDetail", () => {
  it("parses ISO date strings from JSON API responses", () => {
    const jsonDetail = {
      ...baseDetail,
      createdAt: "2026-06-03T11:40:00.000Z",
      courier: {
        ...baseDetail.courier,
        pickupEta: "2026-06-03T11:50:00.000Z",
        dropoffEta: "2026-06-03T12:10:00.000Z",
      },
    } as unknown as DeliveryDetail;

    const revived = reviveDeliveryDetail(jsonDetail);

    expect(revived.createdAt).toBeInstanceOf(Date);
    expect(revived.courier?.pickupEta).toBeInstanceOf(Date);
    expect(formatDateTime(revived.createdAt)).not.toBe("—");
  });
});

describe("reviveDeliveryListItems", () => {
  it("parses list item dates from JSON", () => {
    const items = reviveDeliveryListItems([
      {
        id: "del_1",
        externalId: "DG-1",
        dropoffName: "Jane",
        dropoffAddress: "123 King St",
        status: "pending",
        feeCents: 1000,
        currency: "CAD",
        createdAt: "2026-06-03T11:40:00.000Z",
        scheduledFor: null,
      } as never,
    ]);

    expect(items[0]?.createdAt).toBeInstanceOf(Date);
  });
});

describe("formatDateTime", () => {
  it("accepts ISO strings without throwing", () => {
    expect(formatDateTime("2026-06-03T11:40:00.000Z")).not.toBe("—");
  });

  it("returns a placeholder for invalid values", () => {
    expect(formatDateTime("not-a-date")).toBe("—");
    expect(reviveDate("not-a-date")).toBeNull();
  });
});
