import { randomUUID, createHash } from 'node:crypto';
import { db, event, json, lockCheckout, lockRoom, lockSeller, type Tx } from '@pactra/database';
import { briefSchema, constraints, makeOffer, RuleError, type OfferTerms } from '@pactra/domain';
import { ensurePolicyVersion, recordBrief } from './policies';
import { createOrder, getOrder, captureOrder, verifyOrder } from './paypal';

export const unresolvedStates = ['reserved', 'creating_order', 'awaiting_approval', 'capturing', 'pending', 'reconciling', 'review_required'];
export async function acceptOffer(ownerId: string, offerId: string, commandKey: string) {
  return db.$transaction(async tx => {
    const offer = await tx.offer.findUnique({ where: { id: offerId }, include: { room: true } });
    if (!offer || offer.room.ownerId !== ownerId) throw new RuleError('NOT_FOUND', 'Offer not found.', 404);
    await lockRoom(tx, offer.roomId);
    const room = await tx.shoppingSession.findUniqueOrThrow({ where: { id: offer.roomId } });
    const existing = await tx.checkout.findUnique({ where: { commandKey } });
    if (existing) {
      if (existing.roomId !== room.id || existing.offerId !== offer.id) throw new RuleError('COMMAND_CONFLICT', 'This command was used for a different offer.');
      return existing;
    }
    if (await tx.checkout.findFirst({ where: { roomId: room.id, state: { notIn: ['cancelled', 'expired', 'failed'] } } })) throw new RuleError('CHECKOUT_LOCKED', 'Resolve the existing checkout before making another selection.');
    await lockSeller(tx, offer.sellerId);
    const seller = await tx.seller.findUniqueOrThrow({ where: { id: offer.sellerId } });
    if (offer.status !== 'active' || offer.briefVersion !== room.version || offer.policyVersion !== seller.policyVersion || +offer.expiresAt < Date.now()) throw new RuleError('STALE_OFFER', 'This offer has expired or changed. Negotiate a fresh offer.');
    const terms = offer.terms as unknown as OfferTerms;
    for (const item of [...terms.items].sort((a, b) => a.listingId.localeCompare(b.listingId))) {
      await tx.$queryRaw`SELECT id FROM "Listing" WHERE id = ${item.listingId} FOR UPDATE`;
    }
    const listings = await tx.listing.findMany({ where: { sellerId: offer.sellerId }, include: { product: true } });
    const checked = makeOffer({ action: 'offer', items: terms.items.map(x => ({ listingId: x.listingId, quantity: x.quantity, unitPriceCents: x.unitPriceCents })), shipping: terms.shipping, message: terms.message }, seller, listings.map(x => ({ ...x, available: x.onHand - x.reserved })));
    if (!checked || constraints(checked, briefSchema.parse(room.brief)).length || checked.totalCents !== terms.totalCents) throw new RuleError('INELIGIBLE_OFFER', 'The offer no longer meets your requirements or stock availability.');
    const policyVersion = await ensurePolicyVersion(tx, seller.id);
    const briefVersion = await recordBrief(tx, room.id, room.version, room.brief, 'current_baseline');
    const snapshot = { brief: room.brief, terms: checked, seller: { id: seller.id, name: seller.name, policyVersion: offer.policyVersion }, briefVersion: room.version, offerId: offer.id, merchantId: process.env.PAYPAL_EXPECTED_MERCHANT_ID || null, disclosures: 'PayPal sandbox test payment only. This prototype does not arrange shipment or a live paid order.' };
    const checkout = await tx.checkout.create({ data: { id: randomUUID(), roomId: room.id, offerId, commandKey, buyerBriefVersionId: briefVersion.id, sellerPolicyVersionId: policyVersion.id, snapshot: json(snapshot), snapshotHash: createHash('sha256').update(JSON.stringify(snapshot)).digest('hex'), totalCents: checked.totalCents, expiresAt: new Date(Date.now() + 600_000) } });
    for (const item of checked.items) {
      await tx.listing.update({ where: { id: item.listingId }, data: { reserved: { increment: item.quantity } } });
      await tx.reservation.create({ data: { checkoutId: checkout.id, listingId: item.listingId, quantity: item.quantity } });
    }
    await tx.offer.update({ where: { id: offer.id }, data: { status: 'locked' } });
    await tx.job.updateMany({ where: { roomId: room.id, state: { in: ['ready', 'running'] } }, data: { state: 'cancelled', leaseUntil: null } });
    await tx.shoppingSession.update({ where: { id: room.id }, data: { state: 'agreement_reserved' } });
    await event(tx, room.id, 'checkout.reserved', { checkoutId: checkout.id });
    return checkout;
  });
}

