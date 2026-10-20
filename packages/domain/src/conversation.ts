/** Buyer-visible facts only: model prose and private seller context never cross this projection. */
export type ConversationData = {
  message?: string; sellerId?: string; offerId?: string; round?: number; briefVersion?: number;
  totalCents?: number; targetCents?: number; arrivalDays?: number; warrantyMonths?: number;
};
export type ConversationEvent = { id: string; type: string; data: ConversationData; createdAt: string };
export type NegotiationProgress = {
  state: 'working' | 'waiting' | 'paused' | 'complete'; actor: 'buyer' | 'seller' | null;
  sellerId: string | null; round: number | null;
};
const notices: Record<string, string> = {
  'brief.confirmed': 'Your request is confirmed. Your agent will discuss the deal with sellers.',
  'brief.revised': 'Your request changed. This conversation follows your latest selection and limits.',
  'buyer.countered': 'Your agent asked this seller for better terms.',
  'offer.published': 'The seller proposed a total that includes delivery.',
  'seller.hold': 'The seller kept their current proposal.',
  'seller.decline': 'The seller could not offer a deal for this request.',
  'seller.unavailable': 'An agent could not update the offer. Other available offers can still be compared.',
  'run.completed': 'The conversation is complete. Compare current offers and choose what works for you.',
  'run.no_deal': 'No current offer meets every requirement. You can change your request and try again.',
  'run.limit_reached': 'The conversation paused at its time or usage limit. You can review any current offers.',
  'checkout.reserved': 'You selected a deal. Its exact terms are saved for your review.',
  'checkout.cancelled': 'The unpaid reservation was cancelled.',
  'payment.completed': 'PayPal confirmed the test payment for your selected agreement.',
  'payment.refunded': 'PayPal reported a refund for this test payment.',
  'inventory.exception': 'This agreement needs a stock review. Please check its payment status.',
};
export function publicNegotiationEvent<T extends { type: string; data: unknown }>(event: T): Omit<T, 'data'> & { data: ConversationData } {
  const raw = event.data && typeof event.data === 'object' ? event.data as Record<string, unknown> : {};
  const data: ConversationData = { message: notices[event.type] || 'Your conversation has been updated.' };
  if (typeof raw.sellerId === 'string' && raw.sellerId.length <= 100) data.sellerId = raw.sellerId;
  const integer = (key: keyof ConversationData, min: number, max: number) => {
    const value = raw[key];
    if (typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max) (data as Record<string, unknown>)[key] = value;
  };
  integer('briefVersion', 1, 2); integer('round', 1, 3);
  if (event.type === 'offer.published') {
    integer('totalCents', 0, 100_000_000); integer('arrivalDays', 1, 30); integer('warrantyMonths', 0, 60);
    if (typeof raw.offerId === 'string' && raw.offerId.length <= 100) data.offerId = raw.offerId;
  }
  if (event.type === 'buyer.countered') integer('targetCents', 0, 100_000_000);
  return { ...event, data };
}
export function currentConversation(events: ConversationEvent[], version: number) {
  let start = -1;
  for (let i = events.length - 1; i >= 0; i--) if (events[i].type === 'brief.revised' || events[i].type === 'brief.confirmed') { start = i; break; }
  return events.slice(Math.max(0, start)).filter(e => !e.data.briefVersion || e.data.briefVersion === version);
}
export function conversationProgress(roomState: string, job: { state: string; step: number; runAt: Date; leaseUntil: Date | null } | null, sellerIds: string[], now = Date.now()): NegotiationProgress {
  if (!['queued', 'running'].includes(roomState) || (job && job.step >= 11) || job?.state === 'done' || job?.state === 'cancelled') return { state: 'complete', actor: null, sellerId: null, round: null };
  if (!job) return { state: 'waiting', actor: null, sellerId: null, round: null };
  const buyer = job.step === 3 || job.step === 7;
  return {
    state: job.state === 'ready' && +job.runAt > now ? 'paused' : job.state === 'running' && job.leaseUntil && +job.leaseUntil > now ? 'working' : 'waiting',
    actor: buyer ? 'buyer' : 'seller', sellerId: buyer ? null : sellerIds[job.step % 4] || null, round: Math.floor(job.step / 4) + 1,
  };
}

export function conversationThread(events: ConversationEvent[], version: number, sellerId: string) {
  return currentConversation(events, version).filter(event => !event.data.sellerId || event.data.sellerId === sellerId);
}
