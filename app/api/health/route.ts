import { prisma } from "@/lib/db/client";
import { logger } from "@/lib/utils/logger";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type HealthBody = {
  status: "ok" | "degraded";
  service: string;
  timestamp: string;
  checks: {
    database: "ok" | "error";
  };
};

export async function GET() {
  const timestamp = new Date().toISOString();
  let database: "ok" | "error" = "ok";

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    database = "error";
    logger.error("health.database_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const status = database === "ok" ? "ok" : "degraded";
  const body: HealthBody = {
    status,
    service: "naija-jollof",
    timestamp,
    checks: { database },
  };

  return NextResponse.json(body, {
    status: status === "ok" ? 200 : 503,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
