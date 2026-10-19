CREATE TABLE "FlightSearch" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "ownerId" TEXT NOT NULL REFERENCES "BrowserSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "query" JSONB NOT NULL,
 "queryHash" TEXT NOT NULL,
 "state" TEXT NOT NULL DEFAULT 'running' CHECK ("state" IN ('running','complete','failed')),
 "calls" INTEGER NOT NULL CHECK ("calls" BETWEEN 1 AND 3),
 "refreshes" INTEGER NOT NULL DEFAULT 0 CHECK ("refreshes" BETWEEN 0 AND 10),
 "lastRefreshAt" TIMESTAMP(3),
 "result" JSONB,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
);
CREATE INDEX "FlightSearch_ownerId_queryHash_createdAt_idx" ON "FlightSearch"("ownerId", "queryHash", "createdAt");
CREATE INDEX "FlightSearch_createdAt_idx" ON "FlightSearch"("createdAt");
