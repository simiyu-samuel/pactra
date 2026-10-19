import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHash, randomUUID } from 'node:crypto';
import { db, event, json, lockRoom } from '@pactra/database';
import { briefSchema, constraints, utility, RuleError, type OfferTerms } from '@pactra/domain';
import { acceptOffer, ensureOrder, payCheckout, cancelCheckout, unresolvedStates, paymentConfigured, verifyWebhook, reconcileCheckout, decide, QuotaWait, recordBrief, discover, refreshChannel3Product, createNegotiation, negotiationAllowance, duffelConfigured, searchFlights, refreshFlight } from '@pactra/integrations';
import { z } from 'zod';
import { ownerApi } from '../../../server/owner-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const notFound = () => new RuleError('NOT_FOUND', 'This resource was not found in your browser session.', 404);
const cookieName = 'pactra_session';
async function owner(req: NextRequest) {
  const token = req.cookies.get(cookieName)?.value;
  const session = token ? await db.browserSession.findUnique({ where: { tokenHash: hash(token) } }) : null;
  if (!session || +session.expiresAt < Date.now()) throw new RuleError('SESSION_REQUIRED', 'Refresh Pactra to create a browser session.', 401);
  return session.id;
}
async function ownedRoom(req: NextRequest, id: string) {
  const ownerId = await owner(req);
  const room = await db.shoppingSession.findFirst({ where: { id, ownerId } });
  if (!room) throw notFound();
  return room;
}
async function ownedCheckout(req: NextRequest, id: string) {
  const ownerId = await owner(req);
  const c = await db.checkout.findFirst({ where: { id, room: { ownerId } } });
  if (!c) throw notFound();
  return c;
}
function csrf(req: NextRequest) {
  const allowed = process.env.PUBLIC_APP_URL || req.nextUrl.origin;
  if (req.headers.get('origin') !== allowed) throw new RuleError('ORIGIN_REJECTED', 'The request origin was not accepted.', 403);
}
async function body(req: NextRequest) {
  if (Number(req.headers.get('content-length') || 0) > 50_000) throw new RuleError('BODY_TOO_LARGE', 'Request is too large.', 413);
  const text = await req.text();
  if (text.length > 50_000) throw new RuleError('BODY_TOO_LARGE', 'Request is too large.', 413);
  try { return JSON.parse(text || '{}'); } catch { throw new RuleError('INVALID_JSON', 'Invalid request body.', 400); }
}
const ok = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

