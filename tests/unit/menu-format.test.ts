import { describe, expect, it } from "vitest";
import {
  formatCentsAsDollarsInput,
  parseDollarsToCents,
} from "@/lib/domain/menu/format";

describe("menu price formatting", () => {
  it("parses dollar amounts into cents", () => {
    expect(parseDollarsToCents("14.50")).toBe(1450);
    expect(parseDollarsToCents("0.99")).toBe(99);
    expect(parseDollarsToCents("12")).toBe(1200);
  });

  it("rejects invalid dollar strings", () => {
    expect(parseDollarsToCents("")).toBeNull();
    expect(parseDollarsToCents("12.345")).toBeNull();
    expect(parseDollarsToCents("$12")).toBeNull();
  });

  it("formats cents for dollar inputs", () => {
    expect(formatCentsAsDollarsInput(1450)).toBe("14.50");
    expect(formatCentsAsDollarsInput(99)).toBe("0.99");
  });
});
