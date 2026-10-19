import { Channel3Error } from '@channel3/sdk';
import type { Product } from '@channel3/sdk/resources';
import { channel3, retrieveProducts } from './channel3-sdk';
import { db, json } from '@pactra/database';
import { RuleError, type DiscoverySource, type DiscoveryResult } from '@pactra/domain';
import { channel3Offers, marketplaceDomains, marketplaceOffers } from './discovery-format';
import { searchWeb } from './groq';

const dailyLimit = (name: string, fallback: number) => Math.max(1, Math.floor(Number(process.env[name]) || fallback));
export async function discover(ownerId: string, query: string, source: DiscoverySource): Promise<DiscoveryResult & { products?: Product[] }> {
  if (source === 'channel3' && !process.env.CHANNEL3_API_KEY) throw new RuleError('CHANNEL3_NOT_CONFIGURED', 'Retailer search is being connected. You can browse Pactra sellers or search another marketplace.', 503);
  if (source !== 'channel3' && !process.env.GROQ_API_KEY) throw new RuleError('GROQ_NOT_CONFIGURED', 'Marketplace web search is unavailable right now. You can browse Pactra sellers.', 503);
  const normalizedQuery = query.trim().replace(/\s+/g, ' ');
  const slot = await db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(71934024)`;
    const now = Date.now();
    const cached = await tx.discoverySearch.findFirst({ where: { ownerId, query: normalizedQuery, source, state: 'complete', createdAt: { gt: new Date(now - 600_000) } }, orderBy: { createdAt: 'desc' } });
    if (cached) return { cached: cached.result as unknown as DiscoveryResult & { productIds?: string[] }, id: cached.id };
    const own = await tx.discoverySearch.findMany({ where: { ownerId, createdAt: { gt: new Date(now - 3_600_000) } }, select: { state: true, createdAt: true } });
    if (own.length >= 10 || own.some(r => r.state === 'running' && +r.createdAt > now - 60_000)) throw new RuleError('SEARCH_LIMIT', 'Please wait before searching again. Each browser can make ten external searches per hour.', 429);
    const providerSources: DiscoverySource[] = source === 'channel3' ? ['channel3'] : ['jumia', 'kilimall', 'amazon'];
    const total = await tx.discoverySearch.count({ where: { source: { in: providerSources }, createdAt: { gt: new Date(now - 86_400_000) } } });
    const cap = source === 'channel3' ? dailyLimit('CHANNEL3_DAILY_LIMIT', 100) : dailyLimit('GROQ_SEARCH_DAILY_LIMIT', 20);
    if (total >= cap) throw new RuleError('SEARCH_DAILY_LIMIT', 'Today’s external search allowance is used. Pactra’s own catalog is still available.', 429);
    const request = await tx.discoverySearch.create({ data: { ownerId, query: normalizedQuery, source } });
    return { cached: null, id: request.id };
  });
  if (slot.cached) {
    if (source === 'channel3') {
      const products = await retrieveProducts(slot.cached.productIds || []);
      const observedAt = new Date().toISOString();
      return { source, offers: channel3Offers({ products }, observedAt), products, observedAt, cached: true };
    }
    return { ...slot.cached, cached: true };
  }
  try {
    const observedAt = new Date().toISOString();
    let offers;
    let products: Product[] | undefined;
    if (source === 'channel3') {
      const page = await channel3().products.search({ query: normalizedQuery, limit: 8, config: { country: 'US', currency: 'USD' } });
      products = await retrieveProducts(page.data.map(p => p.id));
      offers = channel3Offers({ products }, observedAt);
    } else {
      const message = await searchWeb(normalizedQuery, marketplaceDomains[source]);
      offers = marketplaceOffers(message, source, observedAt);
    }
    const result: DiscoveryResult = { source, offers, observedAt, cached: false };
    await db.discoverySearch.update({ where: { id: slot.id }, data: { state: 'complete', result: json(source === 'channel3' ? { source, productIds: products!.map(p => p.id) } : result) } });
    return { ...result, ...(products ? { products } : {}) };
  } catch (error) {
    await db.discoverySearch.update({ where: { id: slot.id }, data: { state: 'failed' } });
    if (error instanceof Channel3Error) throw new RuleError('RETAILER_SEARCH_UNAVAILABLE', error.statusCode === 429 ? 'Retailer search is busy. Please try again later.' : 'Retailer search could not complete. Please try again later.', error.statusCode === 429 ? 429 : 502);
    if (error instanceof RuleError || (error as Error).constructor.name === 'QuotaWait') throw error;
    throw new RuleError('SEARCH_UNAVAILABLE', 'This search could not complete. Try again later or browse Pactra sellers.', 502);
  }
}

export async function refreshChannel3Product(ownerId: string, productId: string) {
  const owned = await db.discoverySearch.findFirst({ where: { ownerId, source: 'channel3', state: 'complete', createdAt: { gt: new Date(Date.now() - 86_400_000) }, result: { path: ['productIds'], array_contains: [productId] } } });
  if (!owned) throw new RuleError('NOT_FOUND', 'This product is not part of your recent searches.', 404);
  const products = await retrieveProducts([productId]);
  return { product: products[0], offers: channel3Offers({ products }, new Date().toISOString()) };
}
