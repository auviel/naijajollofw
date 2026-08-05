/**
 * Scheduled tickets stay off the live kitchen board until prep should start.
 * ASAP orders (no scheduledFor) are always live.
 */
export function isKitchenBoardHeld(
  scheduledForIso: string | null | undefined,
  prepMinutes: number,
  nowMs = Date.now(),
): boolean {
  if (!scheduledForIso) {
    return false;
  }

  const scheduledMs = new Date(scheduledForIso).getTime();
  if (!Number.isFinite(scheduledMs)) {
    return false;
  }

  const prepMs = Math.max(0, prepMinutes) * 60_000;
  return scheduledMs - prepMs > nowMs;
}

/** `scheduledFor` cutoff: anything at or before this instant is due on the board. */
export function kitchenBoardDueBy(
  prepMinutes: number,
  nowMs = Date.now(),
): Date {
  return new Date(nowMs + Math.max(0, prepMinutes) * 60_000);
}

/** Only unstarted scheduled tickets are parked in Later. */
export function isKitchenBoardDeferred(
  order: { status: string; scheduledFor: string | null },
  prepMinutes: number,
  nowMs = Date.now(),
): boolean {
  return (
    order.status === "pending_acceptance" &&
    isKitchenBoardHeld(order.scheduledFor, prepMinutes, nowMs)
  );
}
