import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Do NOT set ALLOW_DESTRUCTIVE_SEED here — `prisma db seed` / migrate reset
    // would otherwise always unlock the wipe. Use `npm run db:seed:demo` locally.
    // Prod: `npm run db:bootstrap` only (never wipes menu).
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://delivergo:delivergo@localhost:5433/delivergo?schema=public",
  },
});
