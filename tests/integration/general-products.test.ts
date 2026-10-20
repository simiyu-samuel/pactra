import { beforeEach, afterEach, afterAll, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { db, json } from '../../packages/database/src/index';
import { makeOffer, constraints, utility } from '../../packages/domain/src/index';
import { addSellerProduct } from '../../packages/integrations/src/catalog';
import { createNegotiation } from '../../packages/integrations/src/negotiations';
import { acceptOffer, cancelCheckout } from '../../packages/integrations/src/checkout';
if (!process.env.DATABASE_URL?.split('?')[0].endsWith('/pactra_test')) throw Error('Isolated test database required');
let sellerId: string, ownerId: string;
beforeEach(async () => {
  sellerId = 'catalog_' + randomUUID();
  await db.seller.create({ data: { id:sellerId,name:'General product test shop',strategy:'price_first',warrantyMonths:12,standardCents:500,standardDays:3,expressCents:1000,expressDays:1 } });
  ownerId = (await db.browserSession.create({ data:{tokenHash:randomUUID(),expiresAt:new Date(Date.now()+60000)} })).id;
});
afterEach(async () => {
  const rooms=(await db.shoppingSession.findMany({where:{ownerId},select:{id:true}})).map(r=>r.id);
  await db.reservation.deleteMany({where:{checkout:{roomId:{in:rooms}}}});await db.checkout.deleteMany({where:{roomId:{in:rooms}}});await db.offer.deleteMany({where:{sellerId}});await db.roomEvent.deleteMany({where:{roomId:{in:rooms}}});await db.job.deleteMany({where:{roomId:{in:rooms}}});await db.shoppingSession.deleteMany({where:{ownerId}});await db.browserSession.delete({where:{id:ownerId}});
  const productIds=(await db.listing.findMany({where:{sellerId},select:{productId:true}})).map(l=>l.productId);
  await db.sellerPolicyVersion.deleteMany({where:{sellerId}});await db.listing.deleteMany({where:{sellerId}});await db.seller.delete({where:{id:sellerId}});await db.product.deleteMany({where:{id:{in:productIds}}});
});
afterAll(()=>db.$disconnect());
const input=()=>({commandKey:randomUUID(),expectedVersion:1,name:'A hardcover field guide',category:'books',description:'Fictional hardcover field guide, 180 pages, English edition.',listCents:3000,floorCents:2200,onHand:5});
it('adds a product in a new category once, preserving private limits and immutable shop history',async()=>{
 const data=input();const first=await addSellerProduct(sellerId,data,'test-owner');expect(await addSellerProduct(sellerId,data,'test-owner')).toEqual(first);
 const shop=await db.seller.findUniqueOrThrow({where:{id:sellerId},include:{listings:{include:{product:true}},policyVersions:true}});
 expect(shop.policyVersion).toBe(2);expect(shop.listings).toHaveLength(1);expect(shop.listings[0]).toMatchObject({floorCents:2200,product:{role:'books',description:data.description}});expect(shop.policyVersions).toHaveLength(2);
 await expect(addSellerProduct(sellerId,{...data,name:'Different product'},'test-owner')).rejects.toMatchObject({code:'COMMAND_CONFLICT'});
});
it('rejects an invalid minimum and a stale shop without creating stray products',async()=>{
 await expect(addSellerProduct(sellerId,{...input(),floorCents:4000},'test-owner')).rejects.toThrow('minimum price');
 await expect(addSellerProduct(sellerId,{...input(),expectedVersion:2},'test-owner')).rejects.toMatchObject({code:'POLICY_CONFLICT'});
 expect(await db.listing.count({where:{sellerId}})).toBe(0);
});
it('serializes two simultaneous catalog additions against the same saved rules',async()=>{
 const results=await Promise.allSettled([addSellerProduct(sellerId,input(),'test-owner'),addSellerProduct(sellerId,input(),'test-owner')]);
 expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(await db.listing.count({where:{sellerId}})).toBe(1);
});
it('negotiates a non-camera product and reserves its exact quantity through the existing checkout',async()=>{
 await addSellerProduct(sellerId,input(),'test-owner');
 const seller=await db.seller.findUniqueOrThrow({where:{id:sellerId},include:{listings:{include:{product:true}}}});const listing=seller.listings[0];
 const brief={goal:'Negotiate two copies of this field guide, with delivery.',items:[{productId:listing.productId,quantity:2}],capCents:7000,maxDays:5,preference:'price' as const,discloseBudget:false};
 const room=await createNegotiation(ownerId,brief,randomUUID());
 const terms=makeOffer({action:'offer',shipping:'standard',message:'Two copies, with delivery included in the total.',items:[{listingId:listing.id,quantity:2,unitPriceCents:2500}]},seller,seller.listings.map(l=>({...l,available:l.onHand-l.reserved})))!;
 expect(constraints(terms,brief)).toEqual([]);expect(Number.isFinite(utility(terms,brief))).toBe(true);
 expect(constraints({...terms,items:[{...terms.items[0],quantity:1}]},brief)).toContain('The offer must include your selected products and quantities');
 const offer=await db.offer.create({data:{roomId:room.id,sellerId,briefVersion:1,policyVersion:seller.policyVersion,round:1,terms:json(terms),expiresAt:new Date(Date.now()+60000)}});
 const checkout=await acceptOffer(ownerId,offer.id,randomUUID());expect(checkout.totalCents).toBe(5500);expect((await db.listing.findUniqueOrThrow({where:{id:listing.id}})).reserved).toBe(2);
 await cancelCheckout(checkout.id,ownerId);expect((await db.listing.findUniqueOrThrow({where:{id:listing.id}})).reserved).toBe(0);
});
it('refuses an unavailable basket before spending a negotiation slot',async()=>{
 await addSellerProduct(sellerId,input(),'test-owner');const listing=await db.listing.findFirstOrThrow({where:{sellerId}});
 const brief={goal:'Both selected items must come from the same seller.',items:[{productId:listing.productId,quantity:1},{productId:'BAG-01',quantity:1}],capCents:20000,maxDays:5,preference:'quality' as const,discloseBudget:false};
 await expect(createNegotiation(ownerId,brief,randomUUID())).rejects.toMatchObject({code:'PRODUCTS_UNAVAILABLE'});expect(await db.shoppingSession.count({where:{ownerId}})).toBe(0);
});
