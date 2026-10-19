import { z } from 'zod';
import { db, event, json, lockCheckout } from '@pactra/database';
import { RuleError } from '@pactra/domain';
import { verifyWebhook } from './paypal';
import { reconcileCheckout } from './checkout';
const schema = z.object({ id: z.string().min(1).max(120), event_type: z.string().min(1).max(120), resource: z.record(z.string(), z.unknown()) }).passthrough();
const supported = new Set(['CHECKOUT.ORDER.APPROVED', 'CHECKOUT.PAYMENT-APPROVAL.REVERSED', 'PAYMENT.CAPTURE.COMPLETED', 'PAYMENT.CAPTURE.PENDING', 'PAYMENT.CAPTURE.DECLINED', 'PAYMENT.CAPTURE.REFUNDED', 'PAYMENT.CAPTURE.REVERSED']);
export async function receivePayPalWebhook(headers: Headers, raw: unknown) {
  const payload = schema.parse(raw);
  await verifyWebhook(headers, payload);
  // Acknowledge only after verified durable intake. A duplicate never overwrites its first body.
  await db.paymentEvent.upsert({ where: { id: payload.id }, create: { id: payload.id, type: payload.event_type, body: json(payload), verified: true }, update: {} });
}
const text = (value: unknown) => typeof value === 'string' && value.length <= 120 ? value : undefined;
function references(payload: z.infer<typeof schema>) {
  const r = payload.resource;
  const related = z.object({ related_ids: z.object({ order_id: z.string().optional(), capture_id: z.string().optional() }).optional() }).safeParse(r.supplementary_data);
  const ids = related.success ? related.data.related_ids : undefined;
  const orderId = text(ids?.order_id) || (payload.event_type.startsWith('CHECKOUT.') ? text(r.id) : undefined);
  let captureId = text(ids?.capture_id) || (payload.event_type.startsWith('PAYMENT.CAPTURE.') && payload.event_type !== 'PAYMENT.CAPTURE.REFUNDED' ? text(r.id) : undefined);
  // Refund resource IDs identify refunds. Parse its constant-origin capture link, never fetch it.
  if (!captureId && payload.event_type === 'PAYMENT.CAPTURE.REFUNDED' && Array.isArray(r.links)) {
    for (const link of r.links) {
      const parsed = z.object({ rel: z.literal('up'), href: z.string() }).safeParse(link);
      if (!parsed.success) continue;
      const match = parsed.data.href.match(/^https:\/\/api(?:-m)?\.sandbox\.paypal\.com\/v2\/payments\/captures\/([A-Za-z0-9_-]+)$/);
      if (match) captureId = text(match[1]);
    }
  }
  return { orderId, captureId };
}
/** Process one durable inbox entry; leases survive process restarts and retries never capture money. */
export async function processPaymentEvent() {
  const row = await db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(71934026)`;
    const item = await tx.paymentEvent.findFirst({ where: { verified: true, processed: false, attempts: { lt: 12 }, nextAttemptAt: { lte: new Date() }, OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }] }, orderBy: { nextAttemptAt: 'asc' } });
    if (!item) return null;
    return tx.paymentEvent.update({ where: { id: item.id }, data: { attempts: { increment: 1 }, leaseUntil: new Date(Date.now() + 45_000) } });
  });
  if (!row) return null;
  // Guard every completion against a reclaimed lease, including after slow provider calls.
  const claim = { id: row.id, processed: false, attempts: row.attempts, leaseUntil: row.leaseUntil };
  try {
    const payload = schema.parse(row.body);
    if (!supported.has(payload.event_type)) {
      await db.paymentEvent.updateMany({ where: claim, data: { processed: true, leaseUntil: null, errorCode: 'UNSUPPORTED_EVENT' } });
      return row.id;
    }
    const { orderId, captureId } = references(payload);
    const byOrder = orderId ? await db.checkout.findUnique({ where: { paypalOrderId: orderId } }) : null;
    const byCapture = captureId ? await db.checkout.findUnique({ where: { captureId } }) : null;
    if (byOrder && byCapture && byOrder.id !== byCapture.id || byCapture && orderId && byCapture.paypalOrderId !== orderId) throw new RuleError('PAYMENT_LINK_MISMATCH', 'Webhook references conflicting payment identities.');
    const checkout = byOrder || byCapture;
    if (!checkout) throw new RuleError('PAYMENT_LINK_NOT_FOUND', 'Webhook is waiting for its local order mapping.');
    await db.paymentEvent.updateMany({ where: claim, data: { checkoutId: checkout.id } });
    const checked = await reconcileCheckout(checkout.id);
    if (checked.state === 'review_required') throw new RuleError('PAYMENT_REVIEW_REQUIRED', 'Payment requires review.');
    const isReturn = ['PAYMENT.CAPTURE.REFUNDED', 'PAYMENT.CAPTURE.REVERSED'].includes(payload.event_type);
    if (isReturn) {
      // These events identify a prior capture. Unknown/mismatching captures never change a receipt.
      if (!captureId || checked.captureId !== captureId || !['paid', 'refunded', 'reversed'].includes(checked.state)) throw new RuleError('PAYMENT_CAPTURE_NOT_CONFIRMED', 'The original capture must be confirmed before this event can change its receipt.');
      const amount = z.object({ currency_code: z.literal('USD'), value: z.string() }).safeParse(payload.resource.amount);
      if (!amount.success || amount.data.value !== (checked.totalCents / 100).toFixed(2)) {
        await db.checkout.updateMany({ where: { id: checked.id, state: 'paid' }, data: { state: 'review_required' } });
        throw new RuleError('PAYMENT_RETURN_REVIEW', 'Partial or unconfirmed payment returns require owner review.');
      }
      await db.$transaction(async tx => {
        await lockCheckout(tx, checkout.id);
        const current = await tx.checkout.findUniqueOrThrow({ where: { id: checkout.id } });
        const state = payload.event_type.endsWith('REVERSED') ? 'reversed' : 'refunded';
        // Reversal takes precedence over refund when delivery is reordered. Neither restores inventory.
        if (current.state === 'paid' || current.state === 'refunded' && state === 'reversed') {
          await tx.checkout.update({ where: { id: current.id }, data: { state } });
          await event(tx, current.roomId, `payment.${state}`, { checkoutId: current.id });
        }
      });
    } else if (payload.event_type === 'PAYMENT.CAPTURE.COMPLETED' && (!captureId || checked.captureId !== captureId || !['paid', 'refunded', 'reversed'].includes(checked.state))) {
      throw new RuleError('PAYMENT_CAPTURE_NOT_CONFIRMED', 'Order retrieval has not confirmed the notified capture.');
    }
    await db.paymentEvent.updateMany({ where: claim, data: { processed: true, leaseUntil: null, errorCode: null } });
    return row.id;
  } catch (error) {
    const errorCode = error instanceof RuleError ? error.code : 'PAYMENT_EVENT_UNAVAILABLE';
    await db.paymentEvent.updateMany({ where: claim, data: { leaseUntil: null, errorCode, nextAttemptAt: new Date(Date.now() + Math.min(3_600_000, 5000 * 2 ** (row.attempts - 1))) } });
    return row.id;
  }
}
