import { describe, expect, it, vi } from 'vitest';
import { createSellerPreview, previewShops, type PublicSeller, type WorkspaceSeller } from '../apps/web/src/lib/seller-preview';

const publicShop: PublicSeller = { name: 'A shop', standardCents: 800, standardDays: 5, expressCents: 1400, expressDays: 2, warrantyMonths: 12, listings: [{ listCents: 4000, product: { name: 'Coffee maker', brand: 'A brand', role: 'home', description: 'A simple coffee maker for everyday use.', images: ['https://example.com/coffee.jpg'] } }] };
const product = { name: 'My practice product', brand: 'A brand', category: 'home', description: 'A new product saved only in this practice shop.', images: ['https://example.com/product.jpg'], sourceUrl: null, listCents: 5000, floorCents: 3500, onHand: 7, status: 'active', confirmed: true };

describe('judge seller workspace boundaries', () => {
  it('uses public facts with example private rules and never forwards extra fields', () => {
    const source = { ...structuredClone(publicShop), id: 'real-seller', privateInstructions: 'PRIVATE NOTE', tokenHash: 'PRIVATE HASH', policyVersions: [{ snapshot: 'PRIVATE HISTORY' }] };
    Object.assign(source.listings[0], { id: 'real-listing', floorCents: 1234, onHand: 53, reserved: 22 });
    Object.assign(source.listings[0].product, { id: 'real-product', secret: 'PRIVATE PRODUCT' });
    const preview = previewShops([source]);
    const serialized = JSON.stringify(preview);
    expect(serialized).not.toMatch(/PRIVATE|real-seller|real-listing|real-product/);
    expect(preview[0].listings[0]).toMatchObject({ floorCents: 3200, onHand: 10, reserved: 0 });
  });
  it('isolates edits per visitor and returns copies instead of shared mutable state', async () => {
    const loader = vi.fn(async () => structuredClone([publicShop]));
    const first = createSellerPreview(loader), second = createSellerPreview(loader);
    await first('sellers/practice-shop-0/products/practice-listing-0-0', product);
    const read = await first<{ sellers: WorkspaceSeller[] }>('sellers');
    expect(read.sellers[0].listings[0].product.name).toBe(product.name);
    read.sellers[0].listings[0].floorCents = 1;
    expect((await first<{ sellers: WorkspaceSeller[] }>('sellers')).sellers[0].listings[0].floorCents).toBe(3500);
    expect((await second<{ sellers: WorkspaceSeller[] }>('sellers')).sellers[0].listings[0].product.name).toBe('Coffee maker');
    expect(publicShop.listings[0].product.name).toBe('Coffee maker');
    expect(loader).toHaveBeenCalledTimes(2);
  });
  it('does not offer owner login, order reads, refunds or a network fallback', async () => {
    const loader = vi.fn(async () => [publicShop]);
    const preview = createSellerPreview(loader);
    await expect(preview('session')).resolves.toEqual({ authenticated: true, configured: true });
    for (const [path, body] of [['login', { secret: 'anything' }], ['sellers/real-seller/products', product], ['orders/a/refund', {}], ['sellers/practice-shop-0/orders', undefined], ['sellers/practice-shop-0/publish/extra', {}]] as const) {
      await expect(preview(path, body)).rejects.toThrow('not available');
    }
    expect(loader).not.toHaveBeenCalled();
  });
  it('stores agent changes as example history and rejects invalid product boundaries', async () => {
    const preview = createSellerPreview(async () => [publicShop]);
    await preview('sellers/practice-shop-0/publish', { note: 'Try faster delivery', strategy: 'speed_first', privateInstructions: 'Example instructions', warrantyMonths: 12, standardCents: 800, standardDays: 3, expressCents: 1200, expressDays: 1 });
    let shop = (await preview<{ sellers: WorkspaceSeller[] }>('sellers')).sellers[0];
    expect(shop).toMatchObject({ strategy: 'speed_first', standardDays: 3, policyVersion: 2 });
    expect(shop.policyVersions[0].note).toBe('Try faster delivery');
    await expect(preview('sellers/practice-shop-0/products', { ...product, floorCents: 6000 })).rejects.toThrow();
    await expect(preview('sellers/practice-shop-0/products', { ...product, confirmed: false })).rejects.toThrow();
    shop = (await preview<{ sellers: WorkspaceSeller[] }>('sellers')).sellers[0];
    expect(shop.listings).toHaveLength(1);
    expect(shop.policyVersion).toBe(2);
  });
});
