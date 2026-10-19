import { randomUUID } from 'node:crypto';
import { db } from '../packages/database/src/index';
import { discover } from '../packages/integrations/src/index';
// Explicit live check. Retain the expiring session/ledger so attempted calls remain counted.
const session = await db.browserSession.create({ data: { tokenHash: randomUUID(), expiresAt: new Date(Date.now() + 600_000) } });
try {
  const result = await discover(session.id, 'Sony ZV-E10 camera', 'channel3');
  console.log(JSON.stringify({ provider: 'Channel3', products: result.products?.length, offers: result.offers.length, withImages: result.offers.filter(o => o.image).length, examples: result.offers.slice(0, 3).map(o => ({ title: o.title, merchant: o.merchant, amount: o.amount, currency: o.currency })) }));
  if (!result.offers.length) process.exitCode = 1;
  if (process.argv.includes('--web')) {
    const web = await discover(session.id, 'Sony camera', 'jumia');
    console.log(JSON.stringify({ provider: 'Groq browser search', source: web.source, results: web.offers.length, examples: web.offers.slice(0, 3).map(o => ({ title: o.title, merchant: o.merchant, priceKnown: o.amount !== null })) }));
  }
} catch (e) {
  const error = e as { code?: string; message?: string; status?: number };
  console.error(JSON.stringify({ code: error.code || 'DISCOVERY_VERIFICATION_FAILED', message: error.message, status: error.status })); process.exitCode = 1;
} finally { await db.$disconnect(); }
