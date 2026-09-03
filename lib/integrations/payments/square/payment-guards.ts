import type { OrderStatus } from "@prisma/client";

const ACCEPTED_SQUARE_PAYMENT_STATUSES = new Set(["COMPLETED", "APPROVED"]);

/** Statuses Square may return that are safe to treat as a successful charge. */
export function isAcceptedSquarePaymentStatus(status: string): boolean {
  return ACCEPTED_SQUARE_PAYMENT_STATUSES.has(status.toUpperCase());
}

/**
 * Square FAILED/CANCELED webhooks may only cancel tickets that have not entered
 * the kitchen / courier flow. Later statuses need a human decision.
 */
export function canCancelOrderViaSquarePayment(status: OrderStatus): boolean {
  return status === "pending_payment" || status === "pending_acceptance";
}
