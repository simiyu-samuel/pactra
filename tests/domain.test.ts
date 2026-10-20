import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import { briefSchema, constraints, makeOffer, utility, type Listing, type Seller } from '../packages/domain/src/index';
function csv(name: string): Record<string, string>[] { return parse(readFileSync(new URL(`../assets/demo/${name}.csv`, import.meta.url)), { columns: true, skip_empty_lines: true }); }
const products = csv('products');
const listings: Listing[] = csv('listings').map(x => { const p = products.find(p => p.product_id === x.product_id)!; return { id: x.listing_id, sellerId: x.seller_id, listCents: +x.list_price_cents, floorCents: +x.private_floor_cents, available: +x.on_hand, product: { id: p.product_id, name: p.name, role: p.role, score: +p.capability_score, video: p.max_video_mode, audio: p.audio_interface, mount: p.tripod_mount } }; });
const sellers: Seller[] = csv('seller-policies').map(s => ({ id: s.seller_id, name: s.display_name, strategy: s.strategy, policyVersion: 1, warrantyMonths: +s.warranty_months, standardCents: +s.standard_shipping_cents, standardDays: +s.standard_arrival_days, expressCents: +s.express_shipping_cents, expressDays: +s.express_arrival_days }));
const brief = briefSchema.parse({ goal: 'A creator camera kit with 4K, microphone and tripod.', capCents: 43000, maxDays: 4, preference: 'quality' });
const proposal = (prefix: string, camera: string, prices: number[]) => ({ action: 'offer', shipping: 'standard', message: 'A compatible creator kit.', items: [`${prefix}-CAM-${camera}`, `${prefix}-MIC-01`, `${prefix}-TRI-01`].map((listingId, i) => ({ listingId, quantity: 1, unitPriceCents: prices[i] })) });

describe('validated negotiation agreements', () => {
  it('changes the recommendation when the buyer changes priorities', () => {
    const studio = makeOffer(proposal('SS', '02', [37900, 1900, 1100]), sellers[1], listings)!;
    const swift = makeOffer(proposal('SG', '01', [32900, 2900, 1900]), sellers[2], listings)!;
    expect(studio.totalCents).toBe(41900); expect(swift.totalCents).toBe(39200);
    expect(studio.listedTotalCents - studio.totalCents).toBe(6800);
    expect(utility(studio, brief)).toBeGreaterThan(utility(swift, brief));
    expect(utility(studio, { ...brief, preference: 'price' })).toBeLessThan(utility(swift, { ...brief, preference: 'price' }));
    expect(JSON.stringify(studio)).not.toContain('floorCents');
  });
  it('rejects below-floor prices, another seller’s products and duplicate lines', () => {
    expect(() => makeOffer(proposal('SS', '02', [1, 1900, 1100]), sellers[1], listings)).toThrow('pricing policy');
    expect(() => makeOffer(proposal('SS', '02', [37900, 1900, 1100]), sellers[0], listings)).toThrow('unavailable');
    const p = proposal('SS', '02', [37900, 1900, 1100]); p.items.push(p.items[0]);
    expect(() => makeOffer(p, sellers[1], listings)).toThrow('duplicated');
  });
  it('never ranks a cheap camera that misses the required capability', () => {
    const offer = makeOffer(proposal('SG', '03', [22900, 2900, 1900]), sellers[2], listings)!;
    expect(constraints(offer, brief)).toContain('Camera does not support required 4K');
    expect(utility(offer, brief)).toBe(-1);
  });
  it('enforces all-in budget and fixed shipping promises', () => {
    const opening = makeOffer({ ...proposal('PP', '02', [36900, 2900, 1900]), shipping: 'express' }, sellers[0], listings)!;
    expect(opening.totalCents).toBe(43500);
    expect(constraints(opening, brief)).toContain('Over your total budget');
    expect(() => makeOffer({ ...proposal('PP', '02', [36900, 2900, 1900]), shipping: 'free' }, sellers[0], listings)).toThrow();
  });
  it('rejects zero deadlines and unavailable stock', () => {
    expect(() => briefSchema.parse({ ...brief, maxDays: 0 })).toThrow();
    expect(() => makeOffer(proposal('SS', '02', [37900, 1900, 1100]), sellers[1], listings.map(l => ({ ...l, available: 0 })))).toThrow('unavailable');
  });
  it('does not silently weaken unsupported hard capabilities', () => {
    expect(() => briefSchema.parse({ ...brief, goal: 'I need an 8K camera, microphone and tripod.' })).toThrow();
  });
});

describe('exact product requests across categories', () => {
  it('rejects duplicate products and quantities outside the supported range', () => {
    const item={productId:'BAG-01',quantity:1};
    expect(()=>briefSchema.parse({...brief,items:[item,item]})).toThrow('Choose each product once');
    expect(()=>briefSchema.parse({...brief,items:[{...item,quantity:6}]})).toThrow();
  });
  it('checks exact identities, quantities and unexpected extras without camera assumptions', () => {
    const item={listingId:'book',quantity:2,unitPriceCents:2000,listedUnitCents:2500,product:{id:'BOOK-01',name:'Field guide',role:'books',score:50,video:'',audio:'',mount:''}};
    const offer={items:[item],shipping:'standard' as const,shippingCents:500,arrivalDays:3,warrantyMonths:0,subtotalCents:4000,totalCents:4500,listedTotalCents:5500,currency:'USD' as const,message:'Two books with delivery.'};
    const request={...brief,items:[{productId:'BOOK-01',quantity:2}]};
    expect(constraints(offer,request)).toEqual([]);
    expect(constraints({...offer,items:[{...item,product:{...item.product,id:'OTHER'}}]},request)).toContain('The offer must include your selected products and quantities');
    expect(constraints({...offer,items:[item,{...item,listingId:'extra',product:{...item.product,id:'EXTRA'}}]},request)).toContain('The offer includes an item you did not request');
    expect(utility(offer,request)).toBeGreaterThan(utility({...offer,arrivalDays:4},request));
  });
});
