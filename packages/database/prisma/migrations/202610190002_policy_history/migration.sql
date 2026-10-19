ALTER TABLE "Seller" ADD COLUMN "privateInstructions" TEXT NOT NULL DEFAULT '';
CREATE TABLE "OwnerSession" ("id" TEXT PRIMARY KEY, "tokenHash" TEXT NOT NULL UNIQUE, "credentialDigest" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL);
CREATE TABLE "OwnerLoginWindow" ("id" TEXT PRIMARY KEY, "startedAt" TIMESTAMP(3) NOT NULL, "attempts" INTEGER NOT NULL CHECK ("attempts" >= 0));
CREATE TABLE "BuyerBriefVersion" (
 "id" TEXT PRIMARY KEY, "roomId" TEXT NOT NULL REFERENCES "ShoppingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "version" INTEGER NOT NULL CHECK ("version" > 0), "brief" JSONB NOT NULL, "source" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE ("roomId", "version")
);
CREATE TABLE "SellerPolicyVersion" (
 "id" TEXT PRIMARY KEY, "sellerId" TEXT NOT NULL REFERENCES "Seller"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "version" INTEGER NOT NULL CHECK ("version" > 0), "snapshot" JSONB NOT NULL, "source" TEXT NOT NULL, "note" TEXT NOT NULL,
 "publishedBy" TEXT, "commandKey" TEXT UNIQUE, "requestHash" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE ("sellerId", "version")
);
ALTER TABLE "Checkout" ADD COLUMN "buyerBriefVersionId" TEXT REFERENCES "BuyerBriefVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 ADD COLUMN "sellerPolicyVersionId" TEXT REFERENCES "SellerPolicyVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Listing" ADD CONSTRAINT "listing_inventory_valid" CHECK ("onHand" >= 0 AND "reserved" >= 0 AND "reserved" <= "onHand"),
 ADD CONSTRAINT "listing_prices_valid" CHECK ("floorCents" >= 0 AND "floorCents" <= "listCents");
-- Only current legacy values can be recovered; earlier overwritten values are not fabricated.
INSERT INTO "BuyerBriefVersion" ("id", "roomId", "version", "brief", "source", "createdAt")
 SELECT gen_random_uuid()::text, "id", "version", "brief", 'migration_current', CURRENT_TIMESTAMP FROM "ShoppingSession";
INSERT INTO "SellerPolicyVersion" ("id", "sellerId", "version", "snapshot", "source", "note")
 SELECT gen_random_uuid()::text, s."id", s."policyVersion",
 jsonb_build_object('seller', to_jsonb(s), 'listings', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', l."id", 'productId', l."productId", 'listCents', l."listCents", 'floorCents', l."floorCents", 'onHand', l."onHand", 'reserved', l."reserved") ORDER BY l."id") FROM "Listing" l WHERE l."sellerId" = s."id"), '[]'::jsonb)),
 'migration_current', 'Current policy captured during history migration' FROM "Seller" s;
CREATE FUNCTION pactra_reject_version_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Published version records are immutable'; END;
$$;
CREATE TRIGGER "buyer_brief_immutable" BEFORE UPDATE ON "BuyerBriefVersion" FOR EACH ROW EXECUTE FUNCTION pactra_reject_version_update();
CREATE TRIGGER "seller_policy_immutable" BEFORE UPDATE ON "SellerPolicyVersion" FOR EACH ROW EXECUTE FUNCTION pactra_reject_version_update();
