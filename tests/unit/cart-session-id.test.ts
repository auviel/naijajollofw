import { describe, expect, it } from "vitest";
import { isCartSessionId } from "@/lib/services/cart/session";

describe("isCartSessionId", () => {
  it("accepts UUIDs", () => {
    expect(isCartSessionId("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("rejects short or malformed values", () => {
    expect(isCartSessionId("short")).toBe(false);
    expect(isCartSessionId("")).toBe(false);
    expect(isCartSessionId("not-a-uuid-at-all-really")).toBe(false);
  });
});
