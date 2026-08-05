import { describe, expect, it } from "vitest";
import {
  clampTipCents,
  matchingTipPercent,
  parseTipDollarsToCents,
  tipCentsFromPercent,
} from "@/lib/domain/order/tip";

describe("tipCentsFromPercent", () => {
  it("rounds to the nearest cent on food subtotal", () => {
    expect(tipCentsFromPercent(1999, 15)).toBe(300);
    expect(tipCentsFromPercent(1000, 18)).toBe(180);
    expect(tipCentsFromPercent(1000, 0)).toBe(0);
  });
});

describe("parseTipDollarsToCents", () => {
  it("parses CAD strings and caps at $500", () => {
    expect(parseTipDollarsToCents("2.50")).toBe(250);
    expect(parseTipDollarsToCents("$12")).toBe(1200);
    expect(parseTipDollarsToCents("")).toBe(0);
    expect(parseTipDollarsToCents("999")).toBe(50_000);
  });
});

describe("matchingTipPercent", () => {
  it("detects preset percents vs custom amounts", () => {
    expect(matchingTipPercent(2000, 300)).toBe(15);
    expect(matchingTipPercent(2000, 0)).toBe(0);
    expect(matchingTipPercent(2000, 250)).toBe("custom");
  });
});

describe("clampTipCents", () => {
  it("floors and caps tip cents", () => {
    expect(clampTipCents(199.9)).toBe(199);
    expect(clampTipCents(-5)).toBe(0);
    expect(clampTipCents(80_000)).toBe(50_000);
  });
});
