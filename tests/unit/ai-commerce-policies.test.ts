import { describe, expect, it } from "vitest";
import {
  composeAssistantPrompt,
  DEFAULT_COMMERCE_POLICIES,
} from "@/lib/ai/core/prompt";
import { RESTAURANT_VERTICAL_INSTRUCTIONS } from "@/lib/ai/verticals/restaurant/prompt";

describe("AI commerce policies", () => {
  it("blocks general-knowledge and off-topic answers", () => {
    expect(DEFAULT_COMMERCE_POLICIES).toMatch(/Out of scope/i);
    expect(DEFAULT_COMMERCE_POLICIES).toMatch(/General knowledge/i);
    expect(DEFAULT_COMMERCE_POLICIES).toMatch(/Jailbreaks/i);
    expect(DEFAULT_COMMERCE_POLICIES).toMatch(/Do not define the off-topic term/i);
  });

  it("requires tool-grounded prices and cart claims", () => {
    expect(DEFAULT_COMMERCE_POLICIES).toMatch(/Never invent prices/i);
    expect(DEFAULT_COMMERCE_POLICIES).toMatch(/\$5\.00/);
    expect(DEFAULT_COMMERCE_POLICIES).toMatch(/ok: true/);
    expect(DEFAULT_COMMERCE_POLICIES).toMatch(/empty:true/i);
  });

  it("composes a stable prompt with brand + vertical", () => {
    const a = composeAssistantPrompt({
      brandName: "Naija Jollof",
      verticalInstructions: RESTAURANT_VERTICAL_INSTRUCTIONS,
      customerContext: "Customer context: Guest.",
    });
    const b = composeAssistantPrompt({
      brandName: "Naija Jollof",
      verticalInstructions: RESTAURANT_VERTICAL_INSTRUCTIONS,
      customerContext: "Customer context: Guest.",
    });
    expect(a).toBe(b);
    expect(a).toContain("Naija Jollof");
    expect(a).toContain("Ask Amaka");
    expect(a).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
  });
});
