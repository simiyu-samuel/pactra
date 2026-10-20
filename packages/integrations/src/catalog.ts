import { randomUUID, createHash } from 'node:crypto';
import { z } from 'zod';
import { db, json, lockSeller } from '@pactra/database';
import { RuleError } from '@pactra/domain';
import { ensurePolicyVersion, sellerSnapshot } from './policies';
const productInput = z.object({
  commandKey: z.uuid(), expectedVersion: z.number().int().positive(),
  name: z.string().trim().min(2).max(100), category: z.string().trim().min(2).max(40).regex(/^[a-z][a-z0-9_ -]*$/),
  description: z.string().trim().min(10).max(1000),
  listCents: z.number().int().min(100).max(1000000), floorCents: z.number().int().min(0).max(1000000),
  onHand: z.number().int().min(1).max(10000),
}).strict().refine(x => x.floorCents <= x.listCents, 'Your minimum price cannot exceed the asking price.');
export async function addSellerProduct(sellerId: string, raw: unknown, ownerSessionId: string) {
  const input = productInput.parse(raw);
  const requestHash = createHash('sha256').update('add-product:' + JSON.stringify(input)).digest('hex');
  return db.$transaction(async tx => {
    await lockSeller(tx, sellerId);
    const previous = await tx.sellerPolicyVersion.findUnique({ where: { commandKey: input.commandKey } });
    if (previous) {
      if (previous.sellerId !== sellerId || previous.requestHash !== requestHash) throw new RuleError('COMMAND_CONFLICT', 'This saved request belongs to a different product.');
      return { version: previous.version };
    }
    const seller = await tx.seller.findUnique({ where: { id: sellerId }, include: { _count: { select: { listings: true } } } });
    if (!seller) throw new RuleError('NOT_FOUND', 'Seller not found.', 404);
    if (seller.policyVersion !== input.expectedVersion) throw new RuleError('POLICY_CONFLICT', 'Your shop changed. Refresh it before adding this product.');
    if (seller._count.listings >= 50) throw new RuleError('CATALOG_LIMIT', 'This demo shop supports up to 50 products.');
    await ensurePolicyVersion(tx, sellerId);
    const product = await tx.product.create({ data: { id: randomUUID(), name: input.name, role: input.category, description: input.description, score: 50, video: 'not_applicable', audio: 'not_applicable', mount: 'not_applicable' } });
    await tx.listing.create({ data: { id: randomUUID(), sellerId, productId: product.id, listCents: input.listCents, floorCents: input.floorCents, onHand: input.onHand } });
    const version = seller.policyVersion + 1;
    await tx.seller.update({ where: { id: sellerId }, data: { policyVersion: version } });
    await tx.sellerPolicyVersion.create({ data: { sellerId, version, snapshot: json(await sellerSnapshot(tx, sellerId)), commandKey: input.commandKey, requestHash, source: 'owner_publish', publishedBy: ownerSessionId, note: 'Added product: ' + input.name } });
    return { version };
  });
}
