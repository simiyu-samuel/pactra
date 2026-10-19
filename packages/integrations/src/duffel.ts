import { z } from 'zod';
import { durationMinutes, RuleError, type FlightOffer, type FlightQuery, type FlightSegment } from '@pactra/domain';
const airport = z.object({ iata_code: z.string().regex(/^[A-Z]{3}$/), time_zone: z.string().nullish() });
const localTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/);
const passenger = z.object({ cabin_class: z.string(), baggages: z.array(z.object({ type: z.string(), quantity: z.number().int().min(0).max(20) })).optional() });
const segment = z.object({ origin: airport, destination: airport, departing_at: localTime, arriving_at: localTime, operating_carrier: z.object({ name: z.string().min(1), iata_code: z.string().nullish() }), operating_carrier_flight_number: z.string().nullish(), passengers: z.array(passenger).min(1).max(6), stops: z.array(z.object({ airport })).optional() });
const rawOffer = z.object({ id: z.string().regex(/^off_[A-Za-z0-9_-]+$/), live_mode: z.literal(false), total_amount: z.string().regex(/^\d{1,9}(?:\.\d{1,3})?$/), total_currency: z.string().regex(/^[A-Z]{3}$/), expires_at: z.iso.datetime({ offset: true }), slices: z.array(z.object({ duration: z.string().nullish(), segments: z.array(segment).min(1).max(5) })).min(1).max(2), conditions: z.object({ refund_before_departure: z.object({ allowed: z.boolean() }).nullish(), change_before_departure: z.object({ allowed: z.boolean() }).nullish() }).nullish() });
const minKnown = (values: Array<number | null>) => values.length && values.every(v => v !== null) ? Math.min(...values as number[]) : null;
export function normalizeFlightOffer(payload: unknown, query: FlightQuery, dates: { departureDate: string; returnDate: string | null }, now = Date.now()): FlightOffer | null {
  const parsed = rawOffer.safeParse(payload);
  if (!parsed.success) return null;
  const o = parsed.data;
  if (+new Date(o.expires_at) <= now || o.slices.length !== (dates.returnDate ? 2 : 1)) return null;
  const legs = [];
  for (const [index, slice] of o.slices.entries()) {
    const first = slice.segments[0], last = slice.segments.at(-1)!;
    const origin = index ? query.destination : query.origin, destination = index ? query.origin : query.destination;
    if (first.origin.iata_code !== origin || last.destination.iata_code !== destination || first.departing_at.slice(0, 10) !== (index ? dates.returnDate : dates.departureDate) || slice.segments.length - 1 > query.maxConnections) return null;
    const segments: FlightSegment[] = [];
    for (const [i, s] of slice.segments.entries()) {
      if (i && slice.segments[i - 1].destination.iata_code !== s.origin.iata_code) return null;
      if (s.passengers.length !== query.adults || s.passengers.some(p => p.cabin_class !== query.cabin)) return null;
      const bags = (type: string) => minKnown(s.passengers.map(p => p.baggages?.find(b => b.type === type)?.quantity ?? null));
      segments.push({ origin: s.origin.iata_code, destination: s.destination.iata_code, originTimeZone: s.origin.time_zone || null, destinationTimeZone: s.destination.time_zone || null, departureAt: s.departing_at, arrivalAt: s.arriving_at, operatingAirline: s.operating_carrier.name.slice(0, 120), flightNumber: `${s.operating_carrier.iata_code || ''} ${s.operating_carrier_flight_number || ''}`.trim(), checkedBags: bags('checked'), cabinBags: bags('carry_on'), technicalStops: (s.stops || []).map(stop => stop.airport.iata_code) });
    }
    legs.push({ origin, destination, departureAt: first.departing_at, arrivalAt: last.arriving_at, durationMinutes: durationMinutes(slice.duration), stopCount: segments.length - 1 + segments.reduce((n, s) => n + s.technicalStops.length, 0), segments });
  }
  return { id: o.id, totalAmount: o.total_amount, currency: o.total_currency, expiresAt: o.expires_at, departureDate: dates.departureDate, returnDate: dates.returnDate, legs, checkedBags: minKnown(legs.flatMap(l => l.segments.map(s => s.checkedBags))), cabinBags: minKnown(legs.flatMap(l => l.segments.map(s => s.cabinBags))), refundAllowed: o.conditions?.refund_before_departure?.allowed ?? null, changeAllowed: o.conditions?.change_before_departure?.allowed ?? null, source: 'duffel_test' };
}
export function duffelConfigured() { return Boolean(process.env.DUFFEL_ACCESS_TOKEN?.startsWith('duffel_test_')); }
async function request(path: string, data?: unknown) {
  if (!duffelConfigured()) throw new RuleError('FLIGHTS_NOT_CONFIGURED', 'Flight search is being connected. You can preview the example experience meanwhile.', 503);
  const response = await fetch(`https://api.duffel.com/air/${path}`, { method: data === undefined ? 'GET' : 'POST', headers: { Authorization: `Bearer ${process.env.DUFFEL_ACCESS_TOKEN}`, 'Duffel-Version': 'v2', 'Content-Type': 'application/json', Accept: 'application/json' }, ...(data === undefined ? {} : { body: JSON.stringify({ data }) }), signal: AbortSignal.timeout(22_000), redirect: 'error' });
  if (!response.ok) throw new RuleError('FLIGHT_PROVIDER_UNAVAILABLE', response.status === 429 ? 'Flight search is busy. Please try again later.' : 'The flight provider could not complete this request. Please try again later.', response.status === 429 ? 429 : 502);
  const body = await response.text();
  if (body.length > 5_000_000) throw new RuleError('FLIGHT_RESPONSE_INVALID', 'The flight response could not be processed.', 502);
  return JSON.parse(body) as unknown;
}
export async function requestFlightOffers(query: FlightQuery, dates: { departureDate: string; returnDate: string | null }) {
  const payload = await request('offer_requests?return_offers=true&supplier_timeout=15000', { slices: [{ origin: query.origin, destination: query.destination, departure_date: dates.departureDate }, ...(dates.returnDate ? [{ origin: query.destination, destination: query.origin, departure_date: dates.returnDate }] : [])], passengers: Array.from({ length: query.adults }, () => ({ type: 'adult' })), cabin_class: query.cabin, max_connections: query.maxConnections });
  const parsed = z.object({ data: z.object({ live_mode: z.literal(false), offers: z.array(z.unknown()) }) }).safeParse(payload);
  if (!parsed.success) throw new RuleError('FLIGHT_RESPONSE_INVALID', 'The provider returned an unsupported flight response.', 502);
  return parsed.data.data.offers.map(o => normalizeFlightOffer(o, query, dates)).filter((o): o is FlightOffer => o !== null);
}
export async function retrieveFlightOffer(id: string, query: FlightQuery, dates: { departureDate: string; returnDate: string | null }) {
  const payload = await request(`offers/${encodeURIComponent(id)}`);
  const parsed = z.object({ data: z.unknown() }).parse(payload);
  const offer = normalizeFlightOffer(parsed.data, query, dates);
  if (!offer || offer.id !== id) throw new RuleError('FLIGHT_UNAVAILABLE', 'This itinerary has expired or changed. Run a new search for current options.', 409);
  return offer;
}
