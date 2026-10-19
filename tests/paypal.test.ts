import { describe, it, expect } from 'vitest';
import { verifyOrder, type PayPalOrder } from '../packages/integrations/src/paypal';
const checkout = { id: 'local-checkout', snapshotHash: 'accepted-terms', totalCents: 41900, paypalOrderId: 'ORDER-1' };
function order(): PayPalOrder { return { id: 'ORDER-1', status: 'COMPLETED', purchase_units: [{ reference_id: checkout.id, custom_id: checkout.snapshotHash, payee: { merchant_id: 'MERCHANT-1' }, amount: { currency_code: 'USD', value: '419.00' }, payments: { captures: [{ id: 'CAPTURE-1', status: 'COMPLETED', amount: { currency_code: 'USD', value: '419.00' } }] } }] }; }
describe('provider evidence matches the exact accepted agreement', () => {
  it('accepts a completed capture with matching identity, recipient and amount', () => {
    process.env.PAYPAL_EXPECTED_MERCHANT_ID = 'MERCHANT-1';
    expect(verifyOrder(order(), checkout, true)?.id).toBe('CAPTURE-1');
  });
  it.each(['amount', 'payee', 'reference', 'hash', 'order'])('rejects a changed %s', changed => {
    process.env.PAYPAL_EXPECTED_MERCHANT_ID = 'MERCHANT-1'; const result = order(); const unit = result.purchase_units![0];
    if (changed === 'amount') unit.amount!.value = '420.00';
    if (changed === 'payee') unit.payee!.merchant_id = 'OTHER';
    if (changed === 'reference') unit.reference_id = 'OTHER';
    if (changed === 'hash') unit.custom_id = 'OTHER';
    if (changed === 'order') result.id = 'OTHER';
    expect(() => verifyOrder(result, checkout, true)).toThrow();
  });
  it('does not mistake buyer approval or pending capture for paid', () => {
    process.env.PAYPAL_EXPECTED_MERCHANT_ID = 'MERCHANT-1'; const result = order();
    result.status = 'APPROVED'; result.purchase_units![0].payments = undefined;
    expect(verifyOrder(result, checkout, true)).toBeNull();
    result.purchase_units![0].payments = { captures: [{ id: 'pending', status: 'PENDING', amount: { currency_code: 'USD', value: '419.00' } }] };
    expect(verifyOrder(result, checkout, true)).toBeNull();
  });
});

it.each(['amount', 'currency', 'identity', 'multiple'])('rejects completed capture %s mismatches instead of treating them as pending', changed => {
  process.env.PAYPAL_EXPECTED_MERCHANT_ID = 'MERCHANT-1'; const result = order(); const captures = result.purchase_units![0].payments!.captures!;
  if (changed === 'amount') captures[0].amount.value = '1.00';
  if (changed === 'currency') captures[0].amount.currency_code = 'EUR';
  if (changed === 'identity') captures[0].id = '';
  if (changed === 'multiple') captures.push({ ...captures[0], id: 'CAPTURE-2' });
  expect(() => verifyOrder(result, checkout, true)).toThrow('Capture amount or identity');
});

it('routes an unknown capture state to review rather than treating it as an unpaid approval', () => {
  process.env.PAYPAL_EXPECTED_MERCHANT_ID = 'MERCHANT-1'; const result = order(); result.purchase_units![0].payments!.captures![0].status = 'UNRECOGNIZED';
  expect(() => verifyOrder(result, checkout, true)).toThrow('unsupported capture state');
});
