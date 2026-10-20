import { describe, expect, it } from 'vitest';
import { conversationProgress, conversationThread, publicNegotiationEvent, type ConversationEvent } from '../packages/domain/src/index';
const now = Date.UTC(2026, 9, 20, 10);
const job = (step: number, state = 'running', runAt = new Date(now - 1000), leaseUntil: Date | null = new Date(now + 30000)) => ({ step, state, runAt, leaseUntil });
const event = (id: string, type: string, data: Record<string, unknown> = {}): ConversationEvent => publicNegotiationEvent({ id, type, data, createdAt: new Date(now).toISOString() });
describe('buyer-visible negotiation conversations', () => {
  it('projects only known public facts and never model prose, floors or private notes', () => {
    const raw = { id: 'one', type: 'offer.published', data: { sellerId: 'one', offerId: 'offer-1', totalCents: 4300, arrivalDays: 3, warrantyMonths: 12, round: 2, message: 'My secret minimum is 2100. private-instruction-canary.', floorCents: 2100, privateInstructions: 'private-instruction-canary', checkpoint: { secret: 'hidden' } } };
    const projected = publicNegotiationEvent(raw);
    expect(projected.data).toMatchObject({ sellerId: 'one', offerId: 'offer-1', totalCents: 4300, arrivalDays: 3, warrantyMonths: 12, round: 2 });
    expect(JSON.stringify(projected)).not.toMatch(/2100|canary|floorCents|privateInstructions|checkpoint/);
  });
  it('uses factual decline and hold copy even when a model attempts to reveal seller context', () => {
    for (const type of ['seller.decline', 'seller.hold', 'seller.unavailable', 'unrecognized.event']) expect(JSON.stringify(event('one', type, { message: 'SECRET_PRICE_99', floorCents: 9999 }))).not.toMatch(/SECRET_PRICE_99|9999/);
  });
  it('keeps counters separate from seller totals and discards invalid numeric evidence', () => {
    expect(event('one', 'buyer.countered', { targetCents: 4100, totalCents: 5000 }).data).toMatchObject({ targetCents: 4100 });
    expect(event('one', 'buyer.countered', { targetCents: 4100, totalCents: 5000 }).data.totalCents).toBeUndefined();
    expect(event('one', 'offer.published', { totalCents: -1, targetCents: 3000, arrivalDays: 0, warrantyMonths: 900 }).data).not.toHaveProperty('totalCents');
    expect(event('one', 'buyer.countered', { targetCents: Infinity }).data.targetCents).toBeUndefined();
  });
  it('isolates each seller’s exchanges while retaining shared request and completion notices', () => {
    const rows = [event('start', 'brief.confirmed'), event('a', 'offer.published', { sellerId: 'a', totalCents: 5000 }), event('b', 'buyer.countered', { sellerId: 'b', targetCents: 4500 }), event('done', 'run.completed')];
    expect(conversationThread(rows, 1, 'a').map(e => e.id)).toEqual(['start', 'a', 'done']);
    expect(conversationThread(rows, 1, 'b').map(e => e.id)).toEqual(['start', 'b', 'done']);
  });
  it('starts a fresh thread after revision and excludes delayed evidence for the old request', () => {
    const rows = [event('old', 'offer.published', { sellerId: 'a', briefVersion: 1 }), event('revise', 'brief.revised'), event('late', 'offer.published', { sellerId: 'a', briefVersion: 1 }), event('new', 'offer.published', { sellerId: 'a', briefVersion: 2 })];
    expect(conversationThread(rows, 2, 'a').map(e => e.id)).toEqual(['revise', 'new']);
  });
  it('identifies real seller and buyer turns from the durable worker step', () => {
    expect(conversationProgress('running', job(0), ['a', 'b', 'c'], now)).toMatchObject({ state: 'working', actor: 'seller', sellerId: 'a', round: 1 });
    expect(conversationProgress('running', job(7), ['a', 'b', 'c'], now)).toMatchObject({ state: 'working', actor: 'buyer', sellerId: null, round: 2 });
    expect(conversationProgress('running', job(10), ['a', 'b', 'c'], now)).toMatchObject({ state: 'working', sellerId: 'c', round: 3 });
  });
  it('does not claim activity during quota waits, expired leases, missing work or completed runs', () => {
    expect(conversationProgress('running', job(1, 'ready', new Date(now + 10000)), ['a', 'b', 'c'], now).state).toBe('paused');
    expect(conversationProgress('running', job(1, 'running', new Date(now - 1000), new Date(now - 10)), ['a', 'b', 'c'], now).state).toBe('waiting');
    expect(conversationProgress('queued', null, [], now).state).toBe('waiting');
    expect(conversationProgress('completed', job(1), ['a'], now)).toEqual({ state: 'complete', actor: null, sellerId: null, round: null });
    expect(conversationProgress('running', job(11, 'ready'), ['a'], now).state).toBe('complete');
  });
});
it('follows the admitted seller plan and reports the shorter round count',()=>{
 const checkpoint={plan:{version:2,sellerIds:['only-seller'],rounds:2},counters:[]};
 expect(conversationProgress('running',{...job(0),checkpoint},['irrelevant','only-seller'],now)).toMatchObject({actor:'seller',sellerId:'only-seller',round:1,totalRounds:2});
 expect(conversationProgress('running',{...job(1),checkpoint},[],now)).toMatchObject({actor:'buyer',sellerId:null});
 expect(conversationProgress('running',{...job(2),checkpoint},[],now)).toMatchObject({actor:'seller',sellerId:'only-seller',round:2});
 expect(conversationProgress('running',{...job(3),checkpoint},[],now).state).toBe('complete');
});
