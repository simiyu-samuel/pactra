import { db, event } from '@pactra/database';
import { QuotaWait, reconcileCheckout, ensureOrder, expireCheckout, processPaymentEvent, recoverOrderRefund } from '@pactra/integrations';
import { claim, step, commitStep } from './negotiation';
let stopping = false;
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => { stopping = true; });

async function maintenance() {
  await processPaymentEvent();
  await recoverOrderRefund();
  const old = await db.checkout.findFirst({ where: { state: { in: ['creating_order', 'capturing', 'pending', 'reconciling'] }, updatedAt: { lt: new Date(Date.now() - 45_000) } }, orderBy: { updatedAt: 'asc' } });
  if (old) {
    try { if (!old.paypalOrderId) await ensureOrder(old.id); else await reconcileCheckout(old.id); }
    catch { await db.checkout.update({ where: { id: old.id }, data: { updatedAt: new Date() } }); console.warn('Payment reconciliation requires retry', old.id); }
  }
  const expired = await db.checkout.findFirst({ where: { state: { in: ['reserved', 'awaiting_approval'] }, expiresAt: { lt: new Date() }, updatedAt: { lt: new Date(Date.now() - 45_000) } } });
  if (expired) {
    try { await expireCheckout(expired.id); }
    catch { await db.checkout.update({ where: { id: expired.id }, data: { updatedAt: new Date() } }); console.warn('Expired approval requires provider retry', expired.id); }
  }
}

let maintenanceTask: Promise<void> | undefined;
let lastMaintenance = 0;
console.log('Pactra worker ready. Short negotiations and sandbox payment recovery enabled.');
while (!stopping) {
  try {
    if (!maintenanceTask && Date.now() - lastMaintenance > 5000) {
      lastMaintenance = Date.now();
      maintenanceTask = maintenance().catch(() => console.warn('Payment maintenance will retry.')).finally(() => { maintenanceTask = undefined; });
    }
    const job = await claim();
    if (job) {
      try { await step(job); }
      catch (error) {
        if (error instanceof QuotaWait) {
          await db.job.updateMany({ where: { id: job.id, state: 'running' }, data: { state: 'ready', leaseUntil: null, runAt: new Date(Date.now() + error.retryMs) } });
        } else {
          await commitStep(job, async tx => { await event(tx, job.roomId, 'seller.unavailable', { message: 'One seller could not update their offer. You can still compare any available offers.', step: job.step }); });
          console.warn('Negotiation step unavailable', job.id, job.step);
        }
      }
    } else await new Promise(resolve => setTimeout(resolve, 250));
  } catch { console.error('Worker waiting for database availability.'); await new Promise(resolve => setTimeout(resolve, 1200)); }
}
await maintenanceTask;
await db.$disconnect();
