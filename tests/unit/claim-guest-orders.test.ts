import { describe, expect, it } from "vitest";
import { buildClaimGuestOrdersWhere } from "@/lib/domain/order/claim-guest-orders";

describe("buildClaimGuestOrdersWhere", () => {
  it("returns null when neither customer nor email is provided", () => {
    expect(
      buildClaimGuestOrdersWhere({
        storeId: "store_1",
      }),
    ).toBeNull();
  });

  it("matches by customerId", () => {
    expect(
      buildClaimGuestOrdersWhere({
        storeId: "store_1",
        customerId: "cust_1",
      }),
    ).toEqual({
      storeId: "store_1",
      userId: null,
      NOT: { status: "pending_payment" },
      OR: [{ customerId: "cust_1" }],
    });
  });

  it("matches by normalized email", () => {
    expect(
      buildClaimGuestOrdersWhere({
        storeId: "store_1",
        email: "  Guest@Example.com ",
      }),
    ).toEqual({
      storeId: "store_1",
      userId: null,
      NOT: { status: "pending_payment" },
      OR: [{ customerEmail: "guest@example.com" }],
    });
  });

  it("matches by customerId or email", () => {
    expect(
      buildClaimGuestOrdersWhere({
        storeId: "store_1",
        customerId: "cust_1",
        email: "guest@example.com",
      }),
    ).toEqual({
      storeId: "store_1",
      userId: null,
      NOT: { status: "pending_payment" },
      OR: [{ customerId: "cust_1" }, { customerEmail: "guest@example.com" }],
    });
  });
});
