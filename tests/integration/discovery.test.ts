import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeEach, expect, it, vi } from 'vitest';
import { db } from '../../packages/database/src/index';
import { discover, refreshChannel3Product } from '../../packages/integrations/src/discovery';
if (!process.env.DATABASE_URL?.split('?')[0].endsWith('/pactra_test')) throw new Error('Discovery tests require pactra_test.');
const owners: string[] = [];
const payload = { products: [{ id: 'p1', title: 'Camera', offers: [{ url: 'https://store.com/item', domain: 'store.com', price: { price: 99, currency: 'USD' }, availability: 'InStock' }] }] };
async function owner() { const s = await db.browserSession.create({ data: { tokenHash: randomUUID(), expiresAt: new Date(Date.now() + 600_000) } }); owners.push(s.id); return s.id; }
beforeEach(async () => { await db.discoverySearch.deleteMany(); vi.stubEnv('CHANNEL3_API_KEY', 'test-key-never-sent'); vi.stubEnv('CHANNEL3_DAILY_LIMIT', '100'); });
afterEach(async () => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); await db.discoverySearch.deleteMany(); await db.browserSession.deleteMany({ where: { id: { in: owners.splice(0) } } }); });
afterAll(() => db.$disconnect());
it('caches by owning browser and query, refreshing volatile offers from IDs', async () => {
  const fetcher = vi.fn(async (url: string) => new Response(JSON.stringify(url.includes('/v1/products/') ? payload.products[0] : payload)));
  vi.stubGlobal('fetch', fetcher);
  const a = await owner(), b = await owner();
  const initial = await discover(a, 'camera', 'channel3');
  const cached = await discover(a, 'camera', 'channel3');
  expect(cached.cached).toBe(true); expect(cached.offers).toEqual(initial.offers.map(o => ({ ...o, observedAt: cached.observedAt }))); expect(fetcher).toHaveBeenCalledTimes(3);
  const stored = await db.discoverySearch.findFirst({ where: { ownerId: a } }); expect(stored?.result).toEqual({ source: 'channel3', productIds: ['p1'] });
  await discover(b, 'camera', 'channel3'); expect(fetcher).toHaveBeenCalledTimes(5);
});
it('enforces a durable shared daily cap before sending another provider request', async () => {
  vi.stubEnv('CHANNEL3_DAILY_LIMIT', '1');
  const fetcher = vi.fn(async (url: string) => new Response(JSON.stringify(url.includes('/v1/products/') ? payload.products[0] : payload))); vi.stubGlobal('fetch', fetcher);
  await discover(await owner(), 'camera', 'channel3');
  await expect(discover(await owner(), 'tripod', 'channel3')).rejects.toMatchObject({ code: 'SEARCH_DAILY_LIMIT' });
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it('counts failed requests and releases the per-browser in-flight slot', async () => {
  const a = await owner(); vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })));
  await expect(discover(a, 'camera', 'channel3')).rejects.toMatchObject({ code: 'RETAILER_SEARCH_UNAVAILABLE' });
  expect(await db.discoverySearch.findFirst({ where: { ownerId: a } })).toMatchObject({ state: 'failed' });
  vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(JSON.stringify(url.includes('/v1/products/') ? payload.products[0] : payload))));
  await expect(discover(a, 'tripod', 'channel3')).resolves.toMatchObject({ cached: false });
});
it('serializes concurrent searches in one browser before external calls', async () => {
  const a = await owner();
  await db.discoverySearch.create({ data: { ownerId: a, query: 'camera', source: 'channel3' } });
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  await expect(discover(a, 'tripod', 'channel3')).rejects.toMatchObject({ code: 'SEARCH_LIMIT' });
  expect(fetcher).not.toHaveBeenCalled();
});

it('refuses product detail refresh outside the owning browser searches', async () => {
  const a = await owner(), b = await owner();
  const fetcher = vi.fn(async (url: string) => new Response(JSON.stringify(url.includes('/v1/products/') ? payload.products[0] : payload))); vi.stubGlobal('fetch', fetcher);
  await discover(a, 'camera', 'channel3');
  await expect(refreshChannel3Product(b, 'p1')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  expect(fetcher).toHaveBeenCalledTimes(2);
  await expect(refreshChannel3Product(a, 'p1')).resolves.toMatchObject({ product: { id: 'p1' } });
});
