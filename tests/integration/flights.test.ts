import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeEach, expect, it, vi } from 'vitest';
import { db } from '../../packages/database/src/index';
import { searchFlights, refreshFlight } from '../../packages/integrations/src/flights';
import { flightQuery, rawFlight } from '../flight-fixtures';
if (!process.env.DATABASE_URL?.split('?')[0].endsWith('/pactra_test')) throw new Error('Flight tests require pactra_test.');
const owners: string[] = [];
async function owner() { const s = await db.browserSession.create({ data: { tokenHash: randomUUID(), expiresAt: new Date(Date.now() + 600000) } }); owners.push(s.id); return s.id; }
beforeEach(async () => { await db.flightSearch.deleteMany(); vi.stubEnv('DUFFEL_ACCESS_TOKEN', 'duffel_test_never_sent'); vi.stubEnv('DUFFEL_DAILY_CALL_LIMIT', '100'); });
afterEach(async () => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); await db.flightSearch.deleteMany(); await db.browserSession.deleteMany({ where: { id: { in: owners.splice(0) } } }); });
afterAll(() => db.$disconnect());
const success = () => new Response(JSON.stringify({ data: { live_mode: false, offers: [rawFlight()] } }));
it('reuses results only for the owning browser without another provider call', async () => {
  const fetcher = vi.fn(async () => success()); vi.stubGlobal('fetch', fetcher); const a = await owner(), b = await owner();
  const one = await searchFlights(a, flightQuery()); expect(one.offers).toHaveLength(1);
  expect(await searchFlights(a, flightQuery())).toMatchObject({ id: one.id, cached: true }); expect(fetcher).toHaveBeenCalledTimes(1);
  await searchFlights(b, flightQuery()); expect(fetcher).toHaveBeenCalledTimes(2);
});
it('allocates three flexible-date calls atomically before provider requests', async () => {
  vi.stubEnv('DUFFEL_DAILY_CALL_LIMIT', '2'); const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  await expect(searchFlights(await owner(), { ...flightQuery(), flexDays: 1 })).rejects.toMatchObject({ code: 'FLIGHT_DAILY_LIMIT' }); expect(fetcher).not.toHaveBeenCalled();
});
it('retains partial-date results and reports the failed date', async () => {
  vi.stubGlobal('fetch', vi.fn(async (_url: string, options: { body: string }) => {
    const body = JSON.parse(options.body).data; const d = body.slices[0].departure_date;
    if (d < flightQuery().departureDate) return new Response('{}', { status: 503 });
    return new Response(JSON.stringify({ data: { live_mode: false, offers: [rawFlight({ ...flightQuery(), departureDate: d }, `off_${d.replaceAll('-', '')}`)] } }));
  }));
  const result = await searchFlights(await owner(), { ...flightQuery(), flexDays: 1 }); expect(result.failedDates).toHaveLength(1); expect(result.offers).toHaveLength(2);
  expect((await db.flightSearch.findUniqueOrThrow({ where: { id: result.id } })).calls).toBe(3);
});
it('counts failed attempts and frees the in-flight admission slot', async () => {
  const a = await owner(); vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 503 })));
  await expect(searchFlights(a, flightQuery())).rejects.toMatchObject({ code: 'FLIGHT_PROVIDER_UNAVAILABLE' });
  expect(await db.flightSearch.findFirst({ where: { ownerId: a } })).toMatchObject({ state: 'failed', calls: 1 });
  vi.stubGlobal('fetch', vi.fn(async () => success())); await expect(searchFlights(a, flightQuery())).resolves.toHaveProperty('offers');
});
it('rejects foreign refreshes and returns a changed price without approving a purchase', async () => {
  const a = await owner(), b = await owner(); const fetcher = vi.fn(async (url: string) => url.includes('/air/offers/') ? new Response(JSON.stringify({ data: rawFlight(flightQuery(), 'off_test_1', '475.00') })) : success()); vi.stubGlobal('fetch', fetcher);
  const result = await searchFlights(a, flightQuery());
  await expect(refreshFlight(b, result.id, 'off_test_1')).rejects.toMatchObject({ code: 'NOT_FOUND' }); expect(fetcher).toHaveBeenCalledTimes(1);
  expect(await refreshFlight(a, result.id, 'off_test_1')).toMatchObject({ previousAmount: '450.00', offer: { totalAmount: '475.00' } });
  await expect(refreshFlight(a, result.id, 'off_test_1')).rejects.toMatchObject({ code: 'FLIGHT_REFRESH_LIMIT' });
});
it('rejects a refreshed offer that silently changes its flight itinerary', async () => {
  const a = await owner(); vi.stubGlobal('fetch', vi.fn(async () => success())); const result = await searchFlights(a, flightQuery());
  const changed = rawFlight(); changed.slices[0].segments[0].operating_carrier_flight_number = '999';
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ data: changed }))));
  await expect(refreshFlight(a, result.id, 'off_test_1')).rejects.toMatchObject({ code: 'FLIGHT_UNAVAILABLE' });
});
it('refuses a live token before making any provider request', async () => {
  vi.stubEnv('DUFFEL_ACCESS_TOKEN', 'duffel_live_never_sent'); const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  await expect(searchFlights(await owner(), flightQuery())).rejects.toMatchObject({ code: 'FLIGHTS_NOT_CONFIGURED' }); expect(fetcher).not.toHaveBeenCalled();
});
