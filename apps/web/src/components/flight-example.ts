import type { FlightQuery, FlightResult, FlightOffer, FlightLeg } from '@pactra/domain';
// Fictional UI examples. These are never returned from the provider API.
export function exampleFlights(query: FlightQuery): FlightResult {
  const expiry = new Date(Date.now() + 3600_000).toISOString();
  function leg(origin: string, destination: string, date: string, offset: number, stop: boolean): FlightLeg {
    const via = ['DOH', 'IST', 'CDG'].find(code => code !== origin && code !== destination)!;
    const time = (h: number) => `${date}T${String(h).padStart(2, '0')}:30:00`;
    const base = { originTimeZone: null, destinationTimeZone: null, operatingAirline: stop ? 'Example Connect Air' : 'Example Direct Air', checkedBags: offset === 2 ? null : 1, cabinBags: 1, technicalStops: [] as string[] };
    const segments = stop ? [{ ...base, origin, destination: via, departureAt: time(6 + offset), arrivalAt: time(10 + offset), flightNumber: 'EX 101' }, { ...base, origin: via, destination, departureAt: time(12 + offset), arrivalAt: time(16 + offset), flightNumber: 'EX 202' }] : [{ ...base, origin, destination, departureAt: time(8 + offset), arrivalAt: time(14 + offset), flightNumber: 'EX 303' }];
    return { origin, destination, departureAt: segments[0].departureAt, arrivalAt: segments.at(-1)!.arrivalAt, durationMinutes: stop ? 600 : 360, stopCount: stop ? 1 : 0, segments };
  }
  const offers: FlightOffer[] = [420, 510, 475].map((amount, i) => {
    const stop = i === 0 && query.maxConnections > 0;
    const legs = [leg(query.origin, query.destination, query.departureDate, i, stop), ...(query.returnDate ? [leg(query.destination, query.origin, query.returnDate, i, stop)] : [])];
    return { id: `example_${i}`, totalAmount: (amount * query.adults * (query.returnDate ? 2 : 1)).toFixed(2), currency: 'USD', expiresAt: expiry, departureDate: query.departureDate, returnDate: query.returnDate, legs, checkedBags: i === 2 ? null : 1, cabinBags: 1, refundAllowed: i === 0 ? false : null, changeAllowed: i === 1 ? true : null, source: 'example' };
  });
  return { id: 'example-only', query, offers, searchedDates: [query.departureDate], failedDates: [], observedAt: new Date().toISOString(), cached: false, source: 'example' };
}
