import {readFile} from 'node:fs/promises';
import {db,json,lockSeller} from '../packages/database/src/index';
import {ensurePolicyVersion,sellerSnapshot} from '../packages/integrations/src/policies';
const rows=JSON.parse(await readFile(new URL('../assets/catalog/review-products.json',import.meta.url),'utf8')) as Array<{id:string;name:string;brand:string;category:string;description:string;images:string[];sourceUrl:string}>;
const shopIds=['pixel_port','studio_stack','swift_gear'];
try{
 for(const p of rows)await db.product.upsert({where:{id:p.id},update:{},create:{id:p.id,name:p.name,brand:p.brand,role:p.category,description:p.description,images:p.images,sourceUrl:p.sourceUrl,isDemo:false,score:50,video:'not_applicable',audio:'not_applicable',mount:'not_applicable'}});
 for(const sellerId of shopIds)await db.$transaction(async tx=>{
  await lockSeller(tx,sellerId);const shop=await tx.seller.findUniqueOrThrow({where:{id:sellerId}});await ensurePolicyVersion(tx,sellerId);
  const retired=await tx.listing.updateMany({where:{sellerId,product:{isDemo:true},status:{not:'archived'}},data:{status:'archived'}});let added=0;
  for(const p of rows){const id=sellerId+'-'+p.id;if(await tx.listing.findUnique({where:{id}}))continue;await tx.listing.create({data:{id,sellerId,productId:p.id,listCents:0,floorCents:0,onHand:0,status:'draft'}});added++;}
  if(added||retired.count){const version=shop.policyVersion+1;await tx.seller.update({where:{id:sellerId},data:{policyVersion:version}});await tx.sellerPolicyVersion.create({data:{sellerId,version,snapshot:json(await sellerSnapshot(tx,sellerId)),source:'catalog_review',note:'Prepared real product drafts and archived earlier sample listings'}});}
 });
 console.log(`Prepared ${rows.length} sourced product drafts per shop. No prices, stock or publication were assumed. Existing edits and accepted order history were preserved.`);
}finally{await db.$disconnect();}
