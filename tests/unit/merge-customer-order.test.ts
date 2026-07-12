import { describe, expect, it } from "vitest";
import {
  parseStaffOrderChannel,
  parseStaffOrderListFilter,
} from "@/lib/domain/order/transitions";
import { addressesMatch } from "@/lib/domain/customer/matching";

describe("parseStaffOrderChannel", () => {
  it("defaults to all", () => {
    expect(parseStaffOrderChannel(undefined)).toBe("all");
    expect(parseStaffOrderChannel("nope")).toBe("all");
  });

  it("accepts kitchen and courier", () => {
    expect(parseStaffOrderChannel("kitchen")).toBe("kitchen");
    expect(parseStaffOrderChannel("courier")).toBe("courier");
  });
});

describe("parseStaffOrderListFilter", () => {
  it("defaults to active", () => {
    expect(parseStaffOrderListFilter(undefined)).toBe("active");
  });
});

describe("addressesMatch with nullable geo", () => {
  it("matches on postal + line1 without coordinates", () => {
    expect(
      addressesMatch(
        {
          line1: "123 King St",
          postalCode: "N2J 1A1",
          latitude: null as unknown as number,
          longitude: null as unknown as number,
        },
        {
          line1: "123 King St",
          postalCode: "N2J1A1",
          latitude: null as unknown as number,
          longitude: null as unknown as number,
        },
      ),
    ).toBe(true);
  });
});
