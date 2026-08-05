import { describe, expect, it } from "vitest";
import {
  isKitchenBoardDeferred,
  isKitchenBoardHeld,
  kitchenBoardDueBy,
} from "@/lib/domain/order/kitchen-schedule";

describe("isKitchenBoardHeld", () => {
  const now = Date.parse("2026-08-05T16:00:00.000Z");

  it("keeps ASAP orders live", () => {
    expect(isKitchenBoardHeld(null, 15, now)).toBe(false);
  });

  it("holds scheduled tickets until prepMinutes before the slot", () => {
    expect(isKitchenBoardHeld("2026-08-05T17:30:00.000Z", 15, now)).toBe(true);
    expect(isKitchenBoardHeld("2026-08-05T16:20:00.000Z", 15, now)).toBe(true);
    expect(isKitchenBoardHeld("2026-08-05T16:15:00.000Z", 15, now)).toBe(false);
    expect(isKitchenBoardHeld("2026-08-05T16:10:00.000Z", 15, now)).toBe(false);
  });
});

describe("kitchenBoardDueBy", () => {
  it("is now plus prep minutes", () => {
    const now = Date.parse("2026-08-05T16:00:00.000Z");
    expect(kitchenBoardDueBy(15, now).toISOString()).toBe(
      "2026-08-05T16:15:00.000Z",
    );
  });
});

describe("isKitchenBoardDeferred", () => {
  const now = Date.parse("2026-08-05T16:00:00.000Z");

  it("keeps due scheduled tickets on the live board", () => {
    expect(
      isKitchenBoardDeferred(
        { status: "pending_acceptance", scheduledFor: "2026-08-05T16:10:00.000Z" },
        15,
        now,
      ),
    ).toBe(false);
  });

  it("only defers unstarted scheduled tickets", () => {
    expect(
      isKitchenBoardDeferred(
        { status: "pending_acceptance", scheduledFor: "2026-08-05T18:00:00.000Z" },
        15,
        now,
      ),
    ).toBe(true);
    expect(
      isKitchenBoardDeferred(
        { status: "preparing", scheduledFor: "2026-08-05T18:00:00.000Z" },
        15,
        now,
      ),
    ).toBe(false);
  });
});
