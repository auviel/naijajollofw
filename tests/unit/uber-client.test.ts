import { describe, expect, it } from "vitest";
import { buildCancelOrderBody } from "@/lib/integrations/delivery/uber/mappers";

describe("Uber Direct cancel delivery", () => {
  it("builds cancel body with merchant as cancelling party", () => {
    expect(
      buildCancelOrderBody({
        reason: "CUSTOMER_CALLED_TO_CANCEL",
        cancellingParty: "MERCHANT",
      }),
    ).toEqual({
      reason: "CUSTOMER_CALLED_TO_CANCEL",
      cancelling_party: "MERCHANT",
    });
  });

  it("uses the Direct API deliveries cancel path shape", () => {
    const customerId = "cust_test";
    const deliveryId = "del_GyyJFfJKSi2C2fMD94I0yw";

    expect(
      `/v1/customers/${customerId}/deliveries/${deliveryId}/cancel`,
    ).toBe("/v1/customers/cust_test/deliveries/del_GyyJFfJKSi2C2fMD94I0yw/cancel");
  });
});
