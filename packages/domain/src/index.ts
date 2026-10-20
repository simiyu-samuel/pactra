import { z } from 'zod';

export const briefSchema = z.object({
  goal: z.string().trim().min(10).max(1500),
  capCents: z.number().int().min(100).max(1_000_000),
  maxDays: z.number().int().min(1).max(30),
  preference: z.enum(['quality', 'price']),
  discloseBudget: z.boolean().default(false),
  items: z.array(z.object({ productId: z.string().min(1).max(80), quantity: z.number().int().min(1).max(5), productVersion: z.number().int().positive().optional() }).strict()).min(1).max(8).optional(),
}).strict().superRefine((brief, ctx) => {
  if (brief.items && new Set(brief.items.map(i => i.productId)).size !== brief.items.length) ctx.addIssue({ code: 'custom', message: 'Choose each product once and adjust its quantity.' });
  // Old rooms retain their original camera-kit contract. New rooms select exact catalog products.
  if (!brief.items && /\b8k\b|\b120\s?fps\b|\bwaterproof\b/i.test(brief.goal)) ctx.addIssue({ code: 'custom', message: 'This earlier camera-kit request includes an unsupported feature.' });
});
export type Brief = z.infer<typeof briefSchema>;
export const decisionSchema = z.object({
  action: z.enum(['offer', 'hold', 'decline']),
  items: z.array(z.object({ listingId: z.string(), quantity: z.number().int().min(1).max(5), unitPriceCents: z.number().int().min(0).max(1_000_000) }).strict()).max(8),
  shipping: z.enum(['standard', 'express']),
  message: z.string().max(400),
}).strict();
export type Decision = z.infer<typeof decisionSchema>;
export type Product = { id: string; name: string; role: string; score: number; video: string; audio: string; mount: string; description?: string; brand?: string; images?: string[]; sourceUrl?: string | null; isDemo?: boolean; version?: number };
export type Listing = { id: string; sellerId: string; product: Product; listCents: number; floorCents: number; available: number; status?: string };
export type Seller = { id: string; name: string; strategy: string; policyVersion: number; warrantyMonths: number; standardCents: number; standardDays: number; expressCents: number; expressDays: number };
export type OfferTerms = {
  items: Array<{ listingId: string; product: Product; quantity: number; unitPriceCents: number; listedUnitCents: number }>;
  shipping: 'standard' | 'express'; shippingCents: number; arrivalDays: number; warrantyMonths: number;
  subtotalCents: number; totalCents: number; listedTotalCents: number; currency: 'USD'; message: string;
};
export class RuleError extends Error { constructor(public code: string, message: string, public status = 409) { super(message); } }

export function makeOffer(raw: unknown, seller: Seller, listings: Listing[]): OfferTerms | null {
  const d = decisionSchema.parse(raw);
  if (d.action !== 'offer') return null;
  if (!d.items.length || new Set(d.items.map(x => x.listingId)).size !== d.items.length) throw new RuleError('INVALID_ITEMS', 'Offer items are empty or duplicated.');
  const items = d.items.map(item => {
    const listing = listings.find(x => x.id === item.listingId && x.sellerId === seller.id);
    if (!listing || listing.status && listing.status !== 'active' || listing.available < item.quantity) throw new RuleError('STOCK_UNAVAILABLE', 'An offer item is unavailable.');
    if (item.unitPriceCents < listing.floorCents || item.unitPriceCents > listing.listCents) throw new RuleError('POLICY_VIOLATION', 'The proposal violates this seller’s pricing policy.');
    return { listingId: listing.id, product: listing.product, quantity: item.quantity, unitPriceCents: item.unitPriceCents, listedUnitCents: listing.listCents };
  });
  const shippingCents = d.shipping === 'standard' ? seller.standardCents : seller.expressCents;
  const subtotalCents = items.reduce((sum, x) => sum + x.quantity * x.unitPriceCents, 0);
  return { items, shipping: d.shipping, shippingCents, arrivalDays: d.shipping === 'standard' ? seller.standardDays : seller.expressDays,
    warrantyMonths: seller.warrantyMonths, subtotalCents, totalCents: subtotalCents + shippingCents,
    listedTotalCents: items.reduce((sum, x) => sum + x.quantity * x.listedUnitCents, shippingCents), currency: 'USD', message: d.message };
}

