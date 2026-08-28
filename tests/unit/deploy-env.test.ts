import { afterEach, describe, expect, it } from "vitest";
import { deployEnvironment } from "@/lib/observability/deploy-env";

describe("deployEnvironment", () => {
  const envKeys = [
    "APP_ENV",
    "NEXT_PUBLIC_APP_ENV",
    "CLOUDFLARE_ENV",
    "NEXT_PUBLIC_CLOUDFLARE_ENV",
    "VERCEL_ENV",
    "NEXT_PUBLIC_VERCEL_ENV",
  ] as const;

  const previous: Record<(typeof envKeys)[number], string | undefined> = {
    APP_ENV: undefined,
    NEXT_PUBLIC_APP_ENV: undefined,
    CLOUDFLARE_ENV: undefined,
    NEXT_PUBLIC_CLOUDFLARE_ENV: undefined,
    VERCEL_ENV: undefined,
    NEXT_PUBLIC_VERCEL_ENV: undefined,
  };

  afterEach(() => {
    for (const key of envKeys) {
      if (previous[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous[key];
      }
    }
  });

  function stash() {
    for (const key of envKeys) {
      previous[key] = process.env[key];
      delete process.env[key];
    }
  }

  it("prefers APP_ENV over legacy Cloudflare and Vercel", () => {
    stash();
    process.env.APP_ENV = "production";
    process.env.CLOUDFLARE_ENV = "preview";
    process.env.VERCEL_ENV = "preview";
    expect(deployEnvironment()).toBe("production");
  });

  it("prefers Cloudflare over Vercel", () => {
    stash();
    process.env.CLOUDFLARE_ENV = "production";
    process.env.VERCEL_ENV = "preview";
    expect(deployEnvironment()).toBe("production");
  });

  it("falls back to Vercel then NODE_ENV", () => {
    stash();
    process.env.VERCEL_ENV = "preview";
    expect(deployEnvironment()).toBe("preview");
    delete process.env.VERCEL_ENV;
    expect(deployEnvironment()).toBe(process.env.NODE_ENV ?? "development");
  });
});