async function release(tx: Tx, id: string) {
  const reservations = await tx.reservation.findMany({ where: { checkoutId: id, state: 'held' }, orderBy: { listingId: 'asc' } });
  for (const hold of reservations) {
    await tx.listing.update({ where: { id: hold.listingId }, data: { reserved: { decrement: hold.quantity } } });
    await tx.reservation.update({ where: { id: hold.id }, data: { state: 'released' } });
  }
}

export async function cancelCheckout(id: string, ownerId?: string, expired = false) {
  return db.$transaction(async tx => {
    await lockCheckout(tx, id);
    const checkout = await tx.checkout.findUnique({ where: { id }, include: { room: true } });
    if (!checkout || (ownerId && checkout.room.ownerId !== ownerId)) throw new RuleError('NOT_FOUND', 'Checkout not found.', 404);
    if (['cancelled', 'expired'].includes(checkout.state)) return checkout;
    if (!['reserved', 'awaiting_approval'].includes(checkout.state)) throw new RuleError('PAYMENT_UNRESOLVED', 'Payment must be resolved before this checkout can be cancelled.');
    await release(tx, id);
    const result = await tx.checkout.update({ where: { id }, data: { state: expired ? 'expired' : 'cancelled' } });
    await event(tx, checkout.roomId, 'checkout.cancelled', { checkoutId: id });
    return result;
  });
}

export async function ensureOrder(id: string) {
  const checkout = await db.$transaction(async tx => {
    await lockCheckout(tx, id);
    const c = await tx.checkout.findUniqueOrThrow({ where: { id } });
    if (c.paypalOrderId) return c;
    if (!['reserved', 'creating_order'].includes(c.state)) throw new RuleError('CHECKOUT_NOT_READY', 'Checkout is not available for payment.');
    if (c.state === 'reserved' && +c.expiresAt < Date.now()) throw new RuleError('CHECKOUT_EXPIRED', 'This reservation expired.');
    if (c.operationAt && +c.operationAt > Date.now() - 40_000) throw new RuleError('PAYMENT_CHECKING', 'An existing payment operation is still being checked.');
    return tx.checkout.update({ where: { id }, data: { state: 'creating_order', operationAt: new Date() } });
  });
  if (checkout.paypalOrderId) return { id: checkout.paypalOrderId };
  try {
    const acceptedMerchant = (checkout.snapshot as unknown as { merchantId: string | null }).merchantId;
    if (acceptedMerchant !== process.env.PAYPAL_EXPECTED_MERCHANT_ID) throw new RuleError('MERCHANT_CHANGED', 'The configured merchant changed after acceptance. Resolve this agreement before payment.');
    const terms = (checkout.snapshot as unknown as { terms: OfferTerms }).terms;
    const order = await createOrder(checkout, terms);
    if (!order.id) throw new RuleError('PAYMENT_UNRESOLVED', 'PayPal order identity was not confirmed.');
    await db.checkout.update({ where: { id }, data: { paypalOrderId: order.id, state: 'awaiting_approval', operationAt: null } });
    return { id: order.id };
  } catch (error) {
    // Keep creating_order and its original request key: a timeout may have created an order.
    throw error;
  }
}

