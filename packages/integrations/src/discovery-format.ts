import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import { z } from 'zod';
import type { DiscoverySource, MarketOffer } from '@pactra/domain';

export const marketplaceDomains = { jumia: 'jumia.co.ke', kilimall: 'kilimall.co.ke', amazon: 'amazon.com' } as const;
// Only public HTTPS destinations are rendered. The server never fetches these URLs.
export function publicHttps(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 4096) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || url.username || url.password || url.port || host.endsWith('.') || host.startsWith('[') || isIP(host) || !host.includes('.') || /(^|\.)(localhost|local|internal|test|invalid|example)$/.test(host)) return null;
    return url.href;
  } catch { return null; }
}
const text = (value: unknown, max: number) => typeof value === 'string' ? value.replace(/[\u0000-\u001f]/g, ' ').slice(0, max) : '';
const digest = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 20);
const productSchema = z.object({
  id: z.string(), title: z.string().min(1), description: z.string().nullish(),
  images: z.array(z.object({ url: z.string(), cleaned_url: z.string().nullish(), is_main_image: z.boolean().optional() })).optional(),
  category: z.object({ title: z.string() }).nullish(),
  variants: z.object({ selected: z.array(z.object({ name: z.string(), label: z.string() })).optional() }).nullish(),
  offers: z.array(z.unknown()),
});
const offerSchema = z.object({
  url: z.string(), domain: z.string().min(1),
  price: z.object({ price: z.number().finite().nonnegative(), currency: z.string().regex(/^[A-Z]{3}$/) }),
  availability: z.string().optional(), condition: z.string().nullish(),
});
export function channel3Offers(payload: unknown, observedAt: string): MarketOffer[] {
  const root = z.object({ products: z.array(z.unknown()) }).safeParse(payload);
  if (!root.success) throw new Error('Invalid Channel3 response');
  const offers: MarketOffer[] = [];
  for (const entry of root.data.products.slice(0, 12)) {
    const parsed = productSchema.safeParse(entry);
    if (!parsed.success) continue;
    const p = parsed.data;
    const image = p.images?.find(i => i.is_main_image) || p.images?.[0];
    for (const candidate of p.offers.slice(0, 8)) {
      const parsedOffer = offerSchema.safeParse(candidate);
      if (!parsedOffer.success) continue;
      const o = parsedOffer.data;
      const url = publicHttps(o.url);
      if (!url || !publicHttps(`https://${o.domain}`)) continue;
      offers.push({ id: `channel3-${digest(p.id + o.domain + (o.condition || '') + JSON.stringify(p.variants?.selected || []))}`, productId: p.id, title: text(p.title, 180), description: text(p.description, 450), source: 'channel3', merchant: text(o.domain, 120), url,
        image: image ? publicHttps(image.cleaned_url) || publicHttps(image.url) : null,
        amount: o.price.price, currency: o.price.currency,
        availability: o.availability === 'InStock' ? 'in_stock' : o.availability === 'OutOfStock' ? 'out_of_stock' : 'unknown',
        condition: text(o.condition, 40) || null, variants: (p.variants?.selected || []).slice(0, 8).map(v => `${text(v.name, 40)}: ${text(v.label, 70)}`),
        category: text(p.category?.title, 80) || 'Products', observedAt, fictional: false });
    }
  }
  return [...new Map(offers.map(o => [o.id, o])).values()].slice(0, 36);
}
// Read provider tool records only. Assistant prose, links and JSON are not evidence.
export function marketplaceOffers(message: unknown, source: Exclude<DiscoverySource, 'channel3'>, observedAt: string): MarketOffer[] {
  const parsed = z.object({ executed_tools: z.array(z.object({
    browser_results: z.array(z.object({ title: z.string(), url: z.string(), content: z.string().optional() })).optional(),
    search_results: z.object({ results: z.array(z.object({ title: z.string().optional(), url: z.string(), content: z.string().optional() })).optional() }).nullish(),
  }).passthrough()).optional() }).safeParse(message);
  if (!parsed.success) return [];
  const domain = marketplaceDomains[source];
  const records = (parsed.data.executed_tools || []).flatMap(t => [...(t.search_results?.results || []), ...(t.browser_results || [])]);
  const result: MarketOffer[] = [];
  for (const record of records) {
    const url = publicHttps(record.url);
    if (!url) continue;
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname !== domain && !parsedUrl.hostname.endsWith(`.${domain}`)) continue;
    // Root pages are not product discoveries. Search/category pages remain labeled search results.
    if (parsedUrl.pathname === '/' && !parsedUrl.search) continue;
    result.push({ id: `${source}-${digest(url)}`, title: /viewing lines|^https?:|^www\./i.test(record.title || '') ? `Explore this result on ${source === 'jumia' ? 'Jumia' : source === 'kilimall' ? 'Kilimall' : 'Amazon'}` : text(record.title, 180) || `Result on ${domain}`, description: text(record.content, 350), source, merchant: domain, url, image: null,
      amount: null, currency: null, availability: 'unknown', condition: null, variants: [], category: 'Web search result', observedAt, fictional: false });
  }
  return result.filter((o, i, all) => all.findIndex(other => other.url === o.url) === i).slice(0, 8);
}
