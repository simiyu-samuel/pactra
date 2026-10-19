import { RuleError, type OfferTerms } from '@pactra/domain';

export type PayPalOrder = { id: string; status: string; purchase_units?: Array<{ reference_id?: string; custom_id?: string; payee?: { merchant_id?: string }; amount?: { currency_code: string; value: string }; payments?: { captures?: Array<{ id: string; status: string; amount: { currency_code: string; value: string } }> } }> };
let cachedToken: { value: string; expires: number } | undefined;
const base = 'https://api-m.sandbox.paypal.com';
export function paymentConfigured() { return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET && process.env.PAYPAL_EXPECTED_MERCHANT_ID); }

async function token() {
  if (!paymentConfigured()) throw new RuleError('PAYPAL_NOT_CONFIGURED', 'Configure the PayPal sandbox merchant credentials before checkout.', 503);
  if (process.env.PAYPAL_ENV && process.env.PAYPAL_ENV !== 'sandbox') throw new RuleError('SANDBOX_REQUIRED', 'This build permits PayPal sandbox only.', 503);
  if (cachedToken && cachedToken.expires > Date.now()) return cachedToken.value;
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const response = await fetch(`${base}/v1/oauth2/token`, { method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials', signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new RuleError('PAYPAL_AUTH_FAILED', 'PayPal sandbox authentication failed.', 502);
  const body = await response.json() as { access_token: string; expires_in: number };
  cachedToken = { value: body.access_token, expires: Date.now() + (body.expires_in - 60) * 1000 };
  return body.access_token;
}

/** Authenticate against sandbox without creating or capturing a payment. */
export async function verifyPayPalConnection() { await token(); }

async function request<T>(path: string, method = 'GET', body?: unknown, key?: string): Promise<T> {
  const access = await token();
  const response = await fetch(`${base}${path}`, { method, headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json', ...(key ? { 'PayPal-Request-Id': key } : {}) }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new RuleError('PAYPAL_REQUEST_FAILED', 'PayPal could not confirm the operation. Payment status will be checked before retrying.', 502);
  return response.json() as Promise<T>;
}
const amount = (cents: number) => ({ currency_code: 'USD', value: (cents / 100).toFixed(2) });
export async function createOrder(checkout: { id: string; snapshotHash: string; createKey: string }, terms: OfferTerms) {
  return request<PayPalOrder>('/v2/checkout/orders', 'POST', {
    intent: 'CAPTURE', purchase_units: [{ reference_id: checkout.id, custom_id: checkout.snapshotHash,
      payee: { merchant_id: process.env.PAYPAL_EXPECTED_MERCHANT_ID }, description: 'Pactra fictional creator kit — sandbox demo',
      amount: { ...amount(terms.totalCents), breakdown: { item_total: amount(terms.subtotalCents), shipping: amount(terms.shippingCents) } },
      items: terms.items.map(x => ({ name: x.product.name, quantity: String(x.quantity), unit_amount: amount(x.unitPriceCents), category: 'PHYSICAL_GOODS' })) }],
    application_context: { shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW' },
  }, checkout.createKey);
}
export const getOrder = (id: string) => request<PayPalOrder>(`/v2/checkout/orders/${encodeURIComponent(id)}`);
export const captureOrder = (id: string, key: string) => request<PayPalOrder>(`/v2/checkout/orders/${encodeURIComponent(id)}/capture`, 'POST', {}, key);

export function verifyOrder(order: PayPalOrder, checkout: { id: string; snapshotHash: string; totalCents: number; paypalOrderId?: string | null; captureId?: string | null }, requireCapture = false) {
  const units = order.purchase_units;
  if (checkout.paypalOrderId && order.id !== checkout.paypalOrderId) throw new RuleError('PAYMENT_MISMATCH', 'Payment order does not match the accepted agreement.');
  if (units?.length !== 1) throw new RuleError('PAYMENT_MISMATCH', 'Payment purchase units do not match the agreement.');
  const unit = units[0];
  if (unit.reference_id !== checkout.id || unit.custom_id !== checkout.snapshotHash || unit.payee?.merchant_id !== process.env.PAYPAL_EXPECTED_MERCHANT_ID || unit.amount?.currency_code !== 'USD' || unit.amount.value !== (checkout.totalCents / 100).toFixed(2)) throw new RuleError('PAYMENT_MISMATCH', 'Payment amount, recipient, or reference does not match the agreement.');
  if (!requireCapture) return null;
  const captures = unit.payments?.captures;
  if (!captures?.length) return null;
  if (captures.length !== 1 || !captures[0].id || checkout.captureId && captures[0].id !== checkout.captureId || captures[0].amount?.currency_code !== 'USD' || captures[0].amount?.value !== (checkout.totalCents / 100).toFixed(2)) throw new RuleError('PAYMENT_MISMATCH', 'Capture amount or identity does not match the accepted agreement.');
  if (!['COMPLETED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'PENDING', 'DECLINED', 'FAILED'].includes(captures[0].status)) throw new RuleError('PAYMENT_REVIEW_REQUIRED', 'The provider returned an unsupported capture state.');
  if (captures[0].status === 'PARTIALLY_REFUNDED') throw new RuleError('PAYMENT_REVIEW_REQUIRED', 'A partial refund requires owner review.');
  if (!['COMPLETED', 'REFUNDED'].includes(captures[0].status)) return null;
  return captures[0];
}

export async function verifyWebhook(headers: Headers, body: unknown) {
  if (!process.env.PAYPAL_WEBHOOK_ID) throw new RuleError('WEBHOOK_NOT_CONFIGURED', 'PayPal webhook verification is not configured.', 503);
  const names = ['auth-algo', 'cert-url', 'transmission-id', 'transmission-sig', 'transmission-time'];
  if (names.some(name => !headers.get(`paypal-${name}`))) throw new RuleError('INVALID_WEBHOOK', 'Required PayPal verification headers are missing.', 400);
  const result = await request<{ verification_status: string }>('/v1/notifications/verify-webhook-signature', 'POST', {
    auth_algo: headers.get('paypal-auth-algo'), cert_url: headers.get('paypal-cert-url'), transmission_id: headers.get('paypal-transmission-id'), transmission_sig: headers.get('paypal-transmission-sig'), transmission_time: headers.get('paypal-transmission-time'), webhook_id: process.env.PAYPAL_WEBHOOK_ID, webhook_event: body,
  });
  if (result.verification_status !== 'SUCCESS') throw new RuleError('INVALID_WEBHOOK', 'PayPal signature verification failed.', 400);
}
