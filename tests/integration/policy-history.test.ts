import { afterAll, afterEach, beforeEach, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { db, json } from '../../packages/database/src/index';
import { makeOffer } from '../../packages/domain/src/index';
import { ensurePolicyVersion, publishPolicy, recordBrief, type PolicyDraft } from '../../packages/integrations/src/policies';
import { acceptOffer, cancelCheckout } from '../../packages/integrations/src/checkout';
if (!process.env.DATABASE_URL?.split('?')[0].endsWith('/pactra_test')) throw new Error('Policy tests require pactra_test.');
let sellerId: string;
let roomId: string;
let ownerId: string;
beforeEach(async () => {
  const base = await db.seller.findUniqueOrThrow({ where: { id: 'studio_stack' }, include: { listings: true } });
  sellerId = `test_${randomUUID()}`;
  await db.seller.create({ data: { id: sellerId, name: 'Policy test seller', strategy: 'bundle_first', privateInstructions: 'A private pricing instruction.', warrantyMonths: 24, standardCents: 1000, standardDays: 4, expressCents: 2000, expressDays: 2 } });
  for (const l of base.listings.filter(l => ['SS-CAM-02', 'SS-MIC-01', 'SS-TRI-01'].includes(l.id))) await db.listing.create({ data: { id: `${sellerId}_${l.id}`, sellerId, productId: l.productId, listCents: l.listCents, floorCents: l.floorCents, onHand: 3 } });
  const owner = await db.browserSession.create({ data: { tokenHash: randomUUID(), expiresAt: new Date(Date.now() + 60_000) } });
  ownerId = owner.id;
  const room = await db.shoppingSession.create({ data: { ownerId, brief: { goal: 'A 4K creator camera, microphone and tripod kit.', capCents: 43000, maxDays: 4, preference: 'quality', discloseBudget: false } } });
  roomId = room.id;
  await db.$transaction(async tx => { await ensurePolicyVersion(tx, sellerId); await recordBrief(tx, roomId, 1, room.brief); });
});
afterEach(async () => {
  await db.reservation.deleteMany({ where: { checkout: { roomId } } });
  await db.checkout.deleteMany({ where: { roomId } });
  await db.offer.deleteMany({ where: { roomId } });
  await db.roomEvent.deleteMany({ where: { roomId } });
  await db.shoppingSession.delete({ where: { id: roomId } });
  await db.browserSession.delete({ where: { id: ownerId } });
  await db.sellerPolicyVersion.deleteMany({ where: { sellerId } });
  await db.listing.deleteMany({ where: { sellerId } });
  await db.seller.delete({ where: { id: sellerId } });
});
afterAll(() => db.$disconnect());
async function draft(): Promise<PolicyDraft> {
  const s = await db.seller.findUniqueOrThrow({ where: { id: sellerId }, include: { listings: true } });
  return { commandKey: randomUUID(), expectedVersion: s.policyVersion, note: 'Test policy publication', strategy: 'bundle_first', privateInstructions: 'Prefer microphone concessions.', warrantyMonths: 24, standardCents: 1000, standardDays: 4, expressCents: 2000, expressDays: 2, listings: s.listings.map(l => ({ id: l.id, floorCents: l.floorCents, onHand: l.onHand, expectedOnHand: l.onHand, expectedReserved: l.reserved })) };
}
async function offer() {
  const s = await db.seller.findUniqueOrThrow({ where: { id: sellerId }, include: { listings: { include: { product: true } } } });
  const terms = makeOffer({ action: 'offer', shipping: 'standard', message: 'A policy-backed creator kit.', items: [['SS-CAM-02', 37900], ['SS-MIC-01', 1900], ['SS-TRI-01', 1100]].map(([id, price]) => ({ listingId: `${sellerId}_${id}`, quantity: 1, unitPriceCents: price })) }, s, s.listings.map(l => ({ ...l, available: l.onHand - l.reserved })))!;
  return db.offer.create({ data: { roomId, sellerId, briefVersion: 1, policyVersion: s.policyVersion, round: 1, terms: JSON.parse(JSON.stringify(terms)), expiresAt: new Date(Date.now() + 60_000) } });
}
it('publishes once on retry and rejects conflicting reuse of a publish command', async () => {
  const input = await draft();
  const first = await publishPolicy(sellerId, input, 'test-owner');
  const retry = await publishPolicy(sellerId, input, 'test-owner');
  expect(retry).toEqual(first);
  expect(await db.sellerPolicyVersion.count({ where: { sellerId } })).toBe(2);
  await expect(publishPolicy(sellerId, { ...input, note: 'A different edit' }, 'test-owner')).rejects.toMatchObject({ code: 'COMMAND_CONFLICT' });
});
it('serializes two publishers and rejects the stale draft without an extra version', async () => {
  const a = await draft(); const b = { ...a, commandKey: randomUUID(), note: 'Another concurrent edit' };
  const results = await Promise.allSettled([publishPolicy(sellerId, a, 'test-owner'), publishPolicy(sellerId, b, 'test-owner')]);
  expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
  expect((await db.seller.findUniqueOrThrow({ where: { id: sellerId } })).policyVersion).toBe(2);
  expect(await db.sellerPolicyVersion.count({ where: { sellerId } })).toBe(2);
});
it('rejects unknown listings and invalid floors atomically', async () => {
  const input = await draft();
  await expect(publishPolicy(sellerId, { ...input, listings: [{ ...input.listings[0], id: 'SS-CAM-02' }, ...input.listings.slice(1)] }, 'test-owner')).rejects.toMatchObject({ code: 'POLICY_LISTINGS_INVALID' });
  const invalid = input.listings.map((l, i) => ({ ...l, floorCents: i === input.listings.length - 1 ? 999999 : l.floorCents + 100 }));
  await expect(publishPolicy(sellerId, { ...input, listings: invalid }, 'test-owner')).rejects.toMatchObject({ code: 'FLOOR_ABOVE_LIST' });
  expect((await db.seller.findUniqueOrThrow({ where: { id: sellerId } })).policyVersion).toBe(1);
  expect(await db.sellerPolicyVersion.count({ where: { sellerId } })).toBe(1);
});
it('detects changed inventory and refuses to reduce stock below held units', async () => {
  const input = await draft();
  await db.listing.update({ where: { id: input.listings[0].id }, data: { reserved: 1 } });
  await expect(publishPolicy(sellerId, input, 'test-owner')).rejects.toMatchObject({ code: 'INVENTORY_CHANGED' });
  const refreshed = await draft(); refreshed.listings.find(l => l.id === input.listings[0].id)!.onHand = 0;
  await expect(publishPolicy(sellerId, refreshed, 'test-owner')).rejects.toMatchObject({ code: 'RESERVED_STOCK' });
});
it('rejects accepting an unlocked offer after its seller policy changes', async () => {
  const o = await offer();
  await publishPolicy(sellerId, await draft(), 'test-owner');
  await expect(acceptOffer(ownerId, o.id, randomUUID())).rejects.toMatchObject({ code: 'STALE_OFFER' });
  expect(await db.reservation.count({ where: { listing: { sellerId } } })).toBe(0);
});
it('keeps a reserved agreement linked to its original policy and confirmed brief', async () => {
  const o = await offer(); const c = await acceptOffer(ownerId, o.id, randomUUID());
  const input = await draft(); input.warrantyMonths = 36; input.listings[0].floorCents += 100;
  await publishPolicy(sellerId, input, 'test-owner');
  const preserved = await db.checkout.findUniqueOrThrow({ where: { id: c.id }, include: { sellerPolicyVersion: true, buyerBriefVersion: true } });
  expect(preserved.snapshot).toEqual(c.snapshot); expect(preserved.snapshotHash).toBe(c.snapshotHash);
  expect(preserved.sellerPolicyVersion?.version).toBe(1); expect(preserved.buyerBriefVersion?.version).toBe(1);
  expect(JSON.stringify(preserved.snapshot)).not.toContain('floorCents'); expect(JSON.stringify(preserved.snapshot)).not.toContain('privateInstructions');
  await cancelCheckout(c.id, ownerId);
});
it('preserves two brief versions and prevents updates to published history', async () => {
  const room = await db.shoppingSession.findUniqueOrThrow({ where: { id: roomId } });
  const changed = { ...(room.brief as Record<string, unknown>), capCents: 40000 };
  await db.$transaction(async tx => { await recordBrief(tx, roomId, 2, changed); await tx.shoppingSession.update({ where: { id: roomId }, data: { version: 2, brief: json(changed) } }); });
  const versions = await db.buyerBriefVersion.findMany({ where: { roomId }, orderBy: { version: 'asc' } });
  expect((versions[0].brief as { capCents: number }).capCents).toBe(43000);
  expect((versions[1].brief as { capCents: number }).capCents).toBe(40000);
  await expect(db.buyerBriefVersion.update({ where: { id: versions[0].id }, data: { brief: changed } })).rejects.toThrow('immutable');
  const policy = await db.sellerPolicyVersion.findFirstOrThrow({ where: { sellerId } });
  await expect(db.sellerPolicyVersion.update({ where: { id: policy.id }, data: { note: 'Overwrite history' } })).rejects.toThrow('immutable');
});
