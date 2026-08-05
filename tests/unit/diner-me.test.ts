import { describe, expect, it } from "vitest";
import { mapDinerMe } from "@/lib/domain/auth/diner-me";

describe("mapDinerMe", () => {
  it("exposes a safe diner profile", () => {
    expect(
      mapDinerMe({
        id: "user_1",
        email: "diner@example.com",
        name: "Ada",
        storeId: "store_1",
        storeName: "Naija Jollof Waterloo",
        phoneE164: "+15195550100",
        emailVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
      }),
    ).toEqual({
      id: "user_1",
      email: "diner@example.com",
      name: "Ada",
      phoneE164: "+15195550100",
      storeId: "store_1",
      storeName: "Naija Jollof Waterloo",
      emailVerified: true,
    });
  });
});
