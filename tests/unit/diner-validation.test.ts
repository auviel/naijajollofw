import { describe, expect, it } from "vitest";
import {
  dinerChangePasswordSchema,
  dinerForgotPasswordSchema,
  dinerRegisterSchema,
  dinerResetPasswordSchema,
  userAddressSchema,
} from "@/lib/domain/diner/validation";

describe("dinerRegisterSchema", () => {
  it("accepts a valid registration payload", () => {
    const parsed = dinerRegisterSchema.parse({
      name: "Ada Okonkwo",
      email: "ada@example.com",
      phone: "5195550100",
      password: "securePass1",
    });

    expect(parsed.email).toBe("ada@example.com");
    expect(parsed.name).toBe("Ada Okonkwo");
  });

  it("rejects short passwords and bad emails", () => {
    const result = dinerRegisterSchema.safeParse({
      name: "A",
      email: "not-an-email",
      phone: "123",
      password: "short",
    });

    expect(result.success).toBe(false);
  });
});

describe("diner password schemas", () => {
  it("requires matching confirm password fields as separate inputs", () => {
    const reset = dinerResetPasswordSchema.parse({
      token: "a".repeat(24),
      password: "newSecure1",
      confirmPassword: "newSecure1",
    });
    expect(reset.token).toHaveLength(24);

    const change = dinerChangePasswordSchema.parse({
      currentPassword: "oldSecure1",
      newPassword: "newSecure1",
      confirmPassword: "newSecure1",
    });
    expect(change.newPassword).toBe("newSecure1");
  });

  it("validates forgot-password email", () => {
    expect(
      dinerForgotPasswordSchema.safeParse({ email: "bad" }).success,
    ).toBe(false);
    expect(
      dinerForgotPasswordSchema.parse({ email: "ada@example.com" }).email,
    ).toBe("ada@example.com");
  });
});

describe("userAddressSchema", () => {
  it("defaults country to CA", () => {
    const address = userAddressSchema.parse({
      line1: "123 King St N",
      city: "Waterloo",
      province: "ON",
      postalCode: "N2J 2Z1",
      formatted: "123 King St N, Waterloo, ON N2J 2Z1",
    });

    expect(address.country).toBe("CA");
  });
});
