-- SQL backfills used local CURRENT_TIMESTAMP with timestamp-without-time-zone.
-- Normalize only these import timestamps; owner-published values remain intact.
BEGIN;
ALTER TABLE "BuyerBriefVersion" DISABLE TRIGGER "buyer_brief_immutable";
ALTER TABLE "SellerPolicyVersion" DISABLE TRIGGER "seller_policy_immutable";
UPDATE "BuyerBriefVersion" SET "createdAt" = ("createdAt" AT TIME ZONE current_setting('TimeZone')) AT TIME ZONE 'UTC' WHERE "source" = 'migration_current';
UPDATE "SellerPolicyVersion" SET "createdAt" = ("createdAt" AT TIME ZONE current_setting('TimeZone')) AT TIME ZONE 'UTC' WHERE "source" = 'migration_current';
ALTER TABLE "BuyerBriefVersion" ENABLE TRIGGER "buyer_brief_immutable";
ALTER TABLE "SellerPolicyVersion" ENABLE TRIGGER "seller_policy_immutable";
ALTER TABLE "BuyerBriefVersion" ALTER COLUMN "createdAt" SET DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC');
ALTER TABLE "SellerPolicyVersion" ALTER COLUMN "createdAt" SET DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC');
COMMIT;
