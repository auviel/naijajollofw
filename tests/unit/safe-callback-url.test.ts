import { describe, expect, it } from "vitest";
import { safeCallbackUrl } from "@/lib/utils/safe-callback-url";

describe("safeCallbackUrl", () => {
  it("allows same-origin relative paths", () => {
    expect(safeCallbackUrl("/account", "/account")).toBe("/account");
    expect(safeCallbackUrl("/checkout?x=1", "/account")).toBe("/checkout?x=1");
    expect(safeCallbackUrl("/orders/abc", "/account")).toBe("/orders/abc");
  });

  it("rejects protocol-relative and absolute URLs", () => {
    expect(safeCallbackUrl("//evil.com", "/account")).toBe("/account");
    expect(safeCallbackUrl("https://evil.com", "/account")).toBe("/account");
    expect(safeCallbackUrl("http://evil.com/phish", "/account")).toBe("/account");
  });

  it("rejects path tricks", () => {
    expect(safeCallbackUrl("/\\evil.com", "/account")).toBe("/account");
    expect(safeCallbackUrl("/@evil.com", "/account")).toBe("/account");
    expect(safeCallbackUrl("/%2f%2fevil.com", "/account")).toBe("/account");
  });

  it("falls back for empty values", () => {
    expect(safeCallbackUrl(null, "/dashboard")).toBe("/dashboard");
    expect(safeCallbackUrl("", "/dashboard")).toBe("/dashboard");
    expect(safeCallbackUrl("   ", "/dashboard")).toBe("/dashboard");
  });
});
