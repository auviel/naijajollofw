import { describe, expect, it } from "vitest";
import { mapDinerMe } from "@/lib/services/diner/get-me";

describe("mapDinerMe", () => {
  it("exposes a safe diner profile", () => {
    expect(
      mapDinerMe({
        id: "user_1",
        email: "diner@delivergo.local",
        name: "Ada",
        storeId: "store_1",
        storeName: "Naija Jollof Waterloo",
        role: "DINER",
        phoneE164: "+15195550100",
        sessionVersion: 1,
        emailVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
      }),
    ).toEqual({
      id: "user_1",
      email: "diner@delivergo.local",
      name: "Ada",
      phoneE164: "+15195550100",
      storeId: "store_1",
      storeName: "Naija Jollof Waterloo",
      emailVerified: true,
    });
  });
});
