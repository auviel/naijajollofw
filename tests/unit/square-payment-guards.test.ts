import { describe, expect, it } from "vitest";
import {
  canCancelOrderViaSquarePayment,
  isAcceptedSquarePaymentStatus,
} from "@/lib/integrations/payments/square/payment-guards";

describe("square payment guards", () => {
  it("accepts only completed/approved payment statuses", () => {
    expect(isAcceptedSquarePaymentStatus("COMPLETED")).toBe(true);
    expect(isAcceptedSquarePaymentStatus("APPROVED")).toBe(true);
    expect(isAcceptedSquarePaymentStatus("PENDING")).toBe(false);
    expect(isAcceptedSquarePaymentStatus("FAILED")).toBe(false);
    expect(isAcceptedSquarePaymentStatus("CANCELED")).toBe(false);
  });

  it("only cancels early kitchen statuses via Square failure webhooks", () => {
    expect(canCancelOrderViaSquarePayment("pending_payment")).toBe(true);
    expect(canCancelOrderViaSquarePayment("pending_acceptance")).toBe(true);
    expect(canCancelOrderViaSquarePayment("preparing")).toBe(false);
    expect(canCancelOrderViaSquarePayment("ready")).toBe(false);
    expect(canCancelOrderViaSquarePayment("out_for_delivery")).toBe(false);
    expect(canCancelOrderViaSquarePayment("completed")).toBe(false);
    expect(canCancelOrderViaSquarePayment("cancelled")).toBe(false);
  });
});