export function constraints(offer: OfferTerms, brief: Brief): string[] {
  const reasons: string[] = [];
  if (offer.totalCents > brief.capCents) reasons.push('Over your total budget');
  if (offer.arrivalDays > brief.maxDays) reasons.push('Arrives after your deadline');
  if (brief.items) {
    for (const wanted of brief.items) {
      if (wanted.productVersion && offer.items.some(i => i.product.id === wanted.productId && (i.product.version || 1) !== wanted.productVersion)) reasons.push('This product has changed. Review it and confirm your request again.');
      if (offer.items.filter(i => i.product.id === wanted.productId).reduce((n, i) => n + i.quantity, 0) !== wanted.quantity) reasons.push('The offer must include your selected products and quantities');
    }
    if (offer.items.some(i => !brief.items!.some(w => w.productId === i.product.id))) reasons.push('The offer includes an item you did not request');
    return [...new Set(reasons)];
  }
  for (const role of ['camera', 'microphone', 'tripod']) {
    if (offer.items.filter(x => x.product.role === role).reduce((sum, x) => sum + x.quantity, 0) !== 1) reasons.push(`Needs exactly one ${role}`);
  }
  const camera = offer.items.find(x => x.product.role === 'camera')?.product;
  const mic = offer.items.find(x => x.product.role === 'microphone')?.product;
  const tripod = offer.items.find(x => x.product.role === 'tripod')?.product;
  if (camera && !camera.video.startsWith('4K')) reasons.push('Camera does not support required 4K');
  if (camera && mic && !(camera.audio === '3.5mm_TRS_input' && mic.audio === '3.5mm_TRS_output')) reasons.push('Microphone is not compatible');
  if (camera && tripod && camera.mount !== tripod.mount) reasons.push('Tripod is not compatible');
  return reasons;
}

export function utility(offer: OfferTerms, brief: Brief): number {
  if (constraints(offer, brief).length) return -1;
  if (brief.items) {
    // Exact products are shared across offers: compare total price and delivery, not invented quality.
    const price = 100 * (brief.capCents - offer.totalCents) / brief.capCents;
    const delivery = 100 * (brief.maxDays - offer.arrivalDays) / brief.maxDays;
    return brief.preference === 'price' ? price * .85 + delivery * .15 : price * .5 + delivery * .5;
  }
  const camera = offer.items.find(x => x.product.role === 'camera')!.product.score;
  const mic = offer.items.find(x => x.product.role === 'microphone')!.product.score;
  const price = 100 * (brief.capCents - offer.totalCents) / brief.capCents;
  const delivery = 100 * (brief.maxDays - offer.arrivalDays) / brief.maxDays;
  const weights = brief.preference === 'quality' ? [70, 20, 5, 5] : [15, 70, 10, 5];
  return [camera, price, delivery, mic].reduce((sum, value, i) => sum + value * weights[i], 0) / 100;
}

export const money = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
export const sellerDecisionJson = {
  type: 'object', additionalProperties: false, required: ['action', 'items', 'shipping', 'message'],
  properties: { action: { type: 'string', enum: ['offer', 'hold', 'decline'] },
    items: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['listingId', 'quantity', 'unitPriceCents'], properties: { listingId: { type: 'string' }, quantity: { type: 'integer' }, unitPriceCents: { type: 'integer' } } } },
    shipping: { type: 'string', enum: ['standard', 'express'] }, message: { type: 'string' } },
};

export type { DiscoverySource, MarketOffer, DiscoveryResult } from './discovery';
export { flightSearchSchema, shiftedFlightDates, durationMinutes } from './flights';
export type { FlightQuery, FlightSegment, FlightLeg, FlightOffer, FlightResult } from './flights';