async function dispatch(req: NextRequest, path: string[]) {
  const [resource, id, action] = path;
  if (req.method === 'GET' && resource === 'health') {
    await db.$queryRaw`SELECT 1`;
    return ok({ ready: true });
  }
  if (req.method === 'GET' && resource === 'bootstrap') {
    let token = req.cookies.get(cookieName)?.value;
    let existing = token ? await db.browserSession.findUnique({ where: { tokenHash: hash(token) } }) : null;
    if (!existing || +existing.expiresAt < Date.now()) {
      token = randomBytes(32).toString('base64url');
      existing = await db.browserSession.create({ data: { tokenHash: hash(token), expiresAt: new Date(Date.now() + 86_400_000) } });
    }
    const sellers = await db.seller.findMany({ orderBy: { id: 'asc' }, select: { id: true, name: true, strategy: true, warrantyMonths: true, standardDays: true, expressDays: true, listings: { select: { id: true, listCents: true, onHand: true, reserved: true, product: true } } } });
    const response = ok({ negotiationAllowance: await negotiationAllowance(existing.id), sellers: sellers.map(s => ({ ...s, listings: s.listings.map(({ onHand, reserved, ...l }) => ({ ...l, available: onHand - reserved })) })), capabilities: { groq: Boolean(process.env.GROQ_API_KEY), paypal: paymentConfigured(), channel3: Boolean(process.env.CHANNEL3_API_KEY), model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b' } });
    response.cookies.set(cookieName, token!, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 86400, path: '/' });
    return response;
  }
  if (req.method === 'GET' && resource === 'flights' && id === 'config' && !action) return ok({ configured: duffelConfigured(), mode: 'test' });
  if (req.method === 'POST' && resource === 'webhooks' && id === 'paypal') {
    const payload = z.object({ id: z.string(), event_type: z.string(), resource: z.record(z.string(), z.unknown()) }).passthrough().parse(await body(req));
    await verifyWebhook(req.headers, payload);
    const stored = await db.paymentEvent.upsert({ where: { id: payload.id }, create: { id: payload.id, type: payload.event_type, body: json(payload), verified: true }, update: {} });
    if (!stored.processed) {
      const related = payload.resource.supplementary_data as { related_ids?: { order_id?: string; capture_id?: string } } | undefined;
      const orderId = related?.related_ids?.order_id;
      const captureId = related?.related_ids?.capture_id || String(payload.resource.id || '');
      const checkout = await db.checkout.findFirst({ where: { OR: [...(orderId ? [{ paypalOrderId: orderId }] : []), { captureId }] } });
      if (checkout) {
        await reconcileCheckout(checkout.id);
        if (['PAYMENT.CAPTURE.REFUNDED', 'PAYMENT.CAPTURE.REVERSED'].includes(payload.event_type) && checkout.captureId === captureId) {
          await db.checkout.update({ where: { id: checkout.id }, data: { state: payload.event_type.endsWith('REFUNDED') ? 'refunded' : 'reversed' } });
        }
        await db.paymentEvent.update({ where: { id: payload.id }, data: { checkoutId: checkout.id, processed: true } });
      } else await db.paymentEvent.update({ where: { id: payload.id }, data: { processed: true } });
    }
    return ok({ received: true });
  }
  if (req.method === 'POST') csrf(req);
  if (resource === 'owner') return ownerApi(req, path.slice(1), () => body(req));
  if (resource === 'flights' && id === 'search' && !action && req.method === 'POST') return ok(await searchFlights(await owner(req), await body(req)));
  if (resource === 'flights' && id === 'refresh' && !action && req.method === 'POST') {
    const ownerId = await owner(req);
    const input = z.object({ searchId: z.uuid(), offerId: z.string().regex(/^off_[A-Za-z0-9_-]+$/).max(120) }).strict().parse(await body(req));
    return ok(await refreshFlight(ownerId, input.searchId, input.offerId));
  }
  if (resource === 'discovery' && id === 'product' && !action && req.method === 'POST') {
    const ownerId = await owner(req);
    const input = z.object({ productId: z.string().min(1).max(120) }).parse(await body(req));
    return ok(await refreshChannel3Product(ownerId, input.productId));
  }
  if (resource === 'discovery' && !id && req.method === 'POST') {
    const ownerId = await owner(req);
    const input = z.object({ query: z.string().trim().min(2).max(240), source: z.enum(['channel3', 'jumia', 'kilimall', 'amazon']) }).parse(await body(req));
    return ok(await discover(ownerId, input.query, input.source));
  }
  if (resource === 'briefs' && id === 'interpret' && req.method === 'POST') {
    await owner(req);
    const { text } = z.object({ text: z.string().min(10).max(1500) }).parse(await body(req));
    const schema = { type: 'object', additionalProperties: false, required: ['goal', 'capCents', 'maxDays', 'preference', 'discloseBudget'], properties: { goal: { type: 'string' }, capCents: { type: 'integer' }, maxDays: { type: 'integer' }, preference: { type: 'string', enum: ['quality', 'price'] }, discloseBudget: { type: 'boolean' } } };
    const draft = await decide('Extract a confirmable shopping brief for a fictional 4K camera, microphone and tripod kit. Do not begin negotiation. Budget is USD cents. Default arrival 4 days and preference quality only when omitted. Missing budget must be 0 so the user must correct it. Do not disclose budget to sellers unless explicitly requested. Preserve unsupported requirements in the goal and never claim support.', { text }, schema);
    return ok({ draft });
  }
  if (resource === 'shopping-sessions' && !id && req.method === 'POST') {
    const ownerId = await owner(req);
    if (!process.env.GROQ_API_KEY) throw new RuleError('GROQ_NOT_CONFIGURED', 'Live negotiation needs a Groq key on the server.', 503);
    const input = z.object({ brief: briefSchema, commandKey: z.uuid() }).parse(await body(req));
    const room = await createNegotiation(ownerId, input.brief, input.commandKey);
    return ok(room, 201);
  }
  if (resource === 'shopping-sessions' && id) {
    const room = await ownedRoom(req, id);
    if (req.method === 'GET' && action === 'events') {
      let cursor = Number(req.headers.get('last-event-id') || req.nextUrl.searchParams.get('after') || 0);
      if (!Number.isSafeInteger(cursor) || cursor < 0) cursor = 0;
      const encoder = new TextEncoder();
      let timer: ReturnType<typeof setTimeout>;
      let closed = false;
      const stream = new ReadableStream({ start(controller) {
        const finish = () => { if (!closed) { closed = true; clearTimeout(timer); controller.close(); } };
        req.signal.addEventListener('abort', finish, { once: true });
        const started = Date.now();
        async function poll() {
          if (closed) return;
          try {
            const events = await db.roomEvent.findMany({ where: { roomId: id, sequence: { gt: cursor } }, orderBy: { sequence: 'asc' }, take: 50 });
            for (const e of events) { if (closed) return; controller.enqueue(encoder.encode(`id: ${e.sequence}\ndata: ${JSON.stringify(e)}\n\n`)); cursor = e.sequence; }
            if (!closed) controller.enqueue(encoder.encode(': heartbeat\n\n'));
          } catch { finish(); return; }
          if (Date.now() - started > 55_000) { finish(); return; }
          if (!closed) timer = setTimeout(poll, 1500);
        }
        void poll();
      }, cancel() { closed = true; clearTimeout(timer); } });
      return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' } });
    }
    if (req.method === 'POST' && action === 'revisions') {
      const input = z.object({ brief: briefSchema, expectedVersion: z.number().int() }).parse(await body(req));
      const revised = await db.$transaction(async tx => {
        await lockRoom(tx, id);
        const current = await tx.shoppingSession.findUniqueOrThrow({ where: { id } });
        if (current.version !== input.expectedVersion || current.version >= 2) throw new RuleError('REVISION_LIMIT', 'This brief changed already. Start a fresh room for another revision.');
        if (await tx.checkout.findFirst({ where: { roomId: id, state: { in: [...unresolvedStates, 'paid', 'refunded', 'reversed'] } } })) throw new RuleError('CHECKOUT_LOCKED', 'Resolve your checkout before revising the brief.');
        await recordBrief(tx, id, current.version, current.brief, 'current_baseline');
        await tx.offer.updateMany({ where: { roomId: id, status: 'active' }, data: { status: 'superseded' } });
        await tx.job.updateMany({ where: { roomId: id, state: { in: ['ready', 'running'] } }, data: { state: 'cancelled', leaseUntil: null } });
        const result = await tx.shoppingSession.update({ where: { id }, data: { version: { increment: 1 }, brief: json(input.brief), state: 'queued' } });
        await recordBrief(tx, id, result.version, input.brief);
        await tx.job.create({ data: { key: `${id}:${result.version}`, roomId: id, briefVersion: result.version } });
        await event(tx, id, 'brief.revised', { message: 'Brief updated. Old offers cannot be selected for the new requirements.' });
        return result;
      });
      return ok(revised);
    }
    if (req.method === 'GET' && !action) {
      const brief = briefSchema.parse(room.brief);
      const offers = await db.offer.findMany({ where: { roomId: id, briefVersion: room.version, status: { in: ['active', 'locked'] } }, include: { seller: true }, orderBy: { createdAt: 'desc' } });
      const currentStock = new Map((await db.listing.findMany({ where: { id: { in: offers.flatMap(o => (o.terms as unknown as OfferTerms).items.map(x => x.listingId)) } }, select: { id: true, onHand: true, reserved: true } })).map(x => [x.id, x.onHand - x.reserved]));
      const projected = offers.map(o => {
        const terms = o.terms as unknown as OfferTerms;
        const reasons = constraints(terms, brief);
        if (+o.expiresAt < Date.now() && o.status !== 'locked') reasons.push('Offer expired');
        if (o.policyVersion !== o.seller.policyVersion && o.status !== 'locked') reasons.push('Seller policy changed');
        if (o.status !== 'locked' && terms.items.some(x => (currentStock.get(x.listingId) ?? 0) < x.quantity)) reasons.push('An item is no longer available');
        return { id: o.id, sellerId: o.sellerId, sellerName: o.seller.name, round: o.round, terms, status: o.status, reasons, score: reasons.length ? -1 : utility(terms, brief) };
      }).sort((a, b) => b.score - a.score || a.terms.totalCents - b.terms.totalCents || a.id.localeCompare(b.id));
      const events = await db.roomEvent.findMany({ where: { roomId: id }, orderBy: { sequence: 'desc' }, take: 40 });
      const checkouts = await db.checkout.findMany({ where: { roomId: id }, select: { id: true, state: true, totalCents: true }, orderBy: { createdAt: 'desc' } });
      const briefHistory = await db.buyerBriefVersion.findMany({ where: { roomId: id }, orderBy: { version: 'asc' }, select: { version: true, brief: true, createdAt: true, source: true } });
      return ok({ ...room, offers: projected, events: events.reverse(), checkouts, briefHistory });
    }
  }
  if (resource === 'checkouts' && !id && req.method === 'POST') {
    const ownerId = await owner(req);
    if (!paymentConfigured()) throw new RuleError('PAYPAL_NOT_CONFIGURED', 'PayPal sandbox credentials are needed before reserving a paid checkout.', 503);
    const input = z.object({ offerId: z.uuid(), commandKey: z.uuid() }).parse(await body(req));
    const c = await acceptOffer(ownerId, input.offerId, input.commandKey);
    return ok({ id: c.id, roomId: c.roomId, state: c.state, totalCents: c.totalCents }, 201);
  }
  if (resource === 'checkouts' && id) {
    const checkout = await ownedCheckout(req, id);
    if (req.method === 'GET' && !action) return ok({ id: checkout.id, roomId: checkout.roomId, state: checkout.state, snapshot: checkout.snapshot, snapshotHash: checkout.snapshotHash, totalCents: checkout.totalCents, paypalOrderId: checkout.paypalOrderId, captureId: checkout.captureId, expiresAt: checkout.expiresAt, clientId: process.env.PAYPAL_CLIENT_ID || null });
    if (req.method === 'POST' && action === 'paypal-order') return ok(await ensureOrder(id));
    if (req.method === 'POST' && action === 'capture') {
      const input = z.object({ orderId: z.string().min(1) }).parse(await body(req));
      if (checkout.paypalOrderId !== input.orderId) throw new RuleError('PAYMENT_MISMATCH', 'The payment order does not belong to this checkout.');
      const result = await payCheckout(id);
      return ok({ id: result.id, state: result.state });
    }
    if (req.method === 'POST' && action === 'cancel') return ok(await cancelCheckout(id, await owner(req)));
  }
  throw notFound();
}

async function handle(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try { return await dispatch(req, (await context.params).path); }
  catch (error) {
    const correlationId = randomUUID();
    if (error instanceof QuotaWait) return NextResponse.json({ error: { code: 'PROVIDER_WAIT', message: error.message, correlationId } }, { status: 429, headers: { 'Retry-After': String(Math.ceil(error.retryMs / 1000)) } });
    if (error instanceof z.ZodError) return ok({ error: { code: 'INVALID_INPUT', message: 'Check the required fields and allowed values.', correlationId } }, 400);
    if (error instanceof RuleError) return ok({ error: { code: error.code, message: error.message, correlationId } }, error.status);
    console.error('Pactra request failed', correlationId, (error as { code?: string }).code || 'INTERNAL');
    return ok({ error: { code: 'UNAVAILABLE', message: 'Pactra could not complete this request. Check the database and server configuration.', correlationId } }, 503);
  }
}
export { handle as GET, handle as POST };
