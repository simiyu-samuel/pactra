import { db } from '../packages/database/src/index';
try {
  const [checkouts, inbox, attention] = await Promise.all([
    db.checkout.groupBy({ by: ['state'], _count: true }),
    db.paymentEvent.groupBy({ by: ['processed'], _count: true }),
    db.paymentEvent.findMany({ where: { verified: true, processed: false }, orderBy: { nextAttemptAt: 'asc' }, take: 25, select: { id: true, checkoutId: true, type: true, attempts: true, nextAttemptAt: true, leaseUntil: true, errorCode: true } }),
  ]);
  console.log(JSON.stringify({ checkouts, inbox, attention: attention.map(e => ({ ...e, needsOperator: e.attempts >= 12 })) }, null, 2));
} finally { await db.$disconnect(); }
