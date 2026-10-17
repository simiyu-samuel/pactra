import { beforeEach, afterAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { db, json } from '../../packages/database/src/index';
import { makeOffer } from '../../packages/domain/src/index';
import { acceptOffer, cancelCheckout } from '../../packages/integrations/src/checkout';

if (!process.env.DATABASE_URL?.split('?')[0].endsWith('/pactra_test')) throw new Error('Integration tests require the isolated pactra_test database.');
beforeEach(async () => {
  await db.paymentEvent.deleteMany(); await db.reservation.deleteMany(); await db.checkout.deleteMany(); await db.offer.deleteMany();
  await db.roomEvent.deleteMany(); await db.job.deleteMany(); await db.shoppingSession.deleteMany(); await db.browserSession.deleteMany();
  await db.listing.updateMany({ data: { reserved: 0, onHand: 5 } });
  await db.listing.update({ where: { id: 'SS-CAM-02' }, data: { onHand: 1 } });
});
afterAll(() => db.$disconnect());
async function fixture() {
  const owner = await db.browserSession.create({ data: { tokenHash: randomUUID(), expiresAt: new Date(Date.now() + 60000) } });
  const room = await db.shoppingSession.create({ data: { ownerId: owner.id, brief: { goal: 'A 4K creator camera, microphone and tripod kit.', capCents: 43000, maxDays: 4, preference: 'quality', discloseBudget: false } } });
  await db.job.create({ data: { key: `${room.id}:1`, roomId: room.id, briefVersion: 1 } });
  const seller = await db.seller.findUniqueOrThrow({ where: { id: 'studio_stack' }, include: { listings: { include: { product: true } } } });
  const terms = makeOffer({ action: 'offer', shipping: 'standard', message: 'A valid fictional kit.', items: [['SS-CAM-02', 37900], ['SS-MIC-01', 1900], ['SS-TRI-01', 1100]].map(([listingId, unitPriceCents]) => ({ listingId, unitPriceCents, quantity: 1 })) }, seller, seller.listings.map(x => ({ ...x, available: x.onHand - x.reserved })))!;
  const offer = await db.offer.create({ data: { roomId: room.id, sellerId: seller.id, briefVersion: 1, policyVersion: 1, round: 1, terms: json(terms), expiresAt: new Date(Date.now() + 60000) } });
  return { owner, room, offer };
}
describe('transactional agreement reservations', () => {
  it('allows exactly one buyer to reserve the last camera, without partial losing holds', async () => {
    const a = await fixture(); const b = await fixture();
    const outcomes = await Promise.allSettled([acceptOffer(a.owner.id, a.offer.id, randomUUID()), acceptOffer(b.owner.id, b.offer.id, randomUUID())]);
    expect(outcomes.filter(x => x.status === 'fulfilled')).toHaveLength(1);
    expect(await db.checkout.count()).toBe(1); expect(await db.reservation.count()).toBe(3);
    expect((await db.listing.findUniqueOrThrow({ where: { id: 'SS-CAM-02' } })).reserved).toBe(1);
  });
  it('reuses the same command without reserving inventory twice', async () => {
    const x = await fixture(); const key = randomUUID();
    const first = await acceptOffer(x.owner.id, x.offer.id, key); const again = await acceptOffer(x.owner.id, x.offer.id, key);
    expect(first.id).toBe(again.id); expect(await db.reservation.count()).toBe(3);
    expect((await db.job.findUniqueOrThrow({ where: { key: `${x.room.id}:1` } })).state).toBe('cancelled');
    await cancelCheckout(first.id, x.owner.id);
    expect((await db.listing.findUniqueOrThrow({ where: { id: 'SS-CAM-02' } })).reserved).toBe(0);
  });
  it('rejects another browser and a superseded brief', async () => {
    const x = await fixture();
    await expect(acceptOffer('different-owner', x.offer.id, randomUUID())).rejects.toThrow('not found');
    await db.shoppingSession.update({ where: { id: x.room.id }, data: { version: 2 } });
    await expect(acceptOffer(x.owner.id, x.offer.id, randomUUID())).rejects.toThrow('expired or changed');
    expect(await db.reservation.count()).toBe(0);
  });
});
