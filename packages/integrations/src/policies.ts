import { createHash } from 'node:crypto';
import { z } from 'zod';
import { db, json, lockSeller, type Tx } from '@pactra/database';
import { RuleError } from '@pactra/domain';

export const policyDraftSchema = z.object({
  commandKey: z.uuid(), expectedVersion: z.number().int().positive(),
  note: z.string().trim().min(3).max(200),
  strategy: z.enum(['price_first', 'bundle_first', 'speed_first']),
  privateInstructions: z.string().trim().max(1000),
  warrantyMonths: z.number().int().min(0).max(60),
  standardCents: z.number().int().min(0).max(10000), standardDays: z.number().int().min(1).max(30),
  expressCents: z.number().int().min(0).max(10000), expressDays: z.number().int().min(1).max(30),
  listings: z.array(z.object({ id: z.string().min(1).max(80), floorCents: z.number().int().min(0).max(1000000), onHand: z.number().int().min(0).max(10000), expectedOnHand: z.number().int().min(0), expectedReserved: z.number().int().min(0) }).strict()).min(1).max(50),
}).strict().refine(x => x.expressDays <= x.standardDays, 'Express delivery must be no slower than standard delivery.');
export type PolicyDraft = z.infer<typeof policyDraftSchema>;

export async function sellerSnapshot(tx: Tx, sellerId: string) {
  const seller = await tx.seller.findUniqueOrThrow({ where: { id: sellerId }, include: { listings: { orderBy: { id: 'asc' } } } });
  const { listings, ...policy } = seller;
  return { seller: policy, listings: listings.map(({ id, productId, listCents, floorCents, onHand, reserved }) => ({ id, productId, listCents, floorCents, onHand, reserved })) };
}

export async function ensurePolicyVersion(tx: Tx, sellerId: string) {
  // Caller holds the seller lock, making the initial snapshot race-free.
  const snapshot = await sellerSnapshot(tx, sellerId);
  return tx.sellerPolicyVersion.upsert({ where: { sellerId_version: { sellerId, version: snapshot.seller.policyVersion } }, update: {}, create: { sellerId, version: snapshot.seller.policyVersion, snapshot: json(snapshot), source: 'current_baseline', note: 'Current policy baseline' } });
}

export async function recordBrief(tx: Tx, roomId: string, version: number, brief: unknown, source = 'buyer_confirmed') {
  return tx.buyerBriefVersion.upsert({ where: { roomId_version: { roomId, version } }, update: {}, create: { roomId, version, brief: json(brief), source } });
}

export async function publishPolicy(sellerId: string, raw: unknown, ownerSessionId: string) {
  const input = policyDraftSchema.parse(raw);
  const canonical = { ...input, listings: [...input.listings].sort((a, b) => a.id.localeCompare(b.id)) };
  const requestHash = createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
  return db.$transaction(async tx => {
    await lockSeller(tx, sellerId);
    const seller = await tx.seller.findUnique({ where: { id: sellerId }, include: { listings: { orderBy: { id: 'asc' } } } });
    if (!seller) throw new RuleError('NOT_FOUND', 'Seller not found.', 404);
    const previous = await tx.sellerPolicyVersion.findUnique({ where: { commandKey: input.commandKey } });
    if (previous) {
      if (previous.sellerId !== sellerId || previous.requestHash !== requestHash) throw new RuleError('COMMAND_CONFLICT', 'This publish command was used for a different draft.');
      return { version: previous.version, id: previous.id };
    }
    if (seller.policyVersion !== input.expectedVersion) throw new RuleError('POLICY_CONFLICT', 'This seller changed since you opened the draft. Reload the current policy.');
    if (input.listings.length !== seller.listings.length || new Set(input.listings.map(x => x.id)).size !== seller.listings.length || input.listings.some(x => !seller.listings.some(l => l.id === x.id))) throw new RuleError('POLICY_LISTINGS_INVALID', 'Publish exactly this seller’s existing listings.');
    // Same seller -> sorted listing order is also used during acceptance.
    for (const listing of seller.listings) await tx.$queryRaw`SELECT id FROM "Listing" WHERE id = ${listing.id} FOR UPDATE`;
    const current = await tx.listing.findMany({ where: { sellerId } });
    for (const line of input.listings) {
      const listing = current.find(l => l.id === line.id)!;
      if (listing.onHand !== line.expectedOnHand || listing.reserved !== line.expectedReserved) throw new RuleError('INVENTORY_CHANGED', 'Stock or reservations changed while you edited. Reload before publishing.');
      if (line.onHand < listing.reserved) throw new RuleError('RESERVED_STOCK', 'Total stock cannot be lower than units already reserved.');
      if (line.floorCents > listing.listCents) throw new RuleError('FLOOR_ABOVE_LIST', 'A minimum price cannot exceed its listed price.');
    }
    await ensurePolicyVersion(tx, sellerId);
    const nextVersion = seller.policyVersion + 1;
    await tx.seller.update({ where: { id: sellerId }, data: { strategy: input.strategy, privateInstructions: input.privateInstructions, warrantyMonths: input.warrantyMonths, standardCents: input.standardCents, standardDays: input.standardDays, expressCents: input.expressCents, expressDays: input.expressDays, policyVersion: nextVersion } });
    for (const line of input.listings) await tx.listing.update({ where: { id: line.id }, data: { floorCents: line.floorCents, onHand: line.onHand } });
    const snapshot = await sellerSnapshot(tx, sellerId);
    const published = await tx.sellerPolicyVersion.create({ data: { sellerId, version: nextVersion, snapshot: json(snapshot), source: 'owner_publish', note: input.note, publishedBy: ownerSessionId, commandKey: input.commandKey, requestHash } });
    return { id: published.id, version: published.version };
  }, { timeout: 15000 });
}
