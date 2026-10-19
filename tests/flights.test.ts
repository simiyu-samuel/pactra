import { expect, it } from 'vitest';
import { durationMinutes, flightSearchSchema, shiftedFlightDates } from '../packages/domain/src/flights';
import { normalizeFlightOffer } from '../packages/integrations/src/duffel';
import { flightQuery, futureDay, rawFlight } from './flight-fixtures';
it('validates calendar dates, airport pairs, dates and traveller bounds', () => {
  const q = flightQuery(); expect(flightSearchSchema.parse({ ...q, origin: 'nbo' }).origin).toBe('NBO');
  for (const change of [{ destination: 'NBO' }, { origin: 'NAIROBI' }, { departureDate: '2026-02-30' }, { adults: 0 }, { adults: 7 }, { returnDate: futureDay(29) }, { maxConnections: 4 }, { flexDays: 3 }, { departureDate: futureDay(-2) }]) expect(flightSearchSchema.safeParse({ ...q, ...change }).success).toBe(false);
});
it('shifts both dates together to preserve return-trip length', () => {
  const q = { ...flightQuery(), flexDays: 1 as const, returnDate: futureDay(37) };
  const dates = shiftedFlightDates(q); expect(dates).toHaveLength(3);
  for (const d of dates) expect(+new Date(d.returnDate!) - +new Date(d.departureDate)).toBe(7 * 86400000);
});
it('preserves all-traveller price, airport-local time, operator and test provenance', () => {
  const q = { ...flightQuery(), adults: 2 }, raw = rawFlight(q, 'off_test_two', '900.125');
  expect(normalizeFlightOffer(raw, q, q)).toMatchObject({ totalAmount: '900.125', currency: 'USD', source: 'duffel_test', checkedBags: 1, refundAllowed: false, changeAllowed: null, legs: [{ departureAt: `${q.departureDate}T08:30:00`, stopCount: 0, segments: [{ operatingAirline: 'Fixture Air' }] }] });
});
it('keeps missing baggage unknown and explicit zero separate', () => {
  const q = flightQuery(), raw = rawFlight(q);
  raw.slices[0].segments[0].passengers[0].baggages = [];
  expect(normalizeFlightOffer(raw, q, q)).toMatchObject({ checkedBags: null, cabinBags: null });
  raw.slices[0].segments[0].passengers[0].baggages = [{ type: 'checked', quantity: 0 }];
  expect(normalizeFlightOffer(raw, q, q)?.checkedBags).toBe(0);
});
it('rejects expired, live-mode, mismatched routes, cabins and invalid prices', () => {
  const q = flightQuery(), raw = rawFlight(q);
  for (const changed of [{ ...raw, expires_at: new Date(Date.now() - 1).toISOString() }, { ...raw, live_mode: true }, { ...raw, total_amount: '-1' }, { ...raw, total_amount: 'NaN' }]) expect(normalizeFlightOffer(changed, q, q)).toBeNull();
  expect(normalizeFlightOffer(raw, { ...q, origin: 'LHR' }, q)).toBeNull();
  expect(normalizeFlightOffer(raw, { ...q, cabin: 'business' }, q)).toBeNull();
});
it('counts technical stops without calling the route nonstop', () => {
  const q = flightQuery(), raw = rawFlight(q);
  const payload = { ...raw, slices: [{ ...raw.slices[0], segments: [{ ...raw.slices[0].segments[0], stops: [{ airport: { iata_code: 'DOH' } }] }] }] };
  expect(normalizeFlightOffer(payload, q, q)?.legs[0].stopCount).toBe(1);
});
it('parses reported duration without silently substituting a missing duration', () => {
  expect(durationMinutes('P1DT2H15M')).toBe(1575); expect(durationMinutes('PT6H')).toBe(360); expect(durationMinutes(null)).toBeNull(); expect(durationMinutes('soon')).toBeNull();
});
