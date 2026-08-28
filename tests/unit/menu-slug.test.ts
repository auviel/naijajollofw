import { describe, expect, it } from "vitest";
import {
  allocateUniqueMenuSlug,
  slugifyMenuItemName,
} from "@/lib/domain/menu/slug";

describe("slugifyMenuItemName", () => {
  it("slugifies common dish names", () => {
    expect(slugifyMenuItemName("Efo Riro Soup")).toBe("efo-riro-soup");
    expect(slugifyMenuItemName("Half Tray Party Rice")).toBe(
      "half-tray-party-rice",
    );
  });

  it("strips punctuation and collapses dashes", () => {
    expect(slugifyMenuItemName(" Jollof & Plantain!!! ")).toBe(
      "jollof-plantain",
    );
  });

  it("falls back when nothing remains", () => {
    expect(slugifyMenuItemName("???")).toBe("item");
  });
});

describe("allocateUniqueMenuSlug", () => {
  it("returns the base slug when free", async () => {
    const slug = await allocateUniqueMenuSlug("Efo Riro", async () => false);
    expect(slug).toBe("efo-riro");
  });

  it("suffixes until free", async () => {
    const taken = new Set(["efo-riro", "efo-riro-2"]);
    const slug = await allocateUniqueMenuSlug("Efo Riro", async (c) =>
      taken.has(c),
    );
    expect(slug).toBe("efo-riro-3");
  });
});
