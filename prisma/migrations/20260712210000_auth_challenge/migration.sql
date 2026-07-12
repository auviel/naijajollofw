-- Durable auth challenge / rate-limit counters
CREATE TABLE IF NOT EXISTS "AuthChallenge" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "windowStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthChallenge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AuthChallenge_key_key" ON "AuthChallenge"("key");

CREATE INDEX IF NOT EXISTS "AuthChallenge_updatedAt_idx" ON "AuthChallenge"("updatedAt");
