import { describe, expect, it } from "vitest";
import { CART_SESSION_HEADER } from "@/lib/domain/cart/types";
import { isCartSessionId } from "@/lib/services/cart/session";

describe("cart session header contract", () => {
  it("uses a stable header name for native clients", () => {
    expect(CART_SESSION_HEADER).toBe("x-cart-sid");
  });

  it("accepts the same UUID format the header must carry", () => {
    expect(isCartSessionId("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });
});
