ALTER TABLE "PaymentEvent"
 ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0 CHECK ("attempts" >= 0),
 ADD COLUMN "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
 ADD COLUMN "leaseUntil" TIMESTAMP(3),
 ADD COLUMN "errorCode" TEXT;
CREATE INDEX "PaymentEvent_processed_nextAttemptAt_idx" ON "PaymentEvent"("processed", "nextAttemptAt");
