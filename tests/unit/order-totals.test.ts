import { describe, expect, it } from "vitest";
import { computeOrderTotals } from "@/lib/domain/order/totals";

describe("computeOrderTotals", () => {
  it("applies HST to subtotal only, not tip", () => {
    const totals = computeOrderTotals(1000, 200, 1300);
    expect(totals.subtotalCents).toBe(1000);
    expect(totals.tipCents).toBe(200);
    expect(totals.taxCents).toBe(130);
    expect(totals.totalCents).toBe(1330);
    expect(totals.currency).toBe("CAD");
  });

  it("rounds tax to nearest cent", () => {
    const totals = computeOrderTotals(999, 0, 1300);
    expect(totals.taxCents).toBe(130);
    expect(totals.totalCents).toBe(1129);
  });
});
