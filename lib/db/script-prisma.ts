import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma-node/client";

/** Prisma 7 driver adapter for Node/tsx scripts (seed, bootstrap, one-offs). */
export function createScriptPrisma(): PrismaClient {
  const connectionString =
    process.env.DATABASE_URL ??
    "postgresql://delivergo:delivergo@localhost:5433/delivergo?schema=public";
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}
