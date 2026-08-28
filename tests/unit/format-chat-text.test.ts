import { describe, expect, it } from "vitest";
import { parseChatTextSegments } from "@/lib/ai/format-chat-text";

describe("parseChatTextSegments", () => {
  it("renders bold segments without stray asterisks", () => {
    const segments = parseChatTextSegments(
      "**Jollof Rice and Chicken** - Regular plate.",
    );
    expect(segments).toEqual([
      { bold: true, text: "Jollof Rice and Chicken" },
      { bold: false, text: " - Regular plate." },
    ]);
  });

  it("strips orphan markdown markers", () => {
    const segments = parseChatTextSegments("Still typing **bold");
    expect(segments).toEqual([{ bold: false, text: "Still typing bold" }]);
  });
});
