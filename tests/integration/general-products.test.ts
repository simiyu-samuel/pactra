import { beforeEach, afterEach, afterAll, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { db, json } from '../../packages/database/src/index';
import { makeOffer, constraints, utility } from '../../packages/domain/src/index';
import { addSellerProduct, updateSellerProduct } from '../../packages/integrations/src/catalog';
import { publishPolicy } from '../../packages/integrations/src/policies';
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
const input=()=>({commandKey:randomUUID(),expectedVersion:1,name:'A hardcover field guide',category:'books',description:'Fictional hardcover field guide, 180 pages, English edition.',listCents:3000,floorCents:2200,onHand:5,status:'active',confirmed:true,images:['https://images.example.test/field-guide.jpg']});
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

async function editInput(listingId:string, change:Record<string,unknown>={}) {
 const l=await db.listing.findUniqueOrThrow({where:{id:listingId},include:{product:true,seller:true}});
 return {...input(),commandKey:randomUUID(),expectedVersion:l.seller.policyVersion,expectedProductVersion:l.product.version,expectedOnHand:l.onHand,expectedReserved:l.reserved,name:l.product.name,brand:l.product.brand,category:l.product.role,description:l.product.description,images:l.product.images,sourceUrl:l.product.sourceUrl,listCents:l.listCents,floorCents:l.floorCents,onHand:l.onHand,status:l.status,...change};
}
it('keeps a new draft out of negotiation and requires a photo and confirmation to publish',async()=>{
 const data={...input(),status:'draft',confirmed:false,images:[],listCents:0,floorCents:0,onHand:0};
 const {listingId}=await addSellerProduct(sellerId,data,'test-owner');const l=await db.listing.findUniqueOrThrow({where:{id:listingId}});
 await expect(createNegotiation(ownerId,{goal:'Buy this exact product.',items:[{productId:l.productId,quantity:1}],capCents:5000,maxDays:5,preference:'price',discloseBudget:false},randomUUID())).rejects.toMatchObject({code:'PRODUCTS_UNAVAILABLE'});
 await expect(updateSellerProduct(sellerId,listingId,await editInput(listingId,{status:'active',listCents:3000,onHand:2}),'test-owner')).rejects.toMatchObject({code:'NOT_READY_TO_PUBLISH'});
 await expect(updateSellerProduct(sellerId,listingId,await editInput(listingId,{status:'active',listCents:3000,onHand:2,images:input().images,confirmed:false}),'test-owner')).rejects.toMatchObject({code:'NOT_READY_TO_PUBLISH'});
 expect(await db.shoppingSession.count({where:{ownerId}})).toBe(0);
});
it('publishes, archives and restores a draft with idempotent edits and shop-specific prices',async()=>{
 const {listingId}=await addSellerProduct(sellerId,{...input(),status:'draft'},'test-owner');
 const data=await editInput(listingId,{status:'active',listCents:3500});const saved=await updateSellerProduct(sellerId,listingId,data,'test-owner');
 expect(await updateSellerProduct(sellerId,listingId,data,'test-owner')).toEqual(saved);
 expect(await db.listing.findUniqueOrThrow({where:{id:listingId}})).toMatchObject({status:'active',listCents:3500});
 await expect(updateSellerProduct(sellerId,listingId,{...data,commandKey:randomUUID()},'test-owner')).rejects.toMatchObject({code:'POLICY_CONFLICT'});
 await updateSellerProduct(sellerId,listingId,await editInput(listingId,{status:'archived'}),'test-owner');
 expect(await db.listing.findUniqueOrThrow({where:{id:listingId}})).toMatchObject({status:'archived'});
 await updateSellerProduct(sellerId,listingId,await editInput(listingId,{status:'draft'}),'test-owner');
});
it('versions shared product facts across shops without changing another shop’s price or stock',async()=>{
 const {listingId}=await addSellerProduct(sellerId,input(),'test-owner');const first=await db.listing.findUniqueOrThrow({where:{id:listingId}});
 const other=await db.seller.create({data:{id:'catalog_'+randomUUID(),name:'Second test shop',strategy:'price_first',warrantyMonths:12,standardCents:500,standardDays:3,expressCents:1000,expressDays:1}});
 try {
  await db.listing.create({data:{id:randomUUID(),sellerId:other.id,productId:first.productId,listCents:4000,floorCents:3000,onHand:9}});
  const prior=await db.sellerPolicyVersion.findUniqueOrThrow({where:{sellerId_version:{sellerId,version:2}}});
  await updateSellerProduct(sellerId,listingId,await editInput(listingId,{name:'Updated exact product name',listCents:3200}),'test-owner');
  expect(await db.product.findUniqueOrThrow({where:{id:first.productId}})).toMatchObject({version:2,name:'Updated exact product name'});
  expect(await db.seller.findUniqueOrThrow({where:{id:other.id}})).toMatchObject({policyVersion:2});
  expect(await db.listing.findFirstOrThrow({where:{sellerId:other.id}})).toMatchObject({listCents:4000,onHand:9});
  expect((await db.sellerPolicyVersion.findUniqueOrThrow({where:{id:prior.id}})).snapshot).toEqual(prior.snapshot);
  await expect(createNegotiation(ownerId,{goal:'Buy this exact product.',items:[{productId:first.productId,productVersion:1,quantity:1}],capCents:5000,maxDays:5,preference:'price',discloseBudget:false},randomUUID())).rejects.toMatchObject({code:'PRODUCT_CHANGED'});
 } finally {await db.sellerPolicyVersion.deleteMany({where:{sellerId:other.id}});await db.listing.deleteMany({where:{sellerId:other.id}});await db.seller.delete({where:{id:other.id}});}
});
it('serializes concurrent edits and rejects stale stock and reductions below held units',async()=>{
 const {listingId}=await addSellerProduct(sellerId,input(),'test-owner');const data=await editInput(listingId);
 const results=await Promise.allSettled([updateSellerProduct(sellerId,listingId,data,'test-owner'),updateSellerProduct(sellerId,listingId,{...data,commandKey:randomUUID(),listCents:3100},'test-owner')]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
 const stale=await editInput(listingId);await db.listing.update({where:{id:listingId},data:{reserved:2}});
 await expect(updateSellerProduct(sellerId,listingId,stale,'test-owner')).rejects.toMatchObject({code:'INVENTORY_CHANGED'});
 await expect(updateSellerProduct(sellerId,listingId,await editInput(listingId,{onHand:1}),'test-owner')).rejects.toMatchObject({code:'RESERVED_STOCK'});
});
it('rejects unsafe photo and source URL schemes without creating a product',async()=>{
 for(const change of [{images:['javascript:alert(1)']},{images:['http://example.com/photo.jpg']},{sourceUrl:'https://user:pass@example.com/product'}])await expect(addSellerProduct(sellerId,{...input(),...change},'test-owner')).rejects.toThrow();
 expect(await db.listing.count({where:{sellerId}})).toBe(0);
});

it('saves agent rules when every old listing is archived',async()=>{
 const {listingId}=await addSellerProduct(sellerId,input(),'test-owner');await updateSellerProduct(sellerId,listingId,await editInput(listingId,{status:'archived'}),'test-owner');const shop=await db.seller.findUniqueOrThrow({where:{id:sellerId}});
 const result=await publishPolicy(sellerId,{commandKey:randomUUID(),expectedVersion:shop.policyVersion,note:'Updated delivery promises',strategy:shop.strategy,privateInstructions:'',warrantyMonths:12,standardCents:600,standardDays:4,expressCents:1100,expressDays:2,listings:[]},'test-owner');expect(result.version).toBe(shop.policyVersion+1);expect(await db.listing.findUniqueOrThrow({where:{id:listingId}})).toMatchObject({status:'archived',onHand:5});
});
