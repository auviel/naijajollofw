import { describe, expect, it } from "vitest";
import { mobileLoginSchema } from "@/lib/domain/auth/mobile";

describe("mobileLoginSchema", () => {
  it("accepts an optional turnstile token for diner login", () => {
    const parsed = mobileLoginSchema.parse({
      email: "diner@example.com",
      password: "secret",
      app: "diner",
      turnstileToken: "token-from-widget",
    });
    expect(parsed.turnstileToken).toBe("token-from-widget");
  });

  it("still accepts staff login without a token", () => {
    const parsed = mobileLoginSchema.parse({
      email: "kitchen@example.com",
      password: "secret",
      app: "staff",
    });
    expect(parsed.turnstileToken).toBeUndefined();
  });
});
