import type { FlightQuery } from '../packages/domain/src/flights';
export const futureDay = (days = 30) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
export const flightQuery = (): FlightQuery => ({ origin: 'NBO', destination: 'DXB', departureDate: futureDay(), returnDate: null, adults: 1, cabin: 'economy', maxConnections: 1, flexDays: 0 });
export function rawFlight(q = flightQuery(), id = 'off_test_1', price = '450.00') {
  const place = (iata_code: string) => ({ iata_code, time_zone: 'UTC' });
  const slice = (origin: string, destination: string, date: string) => ({ duration: 'PT6H', segments: [{ origin: place(origin), destination: place(destination), departing_at: `${date}T08:30:00`, arriving_at: `${date}T14:30:00`, operating_carrier: { name: 'Fixture Air', iata_code: 'FA' }, operating_carrier_flight_number: '101', stops: [], passengers: Array.from({ length: q.adults }, () => ({ cabin_class: q.cabin, baggages: [{ type: 'checked', quantity: 1 }, { type: 'carry_on', quantity: 1 }] })) }] });
  return { id, live_mode: false, total_amount: price, total_currency: 'USD', expires_at: new Date(Date.now() + 900000).toISOString(), slices: [slice(q.origin, q.destination, q.departureDate), ...(q.returnDate ? [slice(q.destination, q.origin, q.returnDate)] : [])], conditions: { refund_before_departure: { allowed: false }, change_before_departure: null } };
}
