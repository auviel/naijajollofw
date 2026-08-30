import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cache } from "react";

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
  // Hyperdrive (and managed Postgres) already pool at the edge. Keep the client
  // pool tiny so serverless instances don't exhaust slots or wait on a stuck pool.
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

const prismaForHyperdriveRequest = cache((connectionString: string) =>
  createPrisma(connectionString, true),
);

function getClient(): PrismaClient {
  const hyperdrive = hyperdriveConnectionString();
  if (hyperdrive && isCloudflareWorkers()) {
    return prismaForHyperdriveRequest(hyperdrive);
  }

  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const databaseUrl = hyperdrive ?? process.env.DATABASE_URL;
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
 * Lazy Prisma client. On Workers this goes through Hyperdrive (pg adapter,
 * maxUses: 1). Local `next dev`, tests, and `prisma migrate` keep using
 * DATABASE_URL. Repositories can keep importing `prisma`.
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
