import { describe, expect, it } from "vitest";
import {
  brandImageKey,
  extensionForContentType,
  menuItemImageKey,
  tmpUploadKey,
  tryParseR2ObjectKeyFromPublicUrl,
} from "@/lib/integrations/r2/keys";

describe("r2 keys", () => {
  it("builds tenant-first menu keys with immutable asset id", () => {
    expect(
      menuItemImageKey({
        storeId: "store_1",
        menuItemId: "item_1",
        assetId: "asset_1",
        ext: "webp",
      }),
    ).toBe("stores/store_1/menu/item_1/asset_1.webp");
  });

  it("reserves brand and tmp prefixes under the same store root", () => {
    expect(
      brandImageKey({
        storeId: "store_1",
        kind: "logo",
        assetId: "a1",
        ext: "png",
      }),
    ).toBe("stores/store_1/brand/logo/a1.png");

    expect(
      tmpUploadKey({
        storeId: "store_1",
        uploadId: "u1",
        ext: "jpg",
      }),
    ).toBe("stores/store_1/tmp/u1.jpg");
  });

  it("maps content types to extensions", () => {
    expect(extensionForContentType("image/jpeg")).toBe("jpg");
    expect(extensionForContentType("image/png; charset=binary")).toBe("png");
    expect(extensionForContentType("application/pdf")).toBeNull();
  });

  it("parses keys only from our public base URL", () => {
    const base = "https://media.example.com";
    expect(
      tryParseR2ObjectKeyFromPublicUrl(
        `${base}/stores/s1/menu/i1/a1.webp`,
        base,
      ),
    ).toBe("stores/s1/menu/i1/a1.webp");

    expect(
      tryParseR2ObjectKeyFromPublicUrl(
        "https://other.cdn/stores/s1/menu/i1/a1.webp",
        base,
      ),
    ).toBeNull();
  });
});
