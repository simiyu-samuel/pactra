import { randomUUID, createHash } from 'node:crypto';
import { z } from 'zod';
import { db, json, lockSeller } from '@pactra/database';
import { RuleError } from '@pactra/domain';
import { ensurePolicyVersion, sellerSnapshot } from './policies';
const publicUrl = z.string().url().max(2000).refine(value => { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; }, 'Use a public HTTPS link without sign-in details.');
const productInput = z.object({
  commandKey: z.uuid(), expectedVersion: z.number().int().positive(),
  name: z.string().trim().min(2).max(100), brand: z.string().trim().max(50).default(''),
  category: z.string().trim().min(2).max(40).regex(/^[a-z][a-z0-9_ -]*$/),
  description: z.string().trim().min(10).max(1000), images: z.array(publicUrl).max(4).default([]), sourceUrl: publicUrl.nullable().default(null),
  listCents: z.number().int().min(0).max(1000000), floorCents: z.number().int().min(0).max(1000000), onHand: z.number().int().min(0).max(10000),
  status: z.enum(['draft','active','archived']).default('draft'), confirmed: z.boolean().default(false),
});
const updateInput = productInput.extend({ expectedOnHand: z.number().int().min(0), expectedReserved: z.number().int().min(0), expectedProductVersion: z.number().int().positive() });
type Input = z.infer<typeof productInput>;
function validate(input: Input) {
  if (input.floorCents > input.listCents) throw new RuleError('INVALID_PRICE', 'Your minimum price cannot exceed the asking price.', 400);
  if (input.status === 'active' && (!input.confirmed || input.listCents < 100 || !input.images.length)) throw new RuleError('NOT_READY_TO_PUBLISH', 'Add a product photo and asking price, then confirm your price and stock before publishing.', 400);
}
const details = (i: Input) => ({name:i.name,brand:i.brand,role:i.category,description:i.description,images:i.images,sourceUrl:i.sourceUrl});
const hash = (kind: string, value: unknown) => createHash('sha256').update(kind + JSON.stringify(value)).digest('hex');
export async function addSellerProduct(sellerId: string, raw: unknown, ownerSessionId: string) {
  const input = productInput.parse(raw); validate(input); const requestHash = hash('add-product:',input);
  return db.$transaction(async tx => {
    await lockSeller(tx,sellerId);
    const previous = await tx.sellerPolicyVersion.findUnique({where:{commandKey:input.commandKey}});
    if(previous){if(previous.sellerId!==sellerId||previous.requestHash!==requestHash)throw new RuleError('COMMAND_CONFLICT','This saved request belongs to a different product.');return{version:previous.version,listingId:input.commandKey};}
    const seller=await tx.seller.findUnique({where:{id:sellerId}});if(!seller)throw new RuleError('NOT_FOUND','Seller not found.',404);
    if(seller.policyVersion!==input.expectedVersion)throw new RuleError('POLICY_CONFLICT','Your shop changed. Refresh it before saving this product.');
    if(await tx.listing.count({where:{sellerId,status:{not:'archived'}}})>=50)throw new RuleError('CATALOG_LIMIT','Each shop supports up to 50 current products. Archive an older listing first.');
    await ensurePolicyVersion(tx,sellerId);
    const product=await tx.product.create({data:{id:randomUUID(),...details(input),isDemo:false,score:50,video:'not_applicable',audio:'not_applicable',mount:'not_applicable'}});
    const listing=await tx.listing.create({data:{id:input.commandKey,sellerId,productId:product.id,listCents:input.listCents,floorCents:input.floorCents,onHand:input.onHand,status:input.status}});
    const version=seller.policyVersion+1;await tx.seller.update({where:{id:sellerId},data:{policyVersion:version}});
    await tx.sellerPolicyVersion.create({data:{sellerId,version,snapshot:json(await sellerSnapshot(tx,sellerId)),commandKey:input.commandKey,requestHash,source:'owner_publish',publishedBy:ownerSessionId,note:'Added product: '+input.name}});
    return{version,listingId:listing.id};
  });
}
export async function updateSellerProduct(sellerId: string, listingId: string, raw: unknown, ownerSessionId: string) {
  const input=updateInput.parse(raw);validate(input);const requestHash=hash('update-product:'+listingId+':',input);
  return db.$transaction(async tx=>{
    const first=await tx.listing.findFirst({where:{id:listingId,sellerId}});if(!first)throw new RuleError('NOT_FOUND','Product not found in this shop.',404);
    // Shared product facts are locked before shops, and shops in a stable order.
    await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${first.productId} FOR UPDATE`;
    const product=await tx.product.findUniqueOrThrow({where:{id:first.productId}});
    const siblings=await tx.listing.findMany({where:{productId:product.id},select:{sellerId:true}});const ids=[...new Set(siblings.map(l=>l.sellerId))].sort();
    for(const id of ids)await lockSeller(tx,id);
    const previous=await tx.sellerPolicyVersion.findUnique({where:{commandKey:input.commandKey}});if(previous){if(previous.sellerId!==sellerId||previous.requestHash!==requestHash)throw new RuleError('COMMAND_CONFLICT','This saved request belongs to a different edit.');return{version:previous.version,listingId};}
    const seller=await tx.seller.findUniqueOrThrow({where:{id:sellerId}});
    if(seller.policyVersion!==input.expectedVersion||product.version!==input.expectedProductVersion)throw new RuleError('POLICY_CONFLICT','This product changed while you were editing. Refresh your shop and try again.');
    if(product.isDemo)throw new RuleError('RETIRED_SAMPLE','This retired sample stays archived. Add a real product instead.');
    await tx.$queryRaw`SELECT id FROM "Listing" WHERE id = ${listingId} FOR UPDATE`;
    const listing=await tx.listing.findUniqueOrThrow({where:{id:listingId}});
    if(listing.onHand!==input.expectedOnHand||listing.reserved!==input.expectedReserved)throw new RuleError('INVENTORY_CHANGED','Stock changed while you were editing. Refresh your shop before saving.');
    if(listing.status==='archived'&&input.status!=='archived'&&await tx.listing.count({where:{sellerId,status:{not:'archived'}}})>=50)throw new RuleError('CATALOG_LIMIT','Each shop supports up to 50 current products. Archive an older listing first.');
    if(input.onHand<listing.reserved)throw new RuleError('RESERVED_STOCK','Stock cannot be lower than the quantity already held for buyers.');
    const nextDetails=details(input);const changed=JSON.stringify(nextDetails)!==JSON.stringify(details({...input,name:product.name,brand:product.brand,category:product.role,description:product.description,images:product.images,sourceUrl:product.sourceUrl}));
    const affected=changed?ids:[sellerId];for(const id of affected)await ensurePolicyVersion(tx,id);
    if(changed)await tx.product.update({where:{id:product.id},data:{...nextDetails,version:{increment:1}}});
    await tx.listing.update({where:{id:listingId},data:{listCents:input.listCents,floorCents:input.floorCents,onHand:input.onHand,status:input.status}});
    let result=0;for(const id of affected){const next=await tx.seller.update({where:{id},data:{policyVersion:{increment:1}}});if(id===sellerId)result=next.policyVersion;await tx.sellerPolicyVersion.create({data:{sellerId:id,version:next.policyVersion,snapshot:json(await sellerSnapshot(tx,id)),source:'owner_publish',publishedBy:ownerSessionId,note:(changed?'Updated product: ':'Updated listing: ')+input.name,...(id===sellerId?{commandKey:input.commandKey,requestHash}:{})}});}
    return{version:result,listingId};
  },{timeout:15000});
}
