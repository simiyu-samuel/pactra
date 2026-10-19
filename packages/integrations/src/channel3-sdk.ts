import { Channel3 } from '@channel3/sdk';
import type { Product } from '@channel3/sdk/resources';
import { channel3Offers, publicHttps } from './discovery-format';
import { RuleError } from '@pactra/domain';
export const channel3 = () => new Channel3({ apiKey: process.env.CHANNEL3_API_KEY, maxRetries: 0, timeoutInSeconds: 16 });
export function sanitizeProduct(product: Product): Product {
  // Preserve the full SDK product shape for official UI components; reject unsafe destinations.
  const valid = channel3Offers({ products: [product] }, new Date().toISOString());
  const urls = new Set(valid.map(o => o.url));
  return { ...product,
    offers: (product.offers || []).filter(o => urls.has(publicHttps(o.url))),
    images: (product.images || []).filter(i => publicHttps(i.url)).map(i => ({ ...i, url: publicHttps(i.url)!, cleaned_url: publicHttps(i.cleaned_url) })),
    variants: product.variants ? { ...product.variants, options: product.variants.options.map(option => ({ ...option, values: option.values.map(value => ({ ...value, thumbnail_url: publicHttps(value.thumbnail_url) })) })) } : product.variants,
  };
}
export async function retrieveProducts(ids: string[]): Promise<Product[]> {
  const client = channel3();
  const refreshed = await Promise.allSettled(ids.slice(0, 8).map(product_id => client.products.retrieve({ product_id, country: 'US', currency: 'USD' })));
  const products = refreshed.flatMap(r => r.status === 'fulfilled' ? [sanitizeProduct(r.value)] : []);
  if (ids.length && !products.length) throw new RuleError('RETAILER_REFRESH_UNAVAILABLE', 'Current retailer offers could not be refreshed. Please search again later.', 502);
  return products;
}
