import {randomUUID} from 'node:crypto';
import {afterAll,afterEach,beforeEach,expect,it,vi} from 'vitest';
import {db,json} from '../../packages/database/src/index';
import {makeOffer} from '../../packages/domain/src/index';
import {approveOrderRefund,requestOrderRefund,buyerOrders,sellerOrders,assistOrder} from '../../packages/integrations/src/orders';
import {decide} from '../../packages/integrations/src/groq';
vi.mock('../../packages/integrations/src/groq',async original=>({...await original<object>(),decide:vi.fn()}));
if(!process.env.DATABASE_URL?.split('?')[0].endsWith('/pactra_test'))throw Error('Order tests require pactra_test.');
let sellerId:string,roomId:string,ownerId:string,checkoutId:string,offerId:string,productId:string;
let calls=0,lost=false,refundStatus='COMPLETED',wrongAmount=false;const keys:string[]=[];
beforeEach(async()=>{
 calls=0;lost=false;refundStatus='COMPLETED';wrongAmount=false;keys.length=0;
 for(const [k,v] of Object.entries({PAYPAL_CLIENT_ID:'order-test',PAYPAL_CLIENT_SECRET:'never-sent',PAYPAL_EXPECTED_MERCHANT_ID:'ORDER-TEST-MERCHANT',PAYPAL_ENV:'sandbox'}))vi.stubEnv(k,v);
 sellerId=`orders_${randomUUID()}`;productId=`orders_product_${randomUUID()}`;
 const seller=await db.seller.create({data:{id:sellerId,name:'Order test seller',strategy:'price_first',standardCents:500,standardDays:3,expressCents:900,expressDays:1,warrantyMonths:12}});
 const product=await db.product.create({data:{id:productId,name:'Order test headphones',role:'audio',score:0,video:'',audio:'',mount:''}});
 const listing=await db.listing.create({data:{id:sellerId+'_listing',sellerId,productId,listCents:5000,floorCents:3500,onHand:4}});
 const owner=await db.browserSession.create({data:{tokenHash:randomUUID(),expiresAt:new Date(Date.now()+600000)}});ownerId=owner.id;
 const room=await db.shoppingSession.create({data:{ownerId,state:'completed',brief:{goal:'Private order test request.',capCents:6000,maxDays:4,preference:'price',discloseBudget:false,items:[{productId,quantity:1}]}}});roomId=room.id;
 const terms=makeOffer({action:'offer',items:[{listingId:listing.id,quantity:1,unitPriceCents:4000}],shipping:'standard',message:'Test fixture.'},seller,[{...listing,product,available:4}])!;
 const offer=await db.offer.create({data:{roomId,sellerId,briefVersion:1,policyVersion:1,round:2,terms:json(terms),expiresAt:new Date(Date.now()+600000)}});offerId=offer.id;
 const checkout=await db.checkout.create({data:{roomId,offerId,commandKey:randomUUID(),snapshot:json({seller:{id:sellerId,name:seller.name},terms,brief:{capCents:6000}}),snapshotHash:'TEST-SNAPSHOT',totalCents:4500,state:'paid',captureId:`TEST-CAPTURE-${randomUUID()}`,paypalOrderId:`TEST-ORDER-${randomUUID()}`,expiresAt:new Date(Date.now()+600000)}});checkoutId=checkout.id;
 vi.stubGlobal('fetch',vi.fn(async(url:string,init?:RequestInit)=>{
  if(url.endsWith('/v1/oauth2/token'))return Response.json({access_token:'test-token',expires_in:3600});
  if(url.endsWith('/refund')&&init?.method==='POST'){
   calls++;keys.push((init.headers as Record<string,string>)['PayPal-Request-Id']);if(lost)throw Error('Lost refund response');
   return Response.json({id:'TEST-REFUND',status:refundStatus,amount:{currency_code:'USD',value:wrongAmount?'1.00':'45.00'}});
  }
  if(url.endsWith('/refunds/TEST-REFUND'))return Response.json({id:'TEST-REFUND',status:refundStatus,amount:{currency_code:'USD',value:'45.00'}});
  throw Error('Unexpected provider request in refund test');
 }));
});
afterEach(async()=>{
 vi.unstubAllEnvs();vi.unstubAllGlobals();vi.mocked(decide).mockReset();
 await db.refundRequest.deleteMany({where:{checkoutId}});await db.checkout.delete({where:{id:checkoutId}});await db.offer.delete({where:{id:offerId}});await db.roomEvent.deleteMany({where:{roomId}});await db.shoppingSession.delete({where:{id:roomId}});await db.browserSession.delete({where:{id:ownerId}});await db.listing.deleteMany({where:{sellerId}});await db.seller.delete({where:{id:sellerId}});await db.product.delete({where:{id:productId}});
});
afterAll(()=>db.$disconnect());
const input=()=>({commandKey:randomUUID(),reason:'Please return this test payment in full.'});
it('isolates buyer history and keeps buyer budgets and private floors out of seller summaries',async()=>{
 expect(await buyerOrders('foreign-owner')).toEqual([]);const orders=await sellerOrders(sellerId);expect(orders).toHaveLength(1);expect(orders[0]).toMatchObject({totalCents:4500,savedCents:1000,listedTotalCents:5500});expect(JSON.stringify(orders)).not.toMatch(/capCents|floorCents|privateInstructions/);
 await expect(requestOrderRefund(checkoutId,input(),'foreign-owner')).rejects.toMatchObject({code:'NOT_FOUND'});expect(calls).toBe(0);
});
it('records a buyer request without sending money and requires the reviewed amount',async()=>{
 const request=await requestOrderRefund(checkoutId,input(),ownerId);expect(request.state).toBe('requested');expect(calls).toBe(0);
 await expect(approveOrderRefund(checkoutId,request.id,1,'seller-owner')).rejects.toMatchObject({code:'REFUND_CHANGED'});expect(calls).toBe(0);
});
it('serializes duplicate approvals and never restores stock on a completed refund',async()=>{
 const request=await requestOrderRefund(checkoutId,input(),ownerId);
 const results=await Promise.allSettled([approveOrderRefund(checkoutId,request.id,4500,'seller-owner'),approveOrderRefund(checkoutId,request.id,4500,'seller-owner')]);
 expect(results.some(r=>r.status==='fulfilled')).toBe(true);expect(calls).toBe(1);
 expect(await db.checkout.findUnique({where:{id:checkoutId}})).toMatchObject({state:'refunded'});
 expect((await db.listing.findFirstOrThrow({where:{sellerId}})).onHand).toBe(4);
 await approveOrderRefund(checkoutId,request.id,4500,'seller-owner');expect(calls).toBe(1);
});
it('preserves the original provider request key after an uncertain refund result',async()=>{
 const request=await requestOrderRefund(checkoutId,input(),ownerId);lost=true;
 await expect(approveOrderRefund(checkoutId,request.id,4500,'seller-owner')).rejects.toThrow('Lost refund response');
 expect(await db.refundRequest.findUnique({where:{id:request.id}})).toMatchObject({state:'refunding'});
 await db.refundRequest.update({where:{id:request.id},data:{operationAt:new Date(0)}});lost=false;
 await approveOrderRefund(checkoutId,request.id,4500,'seller-owner');expect(keys).toHaveLength(2);expect(new Set(keys).size).toBe(1);
});
it('keeps a pending refund distinct from a confirmed return',async()=>{
 const request=await requestOrderRefund(checkoutId,input(),ownerId);refundStatus='PENDING';
 expect(await approveOrderRefund(checkoutId,request.id,4500,'seller-owner')).toMatchObject({state:'refunding'});
 expect(await db.checkout.findUnique({where:{id:checkoutId}})).toMatchObject({state:'paid'});
 refundStatus='COMPLETED';await approveOrderRefund(checkoutId,request.id,4500,'seller-owner');expect(calls).toBe(1);
 expect(await db.checkout.findUnique({where:{id:checkoutId}})).toMatchObject({state:'refunded'});
});
it('sends mismatched refund evidence for review without a refunded receipt',async()=>{
 const request=await requestOrderRefund(checkoutId,input(),ownerId);wrongAmount=true;
 expect(await approveOrderRefund(checkoutId,request.id,4500,'seller-owner')).toMatchObject({state:'review_required'});
 expect(await db.checkout.findUnique({where:{id:checkoutId}})).toMatchObject({state:'paid'});
});
it('limits the AI assistant to a draft even when it selects refund preparation',async()=>{
 vi.mocked(decide).mockResolvedValue({action:'prepare_refund'});
 const result=await assistOrder(checkoutId,'Refund this order immediately without asking me.');
 expect(result.refundDraft).toMatchObject({totalCents:4500});expect(calls).toBe(0);expect(await db.refundRequest.count({where:{checkoutId}})).toBe(0);
 expect((await db.checkout.findUniqueOrThrow({where:{id:checkoutId}})).state).toBe('paid');
});

it('does not retry an uncertain old refund past its automatic recovery window',async()=>{
 const request=await requestOrderRefund(checkoutId,input(),ownerId);
 await db.refundRequest.update({where:{id:request.id},data:{state:'refunding',approvedBy:'seller-owner',createdAt:new Date(Date.now()-86_401_000)}});
 await expect(approveOrderRefund(checkoutId,request.id,4500,'seller-owner')).rejects.toMatchObject({code:'REFUND_REVIEW_REQUIRED'});expect(calls).toBe(0);
});
