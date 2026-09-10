import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function isCloudflareWorkers(): boolean {
  return (
    typeof navigator !== "undefined" &&
    navigator.userAgent === "Cloudflare-Workers"
  );
}

function hyperdriveConnectionString(): string | undefined {
  try {
    const { env } = getCloudflareContext();
    return env.HYPERDRIVE?.connectionString;
  } catch {
    return undefined;
  }
}

/**
 * Railway's public TCP proxy presents a self-signed cert (CN=localhost). Recent
 * `pg` treats `sslmode=require` as verify-full, which fails that cert.
 *
 * Important: do NOT pass `ssl: { rejectUnauthorized: false }` alongside
 * `connectionString`. `pg` ConnectionParameters does
 * `Object.assign({}, config, parse(connectionString))`, so `sslmode=require`
 * overwrites the explicit ssl option with `{}` and verification stays on.
 * Put `uselibpqcompat=true` in the URL so parse() itself sets
 * `rejectUnauthorized: false` (libpq-compatible require).
 *
 * Production Workers use Hyperdrive (not this path). This only applies to
 * local / CF Builds `DATABASE_URL` against `*.rlwy.net` / `*.railway.app`.
 */
function isRailwayPublicHost(connectionString: string): boolean {
  try {
    const host = new URL(connectionString.replace(/^postgres(ql)?:/i, "http:")).hostname;
    return host.endsWith(".rlwy.net") || host.endsWith(".railway.app");
  } catch {
    return /\.rlwy\.net|\.railway\.app/i.test(connectionString);
  }
}

function normalizePgConnectionString(connectionString: string): string {
  if (!isRailwayPublicHost(connectionString)) {
    return connectionString;
  }
  const match = connectionString.match(/^(postgres(?:ql)?:\/\/[^?]*)(\?.*)?$/i);
  if (!match) {
    return connectionString;
  }
  const [, base, query = ""] = match;
  const params = new URLSearchParams(query.startsWith("?") ? query.slice(1) : query);
  // Force libpq-compatible require even if the secret already has sslmode=require
  // (which alone is treated as verify-full by modern pg-connection-string).
  params.set("uselibpqcompat", "true");
  params.set("sslmode", "require");
  return `${base}?${params.toString()}`;
}

function createPrisma(connectionString: string, perRequest: boolean): PrismaClient {
  // Hyperdrive already pools at the edge. Keep the client pool tiny; on Workers
  // maxUses:1 so a socket is never reused after the request ends (CF docs:
  // "Connection terminated unexpectedly" = cross-request pg reuse).
  const adapter = new PrismaPg({
    connectionString: normalizePgConnectionString(connectionString),
    max: 1,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 20_000,
    ...(perRequest ? { maxUses: 1 } : {}),
  });
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });
}

function getClient(): PrismaClient {
  const hyperdrive = hyperdriveConnectionString();
  // Workers: prefer Hyperdrive. Never cache the Prisma/pg client across
  // requests (React.cache / globalThis both cause "Connection terminated
  // unexpectedly" with Hyperdrive). Set PREFER_DATABASE_URL=1 only for
  // emergency bypass of Hyperdrive.
  const forceDatabaseUrl = process.env.PREFER_DATABASE_URL === "1";
  if (hyperdrive && isCloudflareWorkers() && !forceDatabaseUrl) {
    return createPrisma(hyperdrive, true);
  }

  if (isCloudflareWorkers()) {
    const databaseUrl = process.env.DATABASE_URL ?? hyperdrive;
    if (!databaseUrl) {
      throw new Error(
        "DATABASE_URL is not set (and Hyperdrive is unavailable). Local/migrate uses Railway or Docker Postgres; Workers use the HYPERDRIVE binding.",
      );
    }
    return createPrisma(databaseUrl, true);
  }

  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const databaseUrl = process.env.DATABASE_URL ?? hyperdrive;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set (and Hyperdrive is unavailable). Local/migrate uses Railway or Docker Postgres; Workers use the HYPERDRIVE binding.",
    );
  }

  const client = createPrisma(databaseUrl, false);
  globalForPrisma.prisma = client;
  return client;
}

/**
 * Lazy Prisma client. On Workers this goes through Hyperdrive with a fresh
 * client per access (pg must not outlive the request). Local `next dev`,
 * tests, and `prisma migrate` keep a singleton on DATABASE_URL.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client, prop, client) as unknown;
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(client)
      : value;
  },
});
