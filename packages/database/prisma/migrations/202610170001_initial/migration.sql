-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "BrowserSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrowserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShoppingSession" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "brief" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "state" TEXT NOT NULL DEFAULT 'queued',
    "nextSeq" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShoppingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Seller" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "policyVersion" INTEGER NOT NULL DEFAULT 1,
    "warrantyMonths" INTEGER NOT NULL,
    "standardCents" INTEGER NOT NULL,
    "standardDays" INTEGER NOT NULL,
    "expressCents" INTEGER NOT NULL,
    "expressDays" INTEGER NOT NULL,

    CONSTRAINT "Seller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "video" TEXT NOT NULL,
    "audio" TEXT NOT NULL,
    "mount" TEXT NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "listCents" INTEGER NOT NULL,
    "floorCents" INTEGER NOT NULL,
    "onHand" INTEGER NOT NULL,
    "reserved" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "briefVersion" INTEGER NOT NULL,
    "policyVersion" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "terms" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomEvent" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "briefVersion" INTEGER NOT NULL,
    "step" INTEGER NOT NULL DEFAULT 0,
    "checkpoint" JSONB NOT NULL DEFAULT '{}',
    "state" TEXT NOT NULL DEFAULT 'ready',
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseUntil" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "calls" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Checkout" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "commandKey" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "snapshotHash" TEXT NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'reserved',
    "paypalOrderId" TEXT,
    "captureId" TEXT,
    "createKey" TEXT NOT NULL,
    "captureKey" TEXT NOT NULL,
    "operationAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Checkout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "checkoutId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'held',

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "checkoutId" TEXT,
    "type" TEXT NOT NULL,
    "body" JSONB NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estimatedTokens" INTEGER NOT NULL,
    "actualTokens" INTEGER,
    "finished" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderState" (
    "id" TEXT NOT NULL,
    "cooldownUntil" TIMESTAMP(3),

    CONSTRAINT "ProviderState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrowserSession_tokenHash_key" ON "BrowserSession"("tokenHash");

-- CreateIndex
CREATE INDEX "ShoppingSession_ownerId_idx" ON "ShoppingSession"("ownerId");

-- CreateIndex
CREATE INDEX "Offer_roomId_briefVersion_status_idx" ON "Offer"("roomId", "briefVersion", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RoomEvent_roomId_sequence_key" ON "RoomEvent"("roomId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "Job_key_key" ON "Job"("key");

-- CreateIndex
CREATE INDEX "Job_state_runAt_idx" ON "Job"("state", "runAt");

-- CreateIndex
CREATE UNIQUE INDEX "Checkout_commandKey_key" ON "Checkout"("commandKey");

-- CreateIndex
CREATE UNIQUE INDEX "Checkout_paypalOrderId_key" ON "Checkout"("paypalOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Checkout_captureId_key" ON "Checkout"("captureId");

-- CreateIndex
CREATE INDEX "Checkout_state_updatedAt_idx" ON "Checkout"("state", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_checkoutId_listingId_key" ON "Reservation"("checkoutId", "listingId");

-- CreateIndex
CREATE INDEX "AiUsage_createdAt_idx" ON "AiUsage"("createdAt");

-- AddForeignKey
ALTER TABLE "ShoppingSession" ADD CONSTRAINT "ShoppingSession_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "BrowserSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ShoppingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomEvent" ADD CONSTRAINT "RoomEvent_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ShoppingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ShoppingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checkout" ADD CONSTRAINT "Checkout_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ShoppingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checkout" ADD CONSTRAINT "Checkout_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_checkoutId_fkey" FOREIGN KEY ("checkoutId") REFERENCES "Checkout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_checkoutId_fkey" FOREIGN KEY ("checkoutId") REFERENCES "Checkout"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "Listing" ADD CONSTRAINT "inventory_nonnegative" CHECK ("onHand" >= 0 AND "reserved" >= 0 AND "reserved" <= "onHand");
ALTER TABLE "Listing" ADD CONSTRAINT "valid_listing_prices" CHECK ("floorCents" >= 0 AND "floorCents" <= "listCents");
CREATE UNIQUE INDEX "one_unresolved_checkout_per_room" ON "Checkout"("roomId") WHERE state NOT IN ('cancelled', 'expired', 'failed');
