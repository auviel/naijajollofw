import { describe, expect, it } from "vitest";
import {
  defaultMetaDescription,
  defaultMetaTitle,
  plainTextFromPortableText,
} from "@/lib/sanity/seo";

describe("blog seo helpers", () => {
  it("uses title as meta title", () => {
    expect(defaultMetaTitle("Smoky party jollof")).toBe("Smoky party jollof");
  });

  it("truncates long titles with ellipsis under 60 chars", () => {
    const long = "A".repeat(80);
    const result = defaultMetaTitle(long);
    expect(result.length).toBeLessThanOrEqual(60);
    expect(result.endsWith("…")).toBe(true);
  });

  it("builds description from portable text and truncates ~155", () => {
    const blocks = [
      {
        _type: "block",
        children: [{ _type: "span", text: "Hello kitchen. ".repeat(30) }],
      },
    ];
    const plain = plainTextFromPortableText(blocks);
    const desc = defaultMetaDescription(plain);
    expect(desc.length).toBeLessThanOrEqual(160);
    expect(desc.length).toBeGreaterThan(40);
  });
});
