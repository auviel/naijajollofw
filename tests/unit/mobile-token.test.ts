import { afterEach, describe, expect, it } from "vitest";
import {
  createRefreshTokenValue,
  hashRefreshToken,
  readBearerToken,
  signMobileAccessToken,
  verifyMobileAccessToken,
} from "@/lib/auth/mobile-token";

const ORIGINAL_SECRET = process.env.AUTH_SECRET;

afterEach(() => {
  process.env.AUTH_SECRET = ORIGINAL_SECRET;
});

describe("mobile access tokens", () => {
  it("signs and verifies a staff token", () => {
    process.env.AUTH_SECRET = "test-secret-for-mobile-tokens";
    const token = signMobileAccessToken({
      sub: "user_1",
      email: "store.manager@delivergo.local",
      name: "Manager",
      storeId: "store_1",
      storeName: "Naija Jollof",
      role: "STORE_MANAGER",
      phoneE164: "+15195550100",
      sessionVersion: 3,
      app: "staff",
    });

    const claims = verifyMobileAccessToken(token);
    expect(claims?.sub).toBe("user_1");
    expect(claims?.app).toBe("staff");
    expect(claims?.sessionVersion).toBe(3);
    expect(claims?.typ).toBe("mobile_access");
  });

  it("rejects tampered tokens", () => {
    process.env.AUTH_SECRET = "test-secret-for-mobile-tokens";
    const token = signMobileAccessToken({
      sub: "user_1",
      email: "diner@delivergo.local",
      name: "Diner",
      storeId: "store_1",
      storeName: "Naija Jollof",
      role: "DINER",
      phoneE164: null,
      sessionVersion: 0,
      app: "diner",
    });

    expect(verifyMobileAccessToken(`${token}x`)).toBeNull();
    expect(verifyMobileAccessToken("not-a-jwt")).toBeNull();
  });

  it("hashes refresh tokens stably and reads bearer headers", () => {
    const value = createRefreshTokenValue();
    expect(hashRefreshToken(value)).toBe(hashRefreshToken(value));
    expect(hashRefreshToken(value)).not.toBe(hashRefreshToken(`${value}x`));
    expect(readBearerToken("Bearer abc.def.ghi")).toBe("abc.def.ghi");
    expect(readBearerToken("basic nope")).toBeNull();
  });
});
