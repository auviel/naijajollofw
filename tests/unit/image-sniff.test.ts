import { describe, expect, it } from "vitest";
import { sniffImageType } from "@/lib/domain/menu/image-sniff";

describe("sniffImageType", () => {
  it("detects jpeg", () => {
    expect(sniffImageType(Uint8Array.of(0xff, 0xd8, 0xff, 0xe0))).toBe("jpeg");
  });

  it("detects png", () => {
    expect(
      sniffImageType(
        Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0),
      ),
    ).toBe("png");
  });

  it("rejects non-images", () => {
    expect(sniffImageType(Uint8Array.of(0x25, 0x50, 0x44, 0x46))).toBeNull();
  });
});
