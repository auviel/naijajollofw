import { afterEach, describe, expect, it } from "vitest";
import { deployEnvironment } from "@/lib/observability/deploy-env";

describe("deployEnvironment", () => {
  let previousCloudflare: string | undefined;
  let previousPublicCloudflare: string | undefined;
  let previousVercel: string | undefined;
  let previousPublicVercel: string | undefined;

  afterEach(() => {
    if (previousCloudflare === undefined) {
      delete process.env.CLOUDFLARE_ENV;
    } else {
      process.env.CLOUDFLARE_ENV = previousCloudflare;
    }
    if (previousPublicCloudflare === undefined) {
      delete process.env.NEXT_PUBLIC_CLOUDFLARE_ENV;
    } else {
      process.env.NEXT_PUBLIC_CLOUDFLARE_ENV = previousPublicCloudflare;
    }
    if (previousVercel === undefined) {
      delete process.env.VERCEL_ENV;
    } else {
      process.env.VERCEL_ENV = previousVercel;
    }
    if (previousPublicVercel === undefined) {
      delete process.env.NEXT_PUBLIC_VERCEL_ENV;
    } else {
      process.env.NEXT_PUBLIC_VERCEL_ENV = previousPublicVercel;
    }
  });

  function stash() {
    previousCloudflare = process.env.CLOUDFLARE_ENV;
    previousPublicCloudflare = process.env.NEXT_PUBLIC_CLOUDFLARE_ENV;
    previousVercel = process.env.VERCEL_ENV;
    previousPublicVercel = process.env.NEXT_PUBLIC_VERCEL_ENV;
    delete process.env.CLOUDFLARE_ENV;
    delete process.env.NEXT_PUBLIC_CLOUDFLARE_ENV;
    delete process.env.VERCEL_ENV;
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;
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
