import { describe, expect, it } from "vitest";
import {
  notifyStatusForStaffTransition,
  shouldNotifyOrderStatus,
} from "@/lib/services/order/notify-order-status";
import {
  buildEmailVerificationEmail,
  buildOrderStatusEmail,
} from "@/lib/integrations/email/templates";

describe("shouldNotifyOrderStatus", () => {
  it("notifies pickup once at ready_for_pickup, not ready or completed", () => {
    expect(shouldNotifyOrderStatus("accepted", "pickup")).toBe(true);
    expect(shouldNotifyOrderStatus("ready", "pickup")).toBe(false);
    expect(shouldNotifyOrderStatus("ready_for_pickup", "pickup")).toBe(true);
    expect(shouldNotifyOrderStatus("completed", "pickup")).toBe(false);
    expect(shouldNotifyOrderStatus("cancelled", "pickup")).toBe(true);
  });

  it("notifies delivery at ready, not ready_for_pickup or completed", () => {
    expect(shouldNotifyOrderStatus("ready", "delivery")).toBe(true);
    expect(shouldNotifyOrderStatus("ready_for_pickup", "delivery")).toBe(false);
    expect(shouldNotifyOrderStatus("out_for_delivery", "delivery")).toBe(true);
    expect(shouldNotifyOrderStatus("completed", "delivery")).toBe(false);
  });

  it("maps board Start to the accepted diner ping", () => {
    expect(
      notifyStatusForStaffTransition("pending_acceptance", "preparing"),
    ).toBe("accepted");
    expect(notifyStatusForStaffTransition("preparing", "ready")).toBe("ready");
  });
});

describe("order and signup email copy", () => {
  it("merges welcome into the signup verification email", () => {
    const welcome = buildEmailVerificationEmail({
      name: "Ada",
      verifyUrl: "https://example.com/verify-email?token=abc",
      welcome: true,
    });
    expect(welcome.subject).toMatch(/welcome/i);
    expect(welcome.text).toMatch(/welcome to naija jollof/i);

    const resend = buildEmailVerificationEmail({
      name: "Ada",
      verifyUrl: "https://example.com/verify-email?token=abc",
    });
    expect(resend.subject).toBe("Verify your email");
    expect(resend.text).not.toMatch(/welcome to naija jollof/i);
  });

  it("builds ready-for-pickup copy without a completed/enjoy template", () => {
    const mail = buildOrderStatusEmail({
      customerName: "Ada",
      storeName: "Naija Jollof Waterloo",
      status: "ready_for_pickup",
      fulfillmentType: "pickup",
      trackUrl: "https://example.com/orders/1",
      displayNumber: "NJ-1001",
    });
    expect(mail.subject).toMatch(/ready for pickup/i);
    expect(mail.text).not.toMatch(/enjoy/i);
  });
});
