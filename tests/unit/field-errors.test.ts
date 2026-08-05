import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  fieldErrorsFromPairs,
  flattenApiFieldErrors,
} from "@/lib/forms/read-api-error";
import { zodErrorToFieldErrors } from "@/lib/forms/zod-field-errors";

describe("field error helpers", () => {
  it("drops prototype-polluting keys from API details", () => {
    const errors = flattenApiFieldErrors({
      customerName: "Enter your name.",
      __proto__: "bad",
      constructor: "bad",
      prototype: "bad",
    });
    expect(errors.customerName).toBe("Enter your name.");
    expect(Object.hasOwn(errors, "__proto__")).toBe(false);
    expect(Object.hasOwn(errors, "constructor")).toBe(false);
    expect(Object.hasOwn(errors, "prototype")).toBe(false);
  });

  it("maps the first Zod issue per field without bracket assignment", () => {
    const parsed = z
      .object({
        customerName: z.string().min(2),
        customerPhone: z.string().min(10),
      })
      .safeParse({ customerName: "A", customerPhone: "1" });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const errors = zodErrorToFieldErrors(parsed.error);
    expect(errors.customerName).toBeTruthy();
    expect(errors.customerPhone).toBeTruthy();
  });

  it("ignores unsafe keys in fromPairs", () => {
    expect(
      fieldErrorsFromPairs([
        { key: "__proto__", message: "nope" },
        { key: "email", message: " Enter an email. " },
      ]),
    ).toEqual({ email: "Enter an email." });
  });
});
