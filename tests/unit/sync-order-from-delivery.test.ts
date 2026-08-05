import { beforeEach, describe, expect, it, vi } from "vitest";

const { findByDeliveryId, applyLinkedDeliveryStatus } = vi.hoisted(() => ({
  findByDeliveryId: vi.fn(),
  applyLinkedDeliveryStatus: vi.fn(),
}));

vi.mock("@/lib/db/repositories/order.repository", () => ({
  orderRepository: {
    findByDeliveryId,
    applyLinkedDeliveryStatus,
  },
}));

vi.mock("@/lib/services/order/notify-order-status", () => ({
  notifyOrderStatus: vi.fn(),
}));

import { syncOrderFromLinkedDelivery } from "@/lib/services/order/sync-order-from-delivery";

describe("syncOrderFromLinkedDelivery", () => {
  beforeEach(() => {
    findByDeliveryId.mockReset();
    applyLinkedDeliveryStatus.mockReset();
  });

  it("completes a linked out-for-delivery order when the carrier finishes", async () => {
    findByDeliveryId.mockResolvedValue({
      id: "ord_1",
      status: "out_for_delivery",
    });
    applyLinkedDeliveryStatus.mockResolvedValue({
      id: "ord_1",
      status: "completed",
      customerPhone: null,
      customerEmail: null,
      user: null,
      customerName: "Ada",
      store: { name: "Naija Jollof" },
      publicToken: "tok",
      fulfillmentType: "delivery",
      displayNumber: "NJ-1004",
      delivery: null,
    });

    await syncOrderFromLinkedDelivery({
      id: "del_1",
      status: "completed",
      trackingUrl: "https://track.example",
    });

    expect(applyLinkedDeliveryStatus).toHaveBeenCalledWith({
      orderId: "ord_1",
      to: "completed",
      note: "Carrier status → completed",
    });
  });

  it("does nothing when no restaurant order is linked", async () => {
    findByDeliveryId.mockResolvedValue(null);

    await syncOrderFromLinkedDelivery({
      id: "del_orphan",
      status: "completed",
    });

    expect(applyLinkedDeliveryStatus).not.toHaveBeenCalled();
  });

  it("does not complete the ticket when the carrier cancels", async () => {
    findByDeliveryId.mockResolvedValue({
      id: "ord_1",
      status: "out_for_delivery",
    });

    await syncOrderFromLinkedDelivery({
      id: "del_1",
      status: "cancelled",
    });

    expect(applyLinkedDeliveryStatus).not.toHaveBeenCalled();
  });
});
