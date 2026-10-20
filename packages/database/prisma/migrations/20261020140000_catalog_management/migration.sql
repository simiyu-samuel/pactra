ALTER TABLE "Product" ADD COLUMN "brand" TEXT NOT NULL DEFAULT '', ADD COLUMN "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], ADD COLUMN "sourceUrl" TEXT, ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT true, ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Listing" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_status_valid" CHECK ("status" IN ('draft','active','archived'));
