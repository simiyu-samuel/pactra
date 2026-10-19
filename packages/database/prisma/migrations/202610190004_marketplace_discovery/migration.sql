CREATE TABLE "DiscoverySearch" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "query" TEXT NOT NULL,
  "source" TEXT NOT NULL CHECK ("source" IN ('channel3', 'jumia', 'kilimall', 'amazon')),
  "state" TEXT NOT NULL DEFAULT 'running' CHECK ("state" IN ('running', 'complete', 'failed')),
  "result" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
  CONSTRAINT "DiscoverySearch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DiscoverySearch_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "BrowserSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "DiscoverySearch_ownerId_createdAt_idx" ON "DiscoverySearch"("ownerId", "createdAt");
CREATE INDEX "DiscoverySearch_source_createdAt_idx" ON "DiscoverySearch"("source", "createdAt");
