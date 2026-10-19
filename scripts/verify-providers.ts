import { db } from '../packages/database/src/index';
import { decide, verifyPayPalConnection } from '../packages/integrations/src/index';
import { RuleError } from '../packages/domain/src/index';

// Explicit opt-in live check. Uses one Groq request through the shared quota
// scheduler and a sandbox OAuth request; never creates or captures an order.
let failed = false;
try {
  await db.$queryRaw`SELECT 1`;
  console.log('Database: connected.');
  const result = await decide<{ status: string }>(
    'Return the requested JSON with status ok. This is a Pactra connectivity check.',
    { check: 'connectivity' },
    { type: 'object', additionalProperties: false, required: ['status'], properties: { status: { type: 'string', enum: ['ok'] } } },
  );
  if (result.status !== 'ok') throw new Error('Unexpected structured response');
  console.log('Groq: live strict JSON decision verified; usage recorded in the shared quota ledger.');
} catch (error) {
  failed = true;
  console.error('Database/Groq check failed:', error instanceof RuleError ? error.code : 'CHECK_FAILED');
}
try {
  await verifyPayPalConnection();
  console.log('PayPal: sandbox authentication verified. Merchant recipient still requires an order check.');
} catch (error) {
  failed = true;
  console.error('PayPal check failed:', error instanceof RuleError ? error.code : 'CHECK_FAILED');
}
console.log(process.env.PAYPAL_WEBHOOK_ID ? 'Webhook ID: configured; delivery still needs verification.' : 'Webhook ID: missing; HTTPS webhook delivery is not configured.');
await db.$disconnect();
process.exitCode = failed ? 1 : 0;
