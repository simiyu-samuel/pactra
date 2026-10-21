import {it,expect,afterAll} from 'vitest';
import {randomUUID} from 'node:crypto';
import {db} from '../../packages/database/src/index';
import {catalogTransferSchema,exportSellerCatalog,importSellerCatalog} from '../../packages/integrations/src/catalog-transfer';
if(!process.env.DATABASE_URL?.split('?')[0].endsWith('/pactra_test'))throw Error('Isolated test database required');
afterAll(()=>db.$disconnect());
const snapshot=()=>({format:'pactra-seller-catalog-v1',exportedAt:new Date().toISOString(),sellers:[{id:'transfer-shop',name:'Transfer test shop',strategy:'price_first',privateInstructions:'Protect minimums.',warrantyMonths:12,standardCents:500,standardDays:3,expressCents:1000,expressDays:1}],products:[{id:'transfer-product',name:'A field guide',role:'books',score:50,description:'An illustrated field guide for test use.',brand:'Test brand',images:['https://example.test/guide.jpg'],sourceUrl:null,video:'not_applicable',audio:'not_applicable',mount:'not_applicable'}],listings:[{id:'transfer-listing',sellerId:'transfer-shop',productId:'transfer-product',listCents:3000,floorCents:2500,onHand:3,status:'active'}]});
it('rejects unexpected session data, invalid references and missing published photos',()=>{
 const source=snapshot();expect(catalogTransferSchema.safeParse({...source,sessions:[]}).success).toBe(false);
 expect(catalogTransferSchema.safeParse({...source,listings:[{...source.listings[0],sellerId:'foreign'}]}).success).toBe(false);
 expect(catalogTransferSchema.safeParse({...source,products:[{...source.products[0],images:[]}]}).success).toBe(false);
 expect(catalogTransferSchema.safeParse({...source,listings:[{...source.listings[0],floorCents:4000}]}).success).toBe(false);
});
it('refuses to overwrite a nonempty target and leaves its stock untouched',async()=>{
 const before=await db.listing.findMany({orderBy:{id:'asc'}});
 await expect(importSellerCatalog(snapshot())).rejects.toThrow('empty');
 expect(await db.listing.findMany({orderBy:{id:'asc'}})).toEqual(before);
 expect(await db.seller.findUnique({where:{id:'transfer-shop'}})).toBeNull();
});
it('exports only current catalog facts and blocks a snapshot with held stock',async()=>{
 const sellerId='transfer_'+randomUUID(),productId=randomUUID(),listingId=randomUUID();
 try{
  await db.seller.create({data:{...snapshot().sellers[0],id:sellerId}});
  await db.product.create({data:{...snapshot().products[0],id:productId,isDemo:false}});
  await db.listing.create({data:{...snapshot().listings[0],id:listingId,sellerId,productId}});
  const result=await exportSellerCatalog();
  expect(result.listings.find(l=>l.id===listingId)).toMatchObject({onHand:3,floorCents:2500,status:'active'});
  expect(Object.keys(result).sort()).toEqual(['exportedAt','format','listings','products','sellers']);
  expect(result.products.find(p=>p.id===productId)).not.toHaveProperty('isDemo');
  expect(result.listings.find(l=>l.id===listingId)).not.toHaveProperty('reserved');
  await db.listing.update({where:{id:listingId},data:{reserved:1}});
  await expect(exportSellerCatalog()).rejects.toThrow('reservations');
 }finally{await db.listing.deleteMany({where:{id:listingId}});await db.product.deleteMany({where:{id:productId}});await db.seller.deleteMany({where:{id:sellerId}});}
});