export async function reconcileCheckout(id: string) {
  const checkout = await db.checkout.findUniqueOrThrow({ where: { id } });
  if (!checkout.paypalOrderId) return checkout;
  const order = await getOrder(checkout.paypalOrderId);
  let capture;
  try { capture = verifyOrder(order, checkout, true); }
  catch (error) {
    await db.checkout.updateMany({ where: { id, state: { notIn: error instanceof RuleError && error.code === 'PAYMENT_REVIEW_REQUIRED' ? ['refunded', 'reversed'] : ['paid', 'refunded', 'reversed'] } }, data: { state: 'review_required' } });
    throw error;
  }
  return db.$transaction(async tx => {
    await lockCheckout(tx, id);
    const current = await tx.checkout.findUniqueOrThrow({ where: { id } });
    if (['paid', 'refunded', 'reversed'].includes(current.state)) {
      if (current.state === 'paid' && capture?.status === 'REFUNDED') {
        const refunded = await tx.checkout.update({ where: { id }, data: { state: 'refunded' } });
        await event(tx, current.roomId, 'payment.refunded', { checkoutId: id });
        return refunded;
      }
      return current;
    }
    if (capture) {
      if (['cancelled', 'expired', 'failed'].includes(current.state)) {
        await event(tx, current.roomId, 'inventory.exception', { checkoutId: id, message: 'Late payment requires owner review.' });
        return tx.checkout.update({ where: { id }, data: { state: 'review_required', captureId: capture.id } });
      }
      const reservations = await tx.reservation.findMany({ where: { checkoutId: id, state: 'held' }, orderBy: { listingId: 'asc' } });
      if (!reservations.length) throw new RuleError('INVENTORY_EXCEPTION', 'Paid checkout has no protected inventory.');
      for (const hold of reservations) {
        await tx.listing.update({ where: { id: hold.listingId }, data: { onHand: { decrement: hold.quantity }, reserved: { decrement: hold.quantity } } });
        await tx.reservation.update({ where: { id: hold.id }, data: { state: 'consumed' } });
      }
      const paid = await tx.checkout.update({ where: { id }, data: { state: capture.status === 'REFUNDED' ? 'refunded' : 'paid', captureId: capture.id, operationAt: null } });
      await event(tx, current.roomId, capture.status === 'REFUNDED' ? 'payment.refunded' : 'payment.completed', { checkoutId: id });
      return paid;
    }
    const captures = order.purchase_units?.flatMap(x => x.payments?.captures || []) || [];
    if (['cancelled', 'expired', 'failed'].includes(current.state)) {
      if (captures.some(x => x.status === 'PENDING')) {
        await event(tx, current.roomId, 'inventory.exception', { checkoutId: id, message: 'Late pending payment requires owner review.' });
        return tx.checkout.update({ where: { id }, data: { state: 'review_required' } });
      }
      return current;
    }
    if (captures.some(x => x.status === 'DECLINED' || x.status === 'FAILED')) {
      await release(tx, id);
      return tx.checkout.update({ where: { id }, data: { state: 'failed', operationAt: null } });
    }
    if (captures.some(x => x.status === 'PENDING')) return tx.checkout.update({ where: { id }, data: { state: 'pending', operationAt: null } });
    // Do not turn approval into paid or release a hold merely because retrieval has no capture yet.
    return tx.checkout.update({ where: { id }, data: { updatedAt: new Date() } });
  });
}

export async function payCheckout(id: string) {
  let c = await reconcileCheckout(id);
  if (['paid', 'refunded', 'reversed'].includes(c.state)) return c;
  c = await db.$transaction(async tx => {
    await lockCheckout(tx, id);
    const checkout = await tx.checkout.findUniqueOrThrow({ where: { id } });
    if (!checkout.paypalOrderId || !['awaiting_approval', 'capturing', 'reconciling'].includes(checkout.state)) throw new RuleError('PAYMENT_NOT_READY', 'Checkout cannot be captured in its current state.');
    if (checkout.state === 'awaiting_approval' && +checkout.expiresAt < Date.now()) throw new RuleError('CHECKOUT_EXPIRED', 'The approval window expired.');
    if (checkout.operationAt && +checkout.operationAt > Date.now() - 40_000) throw new RuleError('PAYMENT_CHECKING', 'Payment is being checked. Please wait.');
    return tx.checkout.update({ where: { id }, data: { state: 'capturing', operationAt: new Date() } });
  });
  try {
    await captureOrder(c.paypalOrderId!, c.captureKey);
    return await reconcileCheckout(id);
  } catch (error) {
    await db.checkout.updateMany({ where: { id, state: 'capturing' }, data: { state: 'reconciling' } });
    throw error;
  }
}

/** Check remote evidence before releasing a timed-out approval reservation. */
export async function expireCheckout(id: string) {
  const current = await db.checkout.findUniqueOrThrow({ where: { id } });
  if (+current.expiresAt > Date.now() || !['reserved', 'awaiting_approval'].includes(current.state)) return current;
  const checked = current.paypalOrderId ? await reconcileCheckout(id) : current;
  if (!['reserved', 'awaiting_approval'].includes(checked.state)) return checked;
  return cancelCheckout(id, undefined, true);
}
