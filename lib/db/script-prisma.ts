import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/** Prisma 7 requires a driver adapter — used by seed/CLI scripts. */
export function createScriptPrisma(): PrismaClient {
  const connectionString =
    process.env.DATABASE_URL ??
    "postgresql://delivergo:delivergo@localhost:5433/delivergo?schema=public";
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}
