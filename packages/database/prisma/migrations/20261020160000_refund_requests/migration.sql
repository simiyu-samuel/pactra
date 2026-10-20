CREATE TABLE "RefundRequest" (
 "id" TEXT NOT NULL, "checkoutId" TEXT NOT NULL, "commandKey" TEXT NOT NULL,
 "reason" TEXT NOT NULL, "state" TEXT NOT NULL DEFAULT 'requested',
 "requestKey" TEXT NOT NULL, "providerRefundId" TEXT, "approvedBy" TEXT,
 "operationAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "RefundRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RefundRequest_checkoutId_key" ON "RefundRequest"("checkoutId");
CREATE UNIQUE INDEX "RefundRequest_commandKey_key" ON "RefundRequest"("commandKey");
CREATE UNIQUE INDEX "RefundRequest_providerRefundId_key" ON "RefundRequest"("providerRefundId");
CREATE INDEX "RefundRequest_state_updatedAt_idx" ON "RefundRequest"("state", "updatedAt");
ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_checkoutId_fkey" FOREIGN KEY ("checkoutId") REFERENCES "Checkout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
