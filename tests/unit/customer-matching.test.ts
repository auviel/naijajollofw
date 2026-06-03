import { describe, expect, it } from "vitest";
import {
  addressesMatch,
  namesMatch,
  normalizeCustomerName,
  normalizePostalCode,
} from "@/lib/domain/customer/matching";

describe("customer matching", () => {
  it("matches normalized customer names", () => {
    expect(namesMatch("Jane Doe", "jane doe")).toBe(true);
    expect(namesMatch("Val T", "Val T.")).toBe(true);
    expect(namesMatch("Jane", "John")).toBe(false);
  });

  it("normalizes customer names", () => {
    expect(normalizeCustomerName("  Val   T ")).toBe("val t");
  });

  it("matches addresses by postal code and line1", () => {
    expect(
      addressesMatch(
        {
          line1: "123 Roger St",
          postalCode: "N2J 1A7",
          latitude: 43.46146,
          longitude: -80.50829,
        },
        {
          line1: "123 roger st",
          postalCode: "N2J1A7",
          latitude: 43.46146,
          longitude: -80.50829,
        },
      ),
    ).toBe(true);
  });

  it("normalizes postal codes", () => {
    expect(normalizePostalCode("n2j 1a7")).toBe("N2J1A7");
  });
});
