import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeEach, expect, it, vi } from 'vitest';
import { db, json } from '../../packages/database/src/index';
import { makeOffer } from '../../packages/domain/src/index';
import { acceptOffer, cancelCheckout, expireCheckout, ensureOrder, payCheckout, reconcileCheckout } from '../../packages/integrations/src/checkout';
import { processPaymentEvent, receivePayPalWebhook } from '../../packages/integrations/src/webhooks';
import type { PayPalOrder } from '../../packages/integrations/src/paypal';
if (!process.env.DATABASE_URL?.split('?')[0].endsWith('/pactra_test')) throw new Error('Recovery tests require pactra_test.');
let sellerId: string, roomId: string, ownerId: string;
let checkout: Awaited<ReturnType<typeof acceptOffer>>;
let remote: PayPalOrder;
let captures = 0, loseCaptureResponse = false, failRetrieval = false, validSignature = true;
let fetcher: ReturnType<typeof vi.fn>;
const eventIds: string[] = [];
const headers = new Headers(Object.fromEntries(['auth-algo','cert-url','transmission-id','transmission-sig','transmission-time'].map(k => [`paypal-${k}`, 'test-only'])));
function evidence(status?: string): PayPalOrder {
  return { id: checkout.paypalOrderId!, status: status === 'COMPLETED' ? 'COMPLETED' : 'APPROVED', purchase_units: [{ reference_id: checkout.id, custom_id: checkout.snapshotHash, payee: { merchant_id: 'RECOVERY-MERCHANT' }, amount: { currency_code: 'USD', value: (checkout.totalCents / 100).toFixed(2) }, ...(status ? { payments: { captures: [{ id: 'CAPTURE-RECOVERY', status, amount: { currency_code: 'USD', value: (checkout.totalCents / 100).toFixed(2) } }] } } : {}) }] };
}
function notification(type = 'PAYMENT.CAPTURE.COMPLETED', extra: Record<string, unknown> = {}) {
  const id = `EV-${randomUUID()}`; eventIds.push(id);
  return { id, event_type: type, resource: { id: type.startsWith('CHECKOUT.') ? checkout.paypalOrderId : 'CAPTURE-RECOVERY', amount: { currency_code: 'USD', value: (checkout.totalCents / 100).toFixed(2) }, supplementary_data: { related_ids: { order_id: checkout.paypalOrderId, capture_id: 'CAPTURE-RECOVERY' } }, ...extra } };
}
async function retryDue() { await db.paymentEvent.updateMany({ where: { id: { in: eventIds } }, data: { nextAttemptAt: new Date(0), leaseUntil: null } }); }
async function stock() { return db.listing.findUniqueOrThrow({ where: { id: `${sellerId}_SS-CAM-02` } }); }
beforeEach(async () => {
  captures = 0; loseCaptureResponse = false; failRetrieval = false; validSignature = true;
  for (const [k,v] of Object.entries({ PAYPAL_CLIENT_ID: 'recovery-test', PAYPAL_CLIENT_SECRET: 'never-sent', PAYPAL_EXPECTED_MERCHANT_ID: 'RECOVERY-MERCHANT', PAYPAL_ENV: 'sandbox', PAYPAL_WEBHOOK_ID: 'WH-TEST' })) vi.stubEnv(k, v);
  sellerId = `recovery_${randomUUID()}`;
  const base = await db.seller.findUniqueOrThrow({ where: { id: 'studio_stack' }, include: { listings: true } });
  await db.seller.create({ data: { id: sellerId, name: 'Recovery test seller', strategy: 'bundle_first', warrantyMonths: 24, standardCents: 1000, standardDays: 4, expressCents: 2000, expressDays: 2 } });
  for (const l of base.listings.filter(l => ['SS-CAM-02','SS-MIC-01','SS-TRI-01'].includes(l.id))) await db.listing.create({ data: { id: `${sellerId}_${l.id}`, sellerId, productId: l.productId, listCents: l.listCents, floorCents: l.floorCents, onHand: 3 } });
  const owner = await db.browserSession.create({ data: { tokenHash: randomUUID(), expiresAt: new Date(Date.now() + 600000) } }); ownerId = owner.id;
  const room = await db.shoppingSession.create({ data: { ownerId, brief: { goal: 'A 4K creator camera, microphone and tripod kit.', capCents: 43000, maxDays: 4, preference: 'quality', discloseBudget: false } } }); roomId = room.id;
  const seller = await db.seller.findUniqueOrThrow({ where: { id: sellerId }, include: { listings: { include: { product: true } } } });
  const terms = makeOffer({ action: 'offer', shipping: 'standard', message: 'A recovery fixture.', items: [['SS-CAM-02',37900],['SS-MIC-01',1900],['SS-TRI-01',1100]].map(([id,price]) => ({ listingId: `${sellerId}_${id}`, quantity: 1, unitPriceCents: price })) }, seller, seller.listings.map(l => ({ ...l, available: l.onHand })))!;
  const offer = await db.offer.create({ data: { roomId, sellerId, briefVersion: 1, policyVersion: 1, round: 1, terms: json(terms), expiresAt: new Date(Date.now() + 600000) } });
  checkout = await acceptOffer(ownerId, offer.id, randomUUID());
  checkout = await db.checkout.update({ where: { id: checkout.id }, data: { state: 'awaiting_approval', paypalOrderId: `ORDER-${randomUUID()}` } });
  remote = evidence();
  fetcher = vi.fn(async (url: string, options?: RequestInit) => {
    if (url.endsWith('/v1/oauth2/token')) return Response.json({ access_token: 'fake-recovery-access', expires_in: 3600 });
    if (url.endsWith('/verify-webhook-signature')) return Response.json({ verification_status: validSignature ? 'SUCCESS' : 'FAILURE' });
    if (url.endsWith('/capture') && options?.method === 'POST') {
      captures++; expect((options.headers as Record<string,string>)['PayPal-Request-Id']).toBe(checkout.captureKey);
      remote = evidence('COMPLETED'); if (loseCaptureResponse) throw new Error('Simulated lost capture response');
      return Response.json(remote);
    }
    if (url.endsWith(`/orders/${checkout.paypalOrderId}`)) { if (failRetrieval) throw new Error('Simulated provider outage'); return Response.json(remote); }
    throw new Error('Unexpected provider request in isolated recovery test');
  });
  vi.stubGlobal('fetch', fetcher);
});
afterEach(async () => {
  vi.unstubAllGlobals(); vi.unstubAllEnvs();
  await db.paymentEvent.deleteMany({ where: { OR: [{ id: { in: eventIds.splice(0) } }, { checkoutId: checkout.id }] } });
  await db.reservation.deleteMany({ where: { checkoutId: checkout.id } }); await db.checkout.delete({ where: { id: checkout.id } });
  await db.offer.deleteMany({ where: { roomId } }); await db.roomEvent.deleteMany({ where: { roomId } }); await db.shoppingSession.delete({ where: { id: roomId } }); await db.browserSession.delete({ where: { id: ownerId } });
  await db.sellerPolicyVersion.deleteMany({ where: { sellerId } }); await db.listing.deleteMany({ where: { sellerId } }); await db.seller.delete({ where: { id: sellerId } });
});
afterAll(() => db.$disconnect());
it('serializes double capture and consumes each stock hold once', async () => {
  const results = await Promise.allSettled([payCheckout(checkout.id), payCheckout(checkout.id)]);
  expect(results.some(r => r.status === 'fulfilled')).toBe(true); expect(captures).toBe(1);
  await reconcileCheckout(checkout.id); expect(await stock()).toMatchObject({ onHand: 2, reserved: 0 });
  expect(await db.roomEvent.count({ where: { roomId, type: 'payment.completed' } })).toBe(1);
});
it('recovers a completed payment after its capture response is lost without capturing again', async () => {
  loseCaptureResponse = true; await expect(payCheckout(checkout.id)).rejects.toThrow('lost capture');
  expect(await stock()).toMatchObject({ onHand: 3, reserved: 1 });
  expect(await payCheckout(checkout.id)).toMatchObject({ state: 'paid', captureId: 'CAPTURE-RECOVERY' });
  expect(captures).toBe(1); expect(await stock()).toMatchObject({ onHand: 2, reserved: 0 });
});
it('keeps pending inventory protected when the approval window expires', async () => {
  remote = evidence('PENDING'); await db.checkout.update({ where: { id: checkout.id }, data: { expiresAt: new Date(0) } });
  expect(await expireCheckout(checkout.id)).toMatchObject({ state: 'pending' }); expect(await stock()).toMatchObject({ onHand: 3, reserved: 1 });
});
it('checks provider completion before expiring an approval and never releases paid stock', async () => {
  remote = evidence('COMPLETED'); await db.checkout.update({ where: { id: checkout.id }, data: { expiresAt: new Date(0) } });
  expect(await expireCheckout(checkout.id)).toMatchObject({ state: 'paid' }); expect(await stock()).toMatchObject({ onHand: 2, reserved: 0 });
});
it('releases a definitive decline once and rejects a cancelled approval for capture', async () => {
  remote = evidence('DECLINED'); expect(await reconcileCheckout(checkout.id)).toMatchObject({ state: 'failed' });
  await reconcileCheckout(checkout.id); expect(await stock()).toMatchObject({ onHand: 3, reserved: 0 });
  await db.checkout.update({ where: { id: checkout.id }, data: { state: 'awaiting_approval' } }); remote = evidence();
  await cancelCheckout(checkout.id, ownerId); await expect(payCheckout(checkout.id)).rejects.toMatchObject({ code: 'PAYMENT_NOT_READY' }); expect(captures).toBe(0);
});
it('freezes mismatched capture evidence while keeping stock held', async () => {
  remote = evidence('COMPLETED'); remote.purchase_units![0].payments!.captures![0].amount.value = '1.00';
  await expect(reconcileCheckout(checkout.id)).rejects.toMatchObject({ code: 'PAYMENT_MISMATCH' });
  expect(await db.checkout.findUnique({ where: { id: checkout.id } })).toMatchObject({ state: 'review_required' }); expect(await stock()).toMatchObject({ onHand: 3, reserved: 1 });
});
it('rejects an invalid webhook signature before durable intake', async () => {
  validSignature = false; const payload = notification(); await expect(receivePayPalWebhook(headers, payload)).rejects.toMatchObject({ code: 'INVALID_WEBHOOK' });
  expect(await db.paymentEvent.findUnique({ where: { id: payload.id } })).toBeNull();
});
it('durably accepts duplicate notifications before reconciliation and preserves the first body', async () => {
  const payload = notification(); await receivePayPalWebhook(headers, payload); await receivePayPalWebhook(headers, { ...payload, event_type: 'CHECKOUT.ORDER.APPROVED' });
  expect(await db.paymentEvent.findUnique({ where: { id: payload.id } })).toMatchObject({ processed: false, attempts: 0, type: payload.event_type });
  expect(captures).toBe(0); expect(await stock()).toMatchObject({ reserved: 1 });
});
it('retries provider failures from the durable inbox after a worker restart', async () => {
  const payload = notification(); await receivePayPalWebhook(headers, payload); failRetrieval = true; await processPaymentEvent();
  expect(await db.paymentEvent.findUnique({ where: { id: payload.id } })).toMatchObject({ processed: false, attempts: 1, leaseUntil: null, errorCode: 'PAYMENT_EVENT_UNAVAILABLE' });
  failRetrieval = false; remote = evidence('COMPLETED'); await retryDue(); await processPaymentEvent();
  expect(await db.paymentEvent.findUnique({ where: { id: payload.id } })).toMatchObject({ processed: true, attempts: 2 }); expect(await stock()).toMatchObject({ onHand: 2, reserved: 0 });
});
it('reclaims an expired inbox lease and admits only one concurrent handler', async () => {
  const payload = notification(); await receivePayPalWebhook(headers, payload); remote = evidence('COMPLETED');
  await db.paymentEvent.update({ where: { id: payload.id }, data: { attempts: 1, leaseUntil: new Date(0) } });
  const outcomes = await Promise.all([processPaymentEvent(), processPaymentEvent()]); expect(outcomes.filter(Boolean)).toHaveLength(1);
  expect(await db.paymentEvent.findUnique({ where: { id: payload.id } })).toMatchObject({ processed: true, attempts: 2 }); expect(await stock()).toMatchObject({ onHand: 2 });
});
it('retains an unknown order for bounded retry instead of silently discarding it', async () => {
  const payload = notification('PAYMENT.CAPTURE.COMPLETED', { supplementary_data: { related_ids: { order_id: 'NOT-LOCAL' } } });
  await receivePayPalWebhook(headers, payload); await processPaymentEvent();
  expect(await db.paymentEvent.findUnique({ where: { id: payload.id } })).toMatchObject({ processed: false, errorCode: 'PAYMENT_LINK_NOT_FOUND' });
  await db.paymentEvent.update({ where: { id: payload.id }, data: { attempts: 12, nextAttemptAt: new Date(0) } }); expect(await processPaymentEvent()).toBeNull();
});
it('processes approval as observation without automatically capturing money', async () => {
  await receivePayPalWebhook(headers, notification('CHECKOUT.ORDER.APPROVED')); await processPaymentEvent();
  expect(captures).toBe(0); expect(await db.checkout.findUnique({ where: { id: checkout.id } })).toMatchObject({ state: 'awaiting_approval' });
});
it('preserves a refund and consumed inventory when stale pending and duplicate refund events arrive', async () => {
  remote = evidence('COMPLETED'); await reconcileCheckout(checkout.id);
  const refund = notification('PAYMENT.CAPTURE.REFUNDED', { id: 'REFUND-1', supplementary_data: { related_ids: { order_id: checkout.paypalOrderId } }, links: [{ rel: 'up', href: 'https://api-m.sandbox.paypal.com/v2/payments/captures/CAPTURE-RECOVERY' }] });
  await receivePayPalWebhook(headers, refund); await processPaymentEvent(); await receivePayPalWebhook(headers, refund);
  remote = evidence('PENDING'); await receivePayPalWebhook(headers, notification('PAYMENT.CAPTURE.PENDING')); await processPaymentEvent();
  expect(await db.checkout.findUnique({ where: { id: checkout.id } })).toMatchObject({ state: 'refunded', captureId: 'CAPTURE-RECOVERY' }); expect(await stock()).toMatchObject({ onHand: 2, reserved: 0 });
  expect(await db.roomEvent.count({ where: { roomId, type: 'payment.refunded' } })).toBe(1);
});
it('does not overwrite a confirmed receipt with stale mismatching order evidence', async () => {
  remote = evidence('COMPLETED'); await reconcileCheckout(checkout.id); remote.id = 'STALE-OTHER-ORDER';
  await expect(reconcileCheckout(checkout.id)).rejects.toMatchObject({ code: 'PAYMENT_MISMATCH' });
  expect(await db.checkout.findUnique({ where: { id: checkout.id } })).toMatchObject({ state: 'paid' });
});

