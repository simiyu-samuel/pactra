import {z} from 'zod';
import {createHash} from 'node:crypto';
import {db,json} from '@pactra/database';
import {sellerSnapshot} from './policies';
const id=z.string().min(1).max(80);
const cents=z.number().int().min(0).max(1_000_000);
const url=z.string().url().max(2000).refine(value=>{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password;});
const seller=z.object({id,name:z.string().min(1).max(100),strategy:z.enum(['price_first','bundle_first','speed_first']),privateInstructions:z.string().max(1000),warrantyMonths:z.number().int().min(0).max(60),standardCents:cents,standardDays:z.number().int().min(1).max(30),expressCents:cents,expressDays:z.number().int().min(1).max(30)}).strict().refine(s=>s.expressDays<=s.standardDays);
const product=z.object({id,name:z.string().min(2).max(100),role:z.string().min(2).max(40),score:z.number().int(),description:z.string().min(10).max(1000),brand:z.string().max(50),images:z.array(url).max(4),sourceUrl:url.nullable(),video:z.string(),audio:z.string(),mount:z.string()}).strict();
const listing=z.object({id,sellerId:id,productId:id,listCents:cents,floorCents:cents,onHand:z.number().int().min(0).max(10000),status:z.enum(['active','draft','archived'])}).strict().refine(l=>l.floorCents<=l.listCents&& (l.status!=='active'||l.listCents>=100));
export const catalogTransferSchema=z.object({format:z.literal('pactra-seller-catalog-v1'),exportedAt:z.iso.datetime(),sellers:z.array(seller).min(1).max(50),products:z.array(product).max(2500),listings:z.array(listing).max(2500)}).strict().superRefine((data,ctx)=>{
 for(const key of ['sellers','products','listings'] as const)if(new Set(data[key].map(x=>x.id)).size!==data[key].length)ctx.addIssue({code:'custom',message:'Duplicate catalog identity.'});
 const sellers=new Set(data.sellers.map(x=>x.id)),products=new Map(data.products.map(x=>[x.id,x]));
 const pairs=new Set<string>();
 for(const l of data.listings){const pair=l.sellerId+'\0'+l.productId;if(!sellers.has(l.sellerId)||!products.has(l.productId)||pairs.has(pair)||l.status==='active'&&!products.get(l.productId)?.images.length)ctx.addIssue({code:'custom',message:'Invalid listing reference or published photo.'});pairs.add(pair);}
});
export async function exportSellerCatalog(){
 return db.$transaction(async tx=>{
  const sellers=await tx.seller.findMany({orderBy:{id:'asc'},select:{id:true,name:true,strategy:true,privateInstructions:true,warrantyMonths:true,standardCents:true,standardDays:true,expressCents:true,expressDays:true}});
  const listings=await tx.listing.findMany({where:{product:{isDemo:false}},orderBy:{id:'asc'},include:{product:true}});
  if(listings.some(l=>l.reserved>0))throw new Error('Wait for active stock reservations to finish before taking the staging catalog snapshot.');
  const products=[...new Map(listings.map(l=>{const {isDemo,version,...product}=l.product;return[product.id,product] as const;})).values()];
  return catalogTransferSchema.parse({format:'pactra-seller-catalog-v1',exportedAt:new Date().toISOString(),sellers,products,listings:listings.map(({reserved,product,...listing})=>listing)});
 },{isolationLevel:'Serializable'});
}
/** Fresh databases only: never overwrite an existing shop, stock or agreement. */
export async function importSellerCatalog(raw:unknown){
 const data=catalogTransferSchema.parse(raw);
 const digest=createHash('sha256').update(JSON.stringify(data)).digest('hex');
 const summary={sellers:data.sellers.length,products:data.products.length,listings:data.listings.length,published:data.listings.filter(l=>l.status==='active').length};
 return db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(71934029)`;
  const receipts=await tx.sellerPolicyVersion.count({where:{sellerId:{in:data.sellers.map(s=>s.id)},version:1,source:'catalog_transfer',requestHash:digest}});
  if(receipts===data.sellers.length)return{...summary,imported:false};
  if(await tx.seller.count()||await tx.product.count()||await tx.listing.count()||await tx.shoppingSession.count()||await tx.checkout.count())throw new Error('Catalog import requires an empty, migrated staging database. Existing data was not changed.');
  for(const s of data.sellers)await tx.seller.create({data:{...s,policyVersion:1}});
  for(const p of data.products)await tx.product.create({data:{...p,isDemo:false,version:1}});
  for(const l of data.listings)await tx.listing.create({data:{...l,reserved:0}});
  for(const s of data.sellers)await tx.sellerPolicyVersion.create({data:{sellerId:s.id,version:1,source:'catalog_transfer',requestHash:digest,snapshot:json(await sellerSnapshot(tx,s.id)),note:'Imported owner-approved staging catalog'}});
  return{...summary,imported:true};
 },{timeout:15000});
}
