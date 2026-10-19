import { afterAll, afterEach, beforeEach, expect, it, vi } from 'vitest';
import { db } from '../../packages/database/src/index';
import { decide, QuotaWait } from '../../packages/integrations/src/groq';

if (!process.env.DATABASE_URL?.split('?')[0].endsWith('/pactra_test')) throw new Error('Quota tests require the isolated pactra_test database.');
const schema = { type: 'object', additionalProperties: false, required: ['ok'], properties: { ok: { type: 'boolean' } } };
beforeEach(async () => {
  await db.aiUsage.deleteMany();
  await db.providerState.deleteMany();
  // Every case stops at admission, before any provider request can be sent.
  vi.stubEnv('GROQ_API_KEY', 'quota-test-key-never-sent');
});
afterEach(() => vi.unstubAllEnvs());
afterAll(() => db.$disconnect());
it('rejects oversized context after taking the real PostgreSQL scheduler lock', async () => {
  vi.stubEnv('GROQ_TOKENS_PER_MINUTE', '1');
  await expect(decide('Connectivity check', {}, schema)).rejects.toMatchObject({ code: 'CONTEXT_TOO_LARGE' });
  expect(await db.aiUsage.count()).toBe(0);
});
it('honors shared cooldown without reserving a provider call', async () => {
  await db.providerState.create({ data: { id: 'groq', cooldownUntil: new Date(Date.now() + 60_000) } });
  await expect(decide('Connectivity check', {}, schema)).rejects.toBeInstanceOf(QuotaWait);
  expect(await db.aiUsage.count()).toBe(0);
});
it('waits for an unfinished request instead of sending concurrent calls', async () => {
  await db.aiUsage.create({ data: { estimatedTokens: 1000 } });
  await expect(decide('Connectivity check', {}, schema)).rejects.toBeInstanceOf(QuotaWait);
  expect(await db.aiUsage.count()).toBe(1);
});
