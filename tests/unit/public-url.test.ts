import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { normalizePublicMediaUrl } from "@/lib/integrations/r2/public-url";

const LEGACY =
  "https://pub-a89a3e110634439d96e35518678ffd25.r2.dev/stores/seed-store-waterloo/menu/item-1/photo.jpg";
const KEY = "stores/seed-store-waterloo/menu/item-1/photo.jpg";

describe("normalizePublicMediaUrl", () => {
  beforeEach(() => {
    process.env.R2_ACCOUNT_ID = "acct";
    process.env.R2_ACCESS_KEY_ID = "key";
    process.env.R2_SECRET_ACCESS_KEY = "secret";
    process.env.R2_BUCKET_NAME = "naija-jollof-media";
    process.env.R2_PUBLIC_BASE_URL = "https://media.naijajollofw.ca";
  });

  afterEach(() => {
    delete process.env.R2_ACCOUNT_ID;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
    delete process.env.R2_BUCKET_NAME;
    delete process.env.R2_PUBLIC_BASE_URL;
  });

  it("rewrites legacy r2.dev URLs to the current public base", () => {
    expect(normalizePublicMediaUrl(LEGACY)).toBe(
      `https://media.naijajollofw.ca/${KEY}`,
    );
  });

  it("leaves already-normalized URLs unchanged", () => {
    const current = `https://media.naijajollofw.ca/${KEY}`;
    expect(normalizePublicMediaUrl(current)).toBe(current);
  });

  it("leaves local static paths unchanged", () => {
    expect(normalizePublicMediaUrl("/brand/naija-jollof-hero.png")).toBe(
      "/brand/naija-jollof-hero.png",
    );
  });

  it("rewrites legacy r2.dev URLs with only R2_PUBLIC_BASE_URL set", () => {
    delete process.env.R2_ACCOUNT_ID;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
    delete process.env.R2_BUCKET_NAME;

    expect(normalizePublicMediaUrl(LEGACY)).toBe(
      `https://media.naijajollofw.ca/${KEY}`,
    );
  });

  it("returns null for empty values", () => {
    expect(normalizePublicMediaUrl(null)).toBeNull();
    expect(normalizePublicMediaUrl("")).toBeNull();
    expect(normalizePublicMediaUrl("   ")).toBeNull();
  });
});
