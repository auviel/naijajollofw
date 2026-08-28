import { describe, expect, it } from "vitest";
import { absoluteUrl, getSiteUrl } from "@/lib/seo/site";
import { buildShareMetadata } from "@/lib/seo/share-metadata";

describe("share metadata", () => {
  it("falls back to the default hero image", () => {
    const meta = buildShareMetadata({
      title: "Home",
      description: "Order jollof",
      path: "/",
    });
    const images = meta.openGraph?.images;
    expect(Array.isArray(images)).toBe(true);
    const first = Array.isArray(images) ? images[0] : images;
    expect(first).toMatchObject({
      url: `${getSiteUrl()}/brand/naija-jollof-hero.png`,
    });
    expect(meta.twitter).toMatchObject({
      card: "summary_large_image",
    });
    expect(meta.robots).toMatchObject({ index: true, follow: true });
  });

  it("uses an absolute page image when provided", () => {
    const meta = buildShareMetadata({
      title: "Party jollof",
      description: "Trays",
      imageUrl: "https://cdn.example.com/jollof.jpg",
      path: "/blog/party",
    });
    const images = meta.openGraph?.images;
    const first = Array.isArray(images) ? images[0] : images;
    expect(first).toMatchObject({
      url: "https://cdn.example.com/jollof.jpg",
    });
  });

  it("absolutizes relative image paths", () => {
    expect(absoluteUrl("/brand/icon-512.png")).toBe(
      `${getSiteUrl()}/brand/icon-512.png`,
    );
  });
});
