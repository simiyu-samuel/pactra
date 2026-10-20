import { db, event, json, type Tx } from '@pactra/database';
import { briefSchema, RuleError, type Brief } from '@pactra/domain';
import { recordBrief } from './policies';
const day = 86_400_000;
export function negotiationLimit() {
  const value = Number(process.env.NEGOTIATIONS_PER_BROWSER_PER_DAY);
  return Number.isSafeInteger(value) && value >= 1 && value <= 100 ? value : 3;
}
export async function negotiationAllowance(ownerId: string, client: Pick<Tx, 'shoppingSession'> = db) {
  const now = Date.now();
  const rooms = await client.shoppingSession.findMany({ where: { ownerId, createdAt: { gt: new Date(now - day) } }, orderBy: { createdAt: 'asc' }, select: { id: true, state: true, brief: true, createdAt: true } });
  const limit = negotiationLimit();
  const used = rooms.length;
  return { limit, used, remaining: Math.max(0, limit - used), nextAvailableAt: used >= limit ? new Date(+rooms[used - limit].createdAt + day).toISOString() : null,
    recentRooms: rooms.slice(-6).reverse().map(r => ({ id: r.id, state: r.state, capCents: briefSchema.parse(r.brief).capCents, createdAt: r.createdAt.toISOString() })) };
}
export async function assertProductsAvailable(brief: Brief, client: Pick<Tx, 'listing'> = db) {
  if (!brief.items) return;
  const rows = await client.listing.findMany({ where: { productId: { in: brief.items.map(i => i.productId) } } });
  const sellerIds = [...new Set(rows.map(l => l.sellerId))];
  if (!sellerIds.some(id => brief.items!.every(i => rows.some(l => l.sellerId === id && l.productId === i.productId && l.onHand - l.reserved >= i.quantity)))) throw new RuleError('PRODUCTS_UNAVAILABLE', 'No seller currently has every selected item in the quantities you need. Try fewer items or a smaller quantity.');
}
export async function createNegotiation(ownerId: string, rawBrief: Brief, commandKey: string) {
  const brief = briefSchema.parse(rawBrief);
  return db.$transaction(async tx => {
    // Serialize admission per browser: simultaneous clicks cannot exceed its allowance.
    await tx.$queryRaw`SELECT id FROM "BrowserSession" WHERE id = ${ownerId} FOR UPDATE`;
    const existing = await tx.shoppingSession.findUnique({ where: { id: commandKey } });
    if (existing) {
      if (existing.ownerId !== ownerId || JSON.stringify(briefSchema.parse(existing.brief)) !== JSON.stringify(brief)) throw new RuleError('COMMAND_CONFLICT', 'This command key is already in use.');
      return existing;
    }
    await assertProductsAvailable(brief, tx);
    const allowance = await negotiationAllowance(ownerId, tx);
    if (!allowance.remaining) throw new RuleError('SESSION_LIMIT', `You’ve started ${allowance.used} of ${allowance.limit} allowed negotiations in the past 24 hours. The next slot opens ${allowance.nextAvailableAt}. Reopen a recent room to continue without starting another.`, 429);
    const created = await tx.shoppingSession.create({ data: { id: commandKey, ownerId, brief: json(brief) } });
    await recordBrief(tx, created.id, 1, brief);
    await tx.job.create({ data: { key: `${created.id}:1`, roomId: created.id, briefVersion: 1 } });
    await event(tx, created.id, 'brief.confirmed', { message: 'Your request is saved. Your agent will now discuss the deal with sellers.' });
    return created;
  });
}