it('reuses the same create request key after an uncertain order creation', async () => {
  checkout = await db.checkout.update({ where: { id: checkout.id }, data: { state: 'reserved', paypalOrderId: null } });
  const keys: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, options?: RequestInit) => {
    if (url.endsWith('/v1/oauth2/token')) return Response.json({ access_token: 'test-create-token', expires_in: 3600 });
    if (url.endsWith('/v2/checkout/orders') && options?.method === 'POST') {
      keys.push((options.headers as Record<string,string>)['PayPal-Request-Id']);
      if (keys.length === 1) throw new Error('Lost order response');
      return Response.json({ id: 'ORDER-RECOVERY-CREATED', status: 'CREATED' });
    }
    throw new Error('Unexpected create fixture request');
  }));
  await expect(ensureOrder(checkout.id)).rejects.toThrow('Lost order');
  await expect(ensureOrder(checkout.id)).rejects.toMatchObject({ code: 'PAYMENT_CHECKING' });
  await db.checkout.update({ where: { id: checkout.id }, data: { operationAt: new Date(0) } });
  expect(await ensureOrder(checkout.id)).toEqual({ id: 'ORDER-RECOVERY-CREATED' });
  expect(keys).toEqual([checkout.createKey, checkout.createKey]); expect(await stock()).toMatchObject({ onHand: 3, reserved: 1 });
});
it('retains an expired approval hold while its provider status is unavailable', async () => {
  failRetrieval = true; await db.checkout.update({ where: { id: checkout.id }, data: { expiresAt: new Date(0) } });
  await expect(expireCheckout(checkout.id)).rejects.toThrow('provider outage'); expect(await stock()).toMatchObject({ onHand: 3, reserved: 1 });
});
it('recovers a full refund that arrives before the local completed-capture receipt', async () => {
  remote = evidence('REFUNDED'); const payload = notification('PAYMENT.CAPTURE.REFUNDED');
  await receivePayPalWebhook(headers, payload); await processPaymentEvent();
  expect(await db.checkout.findUnique({ where: { id: checkout.id } })).toMatchObject({ state: 'refunded', captureId: 'CAPTURE-RECOVERY' });
  expect(await db.paymentEvent.findUnique({ where: { id: payload.id } })).toMatchObject({ processed: true });
  expect(await stock()).toMatchObject({ onHand: 2, reserved: 0 }); expect(captures).toBe(0);
});
it('routes a partial refund to review without claiming a full refund or restocking', async () => {
  remote = evidence('COMPLETED'); await reconcileCheckout(checkout.id);
  remote = evidence('PARTIALLY_REFUNDED');
  const payload = notification('PAYMENT.CAPTURE.REFUNDED', { amount: { currency_code: 'USD', value: '10.00' } });
  await receivePayPalWebhook(headers, payload); await processPaymentEvent();
  expect(await db.checkout.findUnique({ where: { id: checkout.id } })).toMatchObject({ state: 'review_required' });
  expect(await db.paymentEvent.findUnique({ where: { id: payload.id } })).toMatchObject({ processed: false, errorCode: 'PAYMENT_REVIEW_REQUIRED' });
  expect(await stock()).toMatchObject({ onHand: 2, reserved: 0 });
});
it('rejects a webhook whose order mapping conflicts with its known capture', async () => {
  remote = evidence('COMPLETED'); await reconcileCheckout(checkout.id);
  const payload = notification('PAYMENT.CAPTURE.REVERSED', { supplementary_data: { related_ids: { order_id: 'OTHER-ORDER', capture_id: 'CAPTURE-RECOVERY' } } });
  await receivePayPalWebhook(headers, payload); await processPaymentEvent();
  expect(await db.paymentEvent.findUnique({ where: { id: payload.id } })).toMatchObject({ processed: false, errorCode: 'PAYMENT_LINK_MISMATCH' });
  expect(await db.checkout.findUnique({ where: { id: checkout.id } })).toMatchObject({ state: 'paid' });
});

it('preserves the signed event bytes and PayPal field order through postback verification', async () => {
  const event = notification();
  const paypalOrdered = { id: event.id, event_version: '1.0', create_time: '2026-10-21T05:38:00Z', resource_type: 'capture', event_type: event.event_type, summary: 'Sandbox café fixture', resource: event.resource };
  const original = JSON.stringify(paypalOrdered, null, 2) + '\n';
  await receivePayPalWebhook(headers, original);
  const call = fetcher.mock.calls.find(([url]) => String(url).endsWith('/verify-webhook-signature'));
  expect(call).toBeDefined();
  const body = String((call![1] as RequestInit).body);
  expect(body.endsWith(`"webhook_event":${original}}`)).toBe(true);
  expect(JSON.parse(body).webhook_event).toEqual(paypalOrdered);
  expect(await db.paymentEvent.findUnique({where:{id:event.id}})).toMatchObject({verified:true,processed:false});
});
it('rejects malformed webhook text before provider verification or durable intake', async () => {
  await expect(receivePayPalWebhook(headers, '{invalid-json')).rejects.toMatchObject({code:'INVALID_JSON'});
  expect(fetcher).not.toHaveBeenCalled();
});
