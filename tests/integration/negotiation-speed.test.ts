import {randomUUID} from 'node:crypto';
import {afterAll, afterEach, beforeEach, expect, it, vi} from 'vitest';
import {db} from '../../packages/database/src/index';
import {createNegotiation} from '../../packages/integrations/src/negotiations';
import {claim, step, commitStep} from '../../apps/worker/src/negotiation';
import {decide} from '../../packages/integrations/src/groq';
vi.mock('../../packages/integrations/src/groq', async original => ({...await original<object>(), decide:vi.fn()}));
if (!process.env.DATABASE_URL?.split('?')[0].endsWith('/pactra_test')) throw new Error('Speed tests require pactra_test.');
let sellerId:string, productId:string, ownerId:string, roomId:string;
beforeEach(async()=>{
 await db.job.updateMany({where:{state:{in:['ready','running']}},data:{state:'cancelled',leaseUntil:null}});
 sellerId=`speed_${randomUUID()}`;productId=`speed_product_${randomUUID()}`;
 await db.seller.create({data:{id:sellerId,name:'Speed fixture',strategy:'price_first',standardCents:500,standardDays:3,expressCents:900,expressDays:1,warrantyMonths:12}});
 await db.product.create({data:{id:productId,name:'Test headphones',role:'audio',score:0,video:'',audio:'',mount:'',images:['https://example.com/long-photo-must-not-enter-model.jpg']}});
 await db.listing.create({data:{id:sellerId+'_listing',sellerId,productId,listCents:5000,floorCents:3500,onHand:5}});
 const owner=await db.browserSession.create({data:{tokenHash:randomUUID(),expiresAt:new Date(Date.now()+600000)}});ownerId=owner.id;
 const room=await createNegotiation(ownerId,{goal:'Headphones within my budget.',capCents:6000,maxDays:4,preference:'price',discloseBudget:false,items:[{productId,quantity:1}]},randomUUID());roomId=room.id;
});
afterEach(async()=>{
 vi.mocked(decide).mockReset();
 await db.offer.deleteMany({where:{roomId}});await db.roomEvent.deleteMany({where:{roomId}});await db.job.deleteMany({where:{roomId}});await db.buyerBriefVersion.deleteMany({where:{roomId}});await db.shoppingSession.delete({where:{id:roomId}});await db.browserSession.delete({where:{id:ownerId}});await db.listing.deleteMany({where:{sellerId}});await db.seller.delete({where:{id:sellerId}});await db.product.delete({where:{id:productId}});
});
afterAll(()=>db.$disconnect());
it('finishes a single eligible seller in three AI calls, preserves the plan and omits image context',async()=>{
 vi.mocked(decide).mockImplementation(async <T>(_system:string,context:unknown):Promise<T> => { const value=context as any; return (value.offers?{counters:[{sellerId,targetCents:4300,message:'Can you improve the total?'}]}:{action:'offer',items:[{listingId:sellerId+'_listing',quantity:1,unitPriceCents:value.round===1?4800:4000}],shipping:'standard',message:'Proposed terms.'}) as T; });
 for(let n=0;n<4;n++){const job=await claim();expect(job?.roomId).toBe(roomId);await step(job!);}
 expect(await db.job.findFirst({where:{roomId}})).toMatchObject({state:'done',step:3,calls:3,checkpoint:{plan:{sellerIds:[sellerId],rounds:2}}});
 expect(await db.shoppingSession.findUnique({where:{id:roomId}})).toMatchObject({state:'completed'});
 expect(vi.mocked(decide)).toHaveBeenCalledTimes(3);
 expect(JSON.stringify(vi.mocked(decide).mock.calls)).not.toContain('long-photo-must-not-enter-model');
 const events=await db.roomEvent.findMany({where:{roomId},orderBy:{sequence:'asc'}});expect(events.map(e=>e.type)).toEqual(['brief.confirmed','offer.published','buyer.countered','offer.published','run.completed']);
 expect(events.filter(e=>e.type==='offer.published').map(e=>(e.data as any).totalCents)).toEqual([5300,4500]);
});
it('does not block an eligible room behind an older quota-paused room',async()=>{
 const old=await db.job.findFirstOrThrow({where:{roomId}});await db.job.update({where:{id:old.id},data:{runAt:new Date(Date.now()+60000)}});
 const other=await db.job.create({data:{key:randomUUID(),roomId,briefVersion:1,runAt:new Date(Date.now()-1000)}});
 expect((await claim())?.id).toBe(other.id);
});
it('rejects a stale worker commit after another lease has reclaimed the step',async()=>{
 const job=(await claim())!;await db.job.update({where:{id:job.id},data:{leaseUntil:new Date(Date.now()+90000)}});
 let applied=false;await commitStep(job,async()=>{applied=true;});expect(applied).toBe(false);expect((await db.job.findUniqueOrThrow({where:{id:job.id}})).step).toBe(0);
});
it('withdraws an unavailable seller without spending AI quota',async()=>{
 await db.listing.update({where:{id:sellerId+'_listing'},data:{onHand:0}});
 await step((await claim())!);await step((await claim())!);
 expect(decide).not.toHaveBeenCalled();expect(await db.shoppingSession.findUnique({where:{id:roomId}})).toMatchObject({state:'no_deal'});
});
