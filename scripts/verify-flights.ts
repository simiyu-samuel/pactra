import { randomUUID } from 'node:crypto';
import { db } from '../packages/database/src/index';
import { searchFlights } from '../packages/integrations/src/flights';
const session = await db.browserSession.create({ data: { tokenHash: randomUUID(), expiresAt: new Date(Date.now() + 600000) } });
try {
  const result = await searchFlights(session.id, { origin: 'LHR', destination: 'JFK', departureDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), returnDate: null, adults: 1, cabin: 'economy', maxConnections: 1, flexDays: 0 });
  console.log(JSON.stringify({ provider: 'Duffel test', offers: result.offers.length, failedDates: result.failedDates.length, examples: result.offers.slice(0, 3).map(o => ({ amount: o.totalAmount, currency: o.currency, operators: [...new Set(o.legs.flatMap(l => l.segments.map(s => s.operatingAirline)))], source: o.source })) }));
  if (!result.offers.length) process.exitCode = 1;
} catch (e) { const error = e as { code?: string; message?: string }; console.error(JSON.stringify({ code: error.code || 'FLIGHT_VERIFICATION_FAILED', message: error.message })); process.exitCode = 1; }
finally { await db.$disconnect(); }
