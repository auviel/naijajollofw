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
 * Railway's public TCP proxy presents a cert chain that Node's `pg` rejects when
 * `sslmode=require` is treated as verify-full (pg-connection-string ≥ recent).
 * Hyperdrive / local Docker do not need this. Build-time prerender uses DATABASE_URL
 * directly, so Railway hosts must relax verification.
 */
function needsRelaxedTls(connectionString: string): boolean {
  try {
    const host = new URL(connectionString.replace(/^postgres(ql)?:/i, "http:")).hostname;
    return host.endsWith(".rlwy.net") || host.endsWith(".railway.app");
  } catch {
    return /\.rlwy\.net|\.railway\.app/i.test(connectionString);
  }
}

function createPrisma(connectionString: string, perRequest: boolean): PrismaClient {
  // Hyperdrive (and managed Postgres) already pool at the edge. Keep the client
  // pool tiny so serverless instances don't exhaust slots or wait on a stuck pool.
  const adapter = new PrismaPg({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 20_000,
    ...(perRequest ? { maxUses: 1 } : {}),
    ...(needsRelaxedTls(connectionString)
      ? { ssl: { rejectUnauthorized: false } }
      : {}),
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
