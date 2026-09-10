import { afterEach, describe, expect, it } from "vitest";
import {
  assertDestructiveSeedAllowed,
  isProductionLikeDatabase,
} from "../../prisma/seed-guard";

const originalAllow = process.env.ALLOW_DESTRUCTIVE_SEED;
const originalConfirm = process.env.CONFIRM_PRODUCTION_SEED;
const originalRailwayEnv = process.env.RAILWAY_ENVIRONMENT;
const originalRailwayProject = process.env.RAILWAY_PROJECT_ID;
const originalAppEnv = process.env.APP_ENV;
const originalCfEnv = process.env.CLOUDFLARE_ENV;

afterEach(() => {
  if (originalAllow === undefined) {
    Reflect.deleteProperty(process.env, "ALLOW_DESTRUCTIVE_SEED");
  } else {
    process.env.ALLOW_DESTRUCTIVE_SEED = originalAllow;
  }

  if (originalConfirm === undefined) {
    Reflect.deleteProperty(process.env, "CONFIRM_PRODUCTION_SEED");
  } else {
    process.env.CONFIRM_PRODUCTION_SEED = originalConfirm;
  }

  if (originalRailwayEnv === undefined) {
    Reflect.deleteProperty(process.env, "RAILWAY_ENVIRONMENT");
  } else {
    process.env.RAILWAY_ENVIRONMENT = originalRailwayEnv;
  }

  if (originalRailwayProject === undefined) {
    Reflect.deleteProperty(process.env, "RAILWAY_PROJECT_ID");
  } else {
    process.env.RAILWAY_PROJECT_ID = originalRailwayProject;
  }

  if (originalAppEnv === undefined) {
    Reflect.deleteProperty(process.env, "APP_ENV");
  } else {
    process.env.APP_ENV = originalAppEnv;
  }

  if (originalCfEnv === undefined) {
    Reflect.deleteProperty(process.env, "CLOUDFLARE_ENV");
  } else {
    process.env.CLOUDFLARE_ENV = originalCfEnv;
  }
});

describe("isProductionLikeDatabase", () => {
  it("detects Railway public proxy hosts", () => {
    expect(
      isProductionLikeDatabase(
        "postgresql://postgres:x@caboose.proxy.rlwy.net:27461/railway",
      ),
    ).toBe(true);
  });

  it("detects Railway private networking hosts (the prod wipe hole)", () => {
    expect(
      isProductionLikeDatabase(
        "postgresql://postgres:x@postgres.railway.internal:5432/railway",
      ),
    ).toBe(true);
  });

  it("detects Neon and Supabase", () => {
    expect(
      isProductionLikeDatabase(
        "postgresql://user:pass@ep-calm-dust.us-east-2.aws.neon.tech/neondb",
      ),
    ).toBe(true);
    expect(
      isProductionLikeDatabase(
        "postgresql://user:pass@db.abcdefgh.supabase.co:5432/postgres",
      ),
    ).toBe(true);
  });

  it("allows local Docker", () => {
    expect(
      isProductionLikeDatabase(
        "postgresql://delivergo:delivergo@localhost:5433/delivergo?schema=public",
      ),
    ).toBe(false);
  });

  it("treats RAILWAY_* runtime as production-like even with local-looking URL", () => {
    process.env.RAILWAY_ENVIRONMENT = "production";
    expect(
      isProductionLikeDatabase(
        "postgresql://delivergo:delivergo@localhost:5433/delivergo",
      ),
    ).toBe(true);
  });
});

describe("assertDestructiveSeedAllowed", () => {
  it("blocks Railway private URLs even with ALLOW_DESTRUCTIVE_SEED=1", () => {
    process.env.ALLOW_DESTRUCTIVE_SEED = "1";
    process.env.CONFIRM_PRODUCTION_SEED = "I_UNDERSTAND";
    expect(() =>
      assertDestructiveSeedAllowed(
        "postgresql://postgres:x@postgres.railway.internal:5432/railway",
      ),
    ).toThrow(/permanently blocked/i);
  });

  it("allows local demo when ALLOW_DESTRUCTIVE_SEED=1", () => {
    process.env.ALLOW_DESTRUCTIVE_SEED = "1";
    Reflect.deleteProperty(process.env, "RAILWAY_ENVIRONMENT");
    Reflect.deleteProperty(process.env, "RAILWAY_PROJECT_ID");
    Reflect.deleteProperty(process.env, "APP_ENV");
    Reflect.deleteProperty(process.env, "CLOUDFLARE_ENV");
    expect(() =>
      assertDestructiveSeedAllowed(
        "postgresql://delivergo:delivergo@localhost:5433/delivergo",
      ),
    ).not.toThrow();
  });

  it("refuses local wipe without ALLOW_DESTRUCTIVE_SEED", () => {
    Reflect.deleteProperty(process.env, "ALLOW_DESTRUCTIVE_SEED");
    Reflect.deleteProperty(process.env, "APP_ENV");
    Reflect.deleteProperty(process.env, "CLOUDFLARE_ENV");
    expect(() =>
      assertDestructiveSeedAllowed(
        "postgresql://delivergo:delivergo@localhost:5433/delivergo",
      ),
    ).toThrow(/Refusing destructive seed/);
  });
});
