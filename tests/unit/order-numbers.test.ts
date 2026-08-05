import { describe, expect, it } from "vitest";
import {
  displayNumberSearchTerms,
  formatDayTicketLabel,
  formatDisplayNumber,
  formatOrderRef,
  parseDayTicketQuery,
  storeLocalDateKey,
} from "@/lib/domain/order/order-numbers";

describe("order numbers", () => {
  it("formats lifetime and day ticket labels", () => {
    expect(formatDisplayNumber("nj", 1084)).toBe("NJ-1084");
    expect(formatDisplayNumber("  ", 3)).toBe("NJ-3");
    expect(formatDayTicketLabel(12)).toBe("#12");
    expect(formatOrderRef({ displayNumber: "NJ-1084", dayTicket: 12 })).toBe(
      "NJ-1084 · #12",
    );
    expect(formatOrderRef({ displayNumber: "NJ-1084" })).toBe("NJ-1084");
    expect(formatOrderRef({ dayTicket: 12 })).toBe("#12");
    expect(formatOrderRef({})).toBe("");
  });

  it("parses kitchen ticket search", () => {
    expect(parseDayTicketQuery("#12")).toBe(12);
    expect(parseDayTicketQuery("12")).toBeNull();
    expect(parseDayTicketQuery("NJ-12")).toBeNull();
    expect(parseDayTicketQuery("Chioma")).toBeNull();
  });

  it("normalizes display number search variants", () => {
    expect(displayNumberSearchTerms("nj 1084")).toEqual(
      expect.arrayContaining(["nj 1084", "NJ-1084"]),
    );
    expect(displayNumberSearchTerms("NJ1084")).toContain("NJ-1084");
  });

  it("computes store-local date keys across midnight", () => {
    expect(
      storeLocalDateKey(new Date("2026-08-05T03:30:00.000Z"), "America/Toronto"),
    ).toBe("2026-08-04");
    expect(
      storeLocalDateKey(new Date("2026-08-05T04:30:00.000Z"), "America/Toronto"),
    ).toBe("2026-08-05");
  });
});
