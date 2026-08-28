import { describe, expect, it } from "vitest";
import { mergeRankedSearchResults } from "@/lib/ai/catalog/merge-search-results";
import { shouldUseAiSearch } from "@/lib/ai/catalog/should-use-ai-search";
import type { CatalogSearchItem } from "@/lib/ai/ports/catalog";

const item = (id: string, name: string): CatalogSearchItem => ({
  id,
  slug: id,
  name,
  description: null,
  priceCents: 1000,
  imageUrl: null,
  available: true,
});

describe("shouldUseAiSearch", () => {
  it("uses keyword search for single dish names", () => {
    expect(shouldUseAiSearch("jollof")).toBe(false);
    expect(shouldUseAiSearch("plantain")).toBe(false);
  });

  it("uses AI for multi-word cravings", () => {
    expect(shouldUseAiSearch("something spicy with rice")).toBe(true);
    expect(shouldUseAiSearch("party tray")).toBe(true);
  });

  it("uses AI for intent phrases", () => {
    expect(shouldUseAiSearch("something sweet")).toBe(true);
    expect(shouldUseAiSearch("recommend chicken")).toBe(true);
  });
});

describe("mergeRankedSearchResults", () => {
  it("dedupes items and preserves first-seen order", () => {
    const merged = mergeRankedSearchResults(
      [
        [item("1", "Jollof"), item("2", "Plantain")],
        [item("2", "Plantain"), item("3", "Suya")],
      ],
      10,
    );
    expect(merged.map((i) => i.id)).toEqual(["1", "2", "3"]);
  });
});
