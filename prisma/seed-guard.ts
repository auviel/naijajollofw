/**
 * Guards for DB seed / bootstrap scripts.
 * Destructive seed wipes menu + carts — never run against prod by accident.
 */

function appEnvIsProduction(): boolean {
  const appEnv = (
    process.env.APP_ENV ??
    process.env.CLOUDFLARE_ENV ??
    process.env.NODE_ENV ??
    ""
  ).toLowerCase();
  return appEnv === "production";
}

function railwayRuntimeDetected(): boolean {
  return Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
      process.env.RAILWAY_ENVIRONMENT_ID ||
      process.env.RAILWAY_PROJECT_ID ||
      process.env.RAILWAY_SERVICE_ID,
  );
}

/**
 * True when DATABASE_URL / runtime looks like a hosted / production database.
 *
 * Important: Railway *private* URLs use `*.railway.internal` and do NOT match
 * the public `*.rlwy.net` proxy host. Missing that check let demo seed wipe
 * prod when run inside Railway (or with the private URL locally).
 */
export function isProductionLikeDatabase(
  databaseUrl: string = process.env.DATABASE_URL ?? "",
): boolean {
  if (appEnvIsProduction() || railwayRuntimeDetected()) {
    return true;
  }

  const url = databaseUrl.trim();
  if (!url) {
    return false;
  }

  return (
    /\.rlwy\.net/i.test(url) ||
    /\.railway\.app/i.test(url) ||
    /\.railway\.internal/i.test(url) ||
    /railway\.internal/i.test(url) ||
    /\.neon\.tech/i.test(url) ||
    /\.supabase\.co/i.test(url) ||
    /supabase\.com/i.test(url)
  );
}

/**
 * Demo seed (`prisma/seed.ts`) deletes all menu items/categories for the store.
 *
 * - Local/CI: require `ALLOW_DESTRUCTIVE_SEED=1` (set by `npm run db:seed:demo`).
 * - Production-like DBs: **always refused** — no override. Use `db:bootstrap`
 *   or `scripts/restore-waterloo-menu.ts` instead.
 */
export function assertDestructiveSeedAllowed(
  databaseUrl: string = process.env.DATABASE_URL ?? "",
): void {
  const allow = process.env.ALLOW_DESTRUCTIVE_SEED === "1";
  const prodLike = isProductionLikeDatabase(databaseUrl);

  if (prodLike) {
    throw new Error(
      [
        "Refusing destructive seed on a production-like database.",
        "(Railway public/private URL, Neon, Supabase, or APP_ENV/CLOUDFLARE_ENV/NODE_ENV=production / RAILWAY_* set).",
        "",
        "This wipe is permanently blocked — there is no override flag.",
        "",
        "Safe options:",
        "  npm run db:bootstrap",
        "  NODE_TLS_REJECT_UNAUTHORIZED=0 DATABASE_URL=<railway-public-url> npx tsx scripts/restore-waterloo-menu.ts",
        "",
        "Demo fixtures are for local Docker / CI only:",
        "  DATABASE_URL=postgresql://delivergo:...@localhost:5433/... npm run db:seed:demo",
      ].join("\n"),
    );
  }

  if (!allow) {
    throw new Error(
      [
        "Refusing destructive seed (wipes carts + all menu items/categories).",
        "Local/CI demo:  npm run db:seed:demo",
        "Store/staff only:  npm run db:bootstrap",
      ].join("\n"),
    );
  }
}
