import { z } from 'zod';
import type { OwnerListing } from '../components/seller-product-form';

export type WorkspaceVersion = { id: string; version: number; note: string; createdAt: string; snapshot: { seller: { strategy: string; standardCents: number; standardDays: number; expressCents: number; expressDays: number; warrantyMonths: number }; listings: Array<{ id: string; onHand: number; floorCents: number; product?: { name: string } }> } };
export type WorkspaceSeller = { id: string; name: string; strategy: string; privateInstructions: string; policyVersion: number; warrantyMonths: number; standardCents: number; standardDays: number; expressCents: number; expressDays: number; listings: OwnerListing[]; policyVersions: WorkspaceVersion[] };
export type PublicSeller = { name: string; standardCents: number; standardDays: number; expressCents: number; expressDays: number; warrantyMonths: number; listings: Array<{ listCents: number; product: { name: string; brand?: string; role: string; description?: string; images?: string[]; sourceUrl?: string | null } }> };

const publicUrl = z.string().url().max(2000).refine(value => { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; }, 'Use a public HTTPS photo or product link.');
const productInput = z.object({
  name: z.string().trim().min(2).max(100), brand: z.string().trim().max(50), category: z.string().trim().min(2).max(40).regex(/^[a-z][a-z0-9_ -]*$/),
  description: z.string().trim().min(10).max(1000), images: z.array(publicUrl).max(4), sourceUrl: publicUrl.nullable(),
  listCents: z.number().int().min(0).max(1000000), floorCents: z.number().int().min(0).max(1000000), onHand: z.number().int().min(0).max(10000),
  status: z.enum(['draft', 'active', 'archived']), confirmed: z.boolean(),
}).refine(i => i.floorCents <= i.listCents, 'Your minimum cannot exceed your asking price.')
  .refine(i => i.status !== 'active' || i.confirmed && i.listCents >= 100 && i.images.length > 0, 'Add a photo and asking price, then confirm the price and stock.');
const rulesInput = z.object({
  note: z.string().trim().min(3).max(200), strategy: z.enum(['price_first', 'bundle_first', 'speed_first']), privateInstructions: z.string().max(1000),
  warrantyMonths: z.number().int().min(0).max(60), standardCents: z.number().int().min(0).max(10000), standardDays: z.number().int().min(1).max(30),
  expressCents: z.number().int().min(0).max(10000), expressDays: z.number().int().min(1).max(30),
});

function record(shop: WorkspaceSeller, note: string) {
  shop.policyVersions.unshift({ id: crypto.randomUUID(), version: shop.policyVersion, note, createdAt: new Date().toISOString(), snapshot: {
    seller: { strategy: shop.strategy, standardCents: shop.standardCents, standardDays: shop.standardDays, expressCents: shop.expressCents, expressDays: shop.expressDays, warrantyMonths: shop.warrantyMonths },
    listings: shop.listings.map(l => ({ id: l.id, onHand: l.onHand, floorCents: l.floorCents, product: { name: l.product.name } })),
  } });
  shop.policyVersions = shop.policyVersions.slice(0, 20);
}

// Whitelist public product facts. Floors, stock, notes, IDs and history are new examples,
// never a projection of the real owner's private workspace. No owner token is issued.
export function previewShops(catalog: PublicSeller[]): WorkspaceSeller[] {
  return catalog.filter(s => s.listings.length > 0).map((s, index) => {
    const shop: WorkspaceSeller = {
      id: `practice-shop-${index}`, name: s.name, strategy: 'price_first', privateInstructions: 'Example: keep a fair margin and offer the buyer a choice of delivery options.', policyVersion: 1,
      warrantyMonths: s.warrantyMonths, standardCents: s.standardCents, standardDays: s.standardDays, expressCents: s.expressCents, expressDays: s.expressDays,
      listings: s.listings.map((l, i) => ({ id: `practice-listing-${index}-${i}`, listCents: l.listCents, floorCents: Math.floor(l.listCents * 0.8), onHand: 10, reserved: 0, status: 'active', product: {
        id: `practice-product-${index}-${i}`, name: l.product.name, brand: l.product.brand || '', role: l.product.role, description: l.product.description || '', images: [...(l.product.images || [])], sourceUrl: l.product.sourceUrl || null,
        isDemo: false, version: 1, score: 50, video: 'not_applicable', audio: 'not_applicable', mount: 'not_applicable',
      } })), policyVersions: [],
    };
    record(shop, 'Practice workspace opened. Minimum prices and stock are examples.');
    return shop;
  });
}

// Each component instance owns its store. The only network read is the existing public
// catalog. All edits are kept in memory; unknown routes fail closed, with no HTTP fallback.
export function createSellerPreview(loadCatalog: () => Promise<PublicSeller[]>) {
  let catalog: Promise<WorkspaceSeller[]> | undefined;
  const shops = () => catalog ??= loadCatalog().then(previewShops).catch(error => { catalog = undefined; throw error; });
  return async function request<T>(path: string, body?: unknown): Promise<T> {
    if (path === 'session' && body === undefined) return { authenticated: true, configured: true } as T;
    if (path === 'sellers' && body === undefined) return structuredClone({ sellers: await shops() }) as T;
    const match = /^sellers\/(practice-shop-\d+)\/(publish|products)(?:\/(practice-listing-[\w-]+))?$/.exec(path);
    if (!match || body === undefined || match[2] === 'publish' && match[3]) throw Error('This action is not available in the practice workspace.');
    const shop = (await shops()).find(s => s.id === match[1]);
    if (!shop) throw Error('Practice shop not found.');
    if (match[2] === 'publish') {
      const { note, ...rules } = rulesInput.parse(body);
      Object.assign(shop, rules); shop.policyVersion++; record(shop, note);
    } else {
      const input = productInput.parse(body);
      const existing = match[3] ? shop.listings.find(l => l.id === match[3]) : undefined;
      if (match[3] && !existing) throw Error('Practice product not found.');
      if (!existing && shop.listings.filter(l => l.status !== 'archived').length >= 50) throw Error('Archive a product before adding more.');
      const details = { name: input.name, brand: input.brand, role: input.category, description: input.description, images: input.images, sourceUrl: input.sourceUrl };
      if (existing) {
        Object.assign(existing, { listCents: input.listCents, floorCents: input.floorCents, onHand: input.onHand, status: input.status });
        Object.assign(existing.product, details, { version: existing.product.version + 1 });
      } else {
        shop.listings.push({ id: `practice-listing-${crypto.randomUUID()}`, listCents: input.listCents, floorCents: input.floorCents, onHand: input.onHand, reserved: 0, status: input.status, product: { id: `practice-product-${crypto.randomUUID()}`, ...details, version: 1, isDemo: false, score: 50, video: 'not_applicable', audio: 'not_applicable', mount: 'not_applicable' } });
      }
      shop.policyVersion++; record(shop, `${existing ? 'Updated' : 'Added'} practice product: ${input.name}`);
    }
    return { version: shop.policyVersion } as T;
  };
}
