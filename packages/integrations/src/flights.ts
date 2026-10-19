import { createHash } from 'node:crypto';
import { db, json } from '@pactra/database';
import { flightSearchSchema, shiftedFlightDates, RuleError, type FlightOffer, type FlightResult } from '@pactra/domain';
import { duffelConfigured, requestFlightOffers, retrieveFlightOffer } from './duffel';
const cap = () => { const value = Number(process.env.DUFFEL_DAILY_CALL_LIMIT); return Number.isSafeInteger(value) && value >= 1 && value <= 1000 ? value : 100; };
export async function searchFlights(ownerId: string, raw: unknown): Promise<FlightResult> {
  const query = flightSearchSchema.parse(raw);
  if (!duffelConfigured()) throw new RuleError('FLIGHTS_NOT_CONFIGURED', 'Flight search is being connected. You can preview the example experience meanwhile.', 503);
  const dates = shiftedFlightDates(query);
  const queryHash = createHash('sha256').update(JSON.stringify(query)).digest('hex');
  const slot = await db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(71934025)`;
    const now = Date.now();
    const cached = await tx.flightSearch.findFirst({ where: { ownerId, queryHash, state: 'complete', createdAt: { gt: new Date(now - 90_000) } }, orderBy: { createdAt: 'desc' } });
    if (cached) {
      const result = cached.result as unknown as FlightResult;
      const offers = result.offers.filter(o => +new Date(o.expiresAt) > now);
      if (offers.length || !result.offers.length) return { cached: { ...result, offers, cached: true }, id: cached.id };
    }
    const recent = await tx.flightSearch.findMany({ where: { ownerId, createdAt: { gt: new Date(now - 3_600_000) } }, select: { state: true, createdAt: true } });
    if (recent.length >= 10 || recent.some(s => s.state === 'running' && +s.createdAt > now - 60_000)) throw new RuleError('FLIGHT_SEARCH_LIMIT', 'Please wait before searching again. Each browser can make ten flight searches per hour.', 429);
    const totals = await tx.flightSearch.aggregate({ where: { createdAt: { gt: new Date(now - 86_400_000) } }, _sum: { calls: true, refreshes: true } });
    if ((totals._sum.calls || 0) + (totals._sum.refreshes || 0) + dates.length > cap()) throw new RuleError('FLIGHT_DAILY_LIMIT', 'Today’s flight-search allowance has been used. Please try again tomorrow.', 429);
    const row = await tx.flightSearch.create({ data: { ownerId, query: json(query), queryHash, calls: dates.length } });
    return { cached: null, id: row.id };
  });
  if (slot.cached) return slot.cached;
  try {
    const outcomes = await Promise.allSettled(dates.map(d => requestFlightOffers(query, d)));
    if (outcomes.every(r => r.status === 'rejected')) throw new RuleError('FLIGHT_PROVIDER_UNAVAILABLE', 'The flight provider could not return fares for these dates. Please try again later.', 502);
    const offers = outcomes.flatMap(r => r.status === 'fulfilled' ? r.value : []);
    // Retain the cheapest returned options within each currency for every searched date.
    const kept = dates.flatMap(d => {
      const dayOffers = offers.filter(o => o.departureDate === d.departureDate);
      return [...new Set(dayOffers.map(o => o.currency))].flatMap(currency => dayOffers.filter(o => o.currency === currency).sort((a, b) => Number(a.totalAmount) - Number(b.totalAmount)).slice(0, 12));
    });
    const result: FlightResult = { id: slot.id, query, offers: kept, searchedDates: dates.map(d => d.departureDate), failedDates: dates.filter((_, i) => outcomes[i].status === 'rejected').map(d => d.departureDate), observedAt: new Date().toISOString(), cached: false, source: 'duffel_test' };
    await db.flightSearch.update({ where: { id: slot.id }, data: { state: 'complete', result: json(result) } });
    return result;
  } catch (error) {
    await db.flightSearch.update({ where: { id: slot.id }, data: { state: 'failed' } });
    if (error instanceof RuleError) throw error;
    throw new RuleError('FLIGHT_SEARCH_UNAVAILABLE', 'Flight search could not complete. Please try again later.', 502);
  }
}
export async function refreshFlight(ownerId: string, searchId: string, offerId: string) {
  const item = await db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(71934025)`;
    const search = await tx.flightSearch.findFirst({ where: { id: searchId, ownerId, state: 'complete', createdAt: { gt: new Date(Date.now() - 86_400_000) } } });
    const result = search?.result as unknown as FlightResult | undefined;
    const offer = result?.offers.find(o => o.id === offerId && o.source === 'duffel_test');
    if (!search || !offer || !result) throw new RuleError('NOT_FOUND', 'This fare was not found in your browser’s searches.', 404);
    if (+new Date(offer.expiresAt) <= Date.now()) throw new RuleError('FLIGHT_UNAVAILABLE', 'This fare has expired. Run a new search.', 409);
    if (search.refreshes >= 10 || search.lastRefreshAt && +search.lastRefreshAt > Date.now() - 10_000) throw new RuleError('FLIGHT_REFRESH_LIMIT', 'Wait ten seconds before refreshing another fare. Each search allows ten refreshes.', 429);
    const totals = await tx.flightSearch.aggregate({ where: { createdAt: { gt: new Date(Date.now() - 86_400_000) } }, _sum: { calls: true, refreshes: true } });
    if ((totals._sum.calls || 0) + (totals._sum.refreshes || 0) >= cap()) throw new RuleError('FLIGHT_DAILY_LIMIT', 'Today’s flight-search allowance has been used.', 429);
    await tx.flightSearch.update({ where: { id: search.id }, data: { refreshes: { increment: 1 }, lastRefreshAt: new Date() } });
    return { query: flightSearchSchema.parse(search.query), offer };
  });
  const offer = await retrieveFlightOffer(offerId, item.query, { departureDate: item.offer.departureDate, returnDate: item.offer.returnDate });
  const itinerary = (fare: FlightOffer) => JSON.stringify(fare.legs.map(l => l.segments.map(s => [s.origin, s.destination, s.departureAt, s.arrivalAt, s.operatingAirline, s.flightNumber])));
  if (itinerary(offer) !== itinerary(item.offer)) throw new RuleError('FLIGHT_UNAVAILABLE', 'This itinerary changed. Run a new search before comparing it again.', 409);
  return { offer, previousAmount: item.offer.totalAmount, previousCurrency: item.offer.currency, observedAt: new Date().toISOString() };
}
