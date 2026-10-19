import { z } from 'zod';
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(+parsed) && parsed.toISOString().slice(0, 10) === value;
}, 'Choose a valid date.');
export const flightSearchSchema = z.object({
  origin: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/), destination: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  departureDate: date, returnDate: date.nullable(), adults: z.number().int().min(1).max(6),
  cabin: z.enum(['economy', 'premium_economy', 'business', 'first']), maxConnections: z.number().int().min(0).max(2), flexDays: z.union([z.literal(0), z.literal(1)]),
}).strict().superRefine((q, ctx) => {
  if (q.origin === q.destination) ctx.addIssue({ code: 'custom', message: 'Choose different origin and destination airports.', path: ['destination'] });
  const today = new Date().toISOString().slice(0, 10);
  const last = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
  if (q.departureDate < today || q.departureDate > last) ctx.addIssue({ code: 'custom', message: 'Choose a departure within the next year.', path: ['departureDate'] });
  if (q.returnDate && (q.returnDate < q.departureDate || q.returnDate > last)) ctx.addIssue({ code: 'custom', message: 'Return must be on or after departure and within the next year.', path: ['returnDate'] });
});
export type FlightQuery = z.infer<typeof flightSearchSchema>;
export function shiftedFlightDates(q: FlightQuery) {
  const shift = (value: string, days: number) => new Date(+new Date(`${value}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
  return (q.flexDays ? [-1, 0, 1] : [0]).map(offset => ({ departureDate: shift(q.departureDate, offset), returnDate: q.returnDate ? shift(q.returnDate, offset) : null }))
    .filter(d => flightSearchSchema.safeParse({ ...q, ...d }).success);
}
export type FlightSegment = { origin: string; destination: string; originTimeZone: string | null; destinationTimeZone: string | null; departureAt: string; arrivalAt: string; operatingAirline: string; flightNumber: string; checkedBags: number | null; cabinBags: number | null; technicalStops: string[] };
export type FlightLeg = { origin: string; destination: string; departureAt: string; arrivalAt: string; durationMinutes: number | null; stopCount: number; segments: FlightSegment[] };
export type FlightOffer = { id: string; totalAmount: string; currency: string; expiresAt: string; departureDate: string; returnDate: string | null; legs: FlightLeg[]; checkedBags: number | null; cabinBags: number | null; refundAllowed: boolean | null; changeAllowed: boolean | null; source: 'duffel_test' | 'example' };
export type FlightResult = { id: string; query: FlightQuery; offers: FlightOffer[]; searchedDates: string[]; failedDates: string[]; observedAt: string; cached: boolean; source: 'duffel_test' | 'example' };
export function durationMinutes(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const m = value.match(/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m || !m.slice(1).some(Boolean)) return null;
  return Number(m[1] || 0) * 1440 + Number(m[2] || 0) * 60 + Number(m[3] || 0) + Number(m[4] || 0) / 60;
}
