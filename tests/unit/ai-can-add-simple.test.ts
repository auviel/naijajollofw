import { describe, expect, it } from "vitest";
import { canAddWithoutCustomize } from "@/lib/ai/core/can-add-simple";

describe("canAddWithoutCustomize", () => {
  it("allows add when no required modifiers", () => {
    expect(canAddWithoutCustomize([{ required: false, minSelect: 0 }])).toBe(
      true,
    );
    expect(canAddWithoutCustomize([])).toBe(true);
  });

  it("blocks add when a group is required or minSelect > 0", () => {
    expect(canAddWithoutCustomize([{ required: true, minSelect: 0 }])).toBe(
      false,
    );
    expect(canAddWithoutCustomize([{ required: false, minSelect: 1 }])).toBe(
      false,
    );
  });
});
