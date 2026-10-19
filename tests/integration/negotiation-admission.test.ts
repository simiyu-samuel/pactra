import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, expect, it, vi } from 'vitest';
import { db } from '../../packages/database/src/index';
import { createNegotiation, negotiationAllowance, negotiationLimit } from '../../packages/integrations/src/negotiations';
if (!process.env.DATABASE_URL?.split('?')[0].endsWith('/pactra_test')) throw new Error('Admission tests require pactra_test.');
const owners: string[] = [];
const brief = { goal: 'A creator kit with a camera, microphone and tripod.', capCents: 50000, maxDays: 4, preference: 'quality' as const, discloseBudget: false };
async function owner() { const row = await db.browserSession.create({ data: { tokenHash: randomUUID(), expiresAt: new Date(Date.now() + 600_000) } }); owners.push(row.id); return row.id; }
afterEach(async () => {
  vi.unstubAllEnvs();
  const ids = owners.splice(0);
  const rooms = { room: { ownerId: { in: ids } } };
  await db.buyerBriefVersion.deleteMany({ where: rooms }); await db.job.deleteMany({ where: rooms }); await db.roomEvent.deleteMany({ where: rooms });
  await db.shoppingSession.deleteMany({ where: { ownerId: { in: ids } } }); await db.browserSession.deleteMany({ where: { id: { in: ids } } });
});
afterAll(() => db.$disconnect());
it('defaults safely and accepts a bounded configurable local allowance', () => {
  for (const value of ['', '0', '-1', 'abc', '1.5', '1000']) { vi.stubEnv('NEGOTIATIONS_PER_BROWSER_PER_DAY', value); expect(negotiationLimit()).toBe(3); }
  vi.stubEnv('NEGOTIATIONS_PER_BROWSER_PER_DAY', '50'); expect(negotiationLimit()).toBe(50);
});
it('admits only one of two concurrent new rooms at a one-room limit', async () => {
  vi.stubEnv('NEGOTIATIONS_PER_BROWSER_PER_DAY', '1'); const id = await owner();
  const outcomes = await Promise.allSettled([createNegotiation(id, brief, randomUUID()), createNegotiation(id, brief, randomUUID())]);
  expect(outcomes.filter(r => r.status === 'fulfilled')).toHaveLength(1);
  expect(outcomes.find(r => r.status === 'rejected')).toMatchObject({ reason: { code: 'SESSION_LIMIT' } });
  expect(await db.shoppingSession.count({ where: { ownerId: id } })).toBe(1);
});
it('allows an idempotent retry after the allowance is consumed without creating another job', async () => {
  vi.stubEnv('NEGOTIATIONS_PER_BROWSER_PER_DAY', '1'); const id = await owner(), key = randomUUID();
  const room = await createNegotiation(id, brief, key);
  expect((await createNegotiation(id, brief, key)).id).toBe(room.id);
  expect(await db.job.count({ where: { roomId: room.id } })).toBe(1);
  expect(await negotiationAllowance(id)).toMatchObject({ used: 1, remaining: 0 });
});
it('reports the rolling reset and isolates recent-room links by browser', async () => {
  vi.stubEnv('NEGOTIATIONS_PER_BROWSER_PER_DAY', '1'); const a = await owner(), b = await owner();
  const room = await createNegotiation(a, brief, randomUUID()); const status = await negotiationAllowance(a);
  expect(status.nextAvailableAt).toBe(new Date(+room.createdAt + 86_400_000).toISOString());
  expect(status.recentRooms[0].id).toBe(room.id); expect((await negotiationAllowance(b)).recentRooms).toEqual([]);
});
it('releases the allowance once a room is more than 24 hours old', async () => {
  vi.stubEnv('NEGOTIATIONS_PER_BROWSER_PER_DAY', '1'); const id = await owner(); const room = await createNegotiation(id, brief, randomUUID());
  await db.shoppingSession.update({ where: { id: room.id }, data: { createdAt: new Date(Date.now() - 86_401_000) } });
  expect(await negotiationAllowance(id)).toMatchObject({ remaining: 1, nextAvailableAt: null });
  await expect(createNegotiation(id, brief, randomUUID())).resolves.toHaveProperty('id');
});
