import { readFile } from 'node:fs/promises';
import { parse } from 'csv-parse/sync';
import { db } from '../packages/database/src/index';

async function rows(name: string): Promise<Record<string, string>[]> {
  return parse(await readFile(new URL(`../assets/demo/${name}.csv`, import.meta.url)), { columns: true, skip_empty_lines: true });
}
try {
  for (const x of await rows('products')) await db.product.upsert({ where: { id: x.product_id }, update: {}, create: { id: x.product_id, name: x.name, role: x.role, score: +x.capability_score, video: x.max_video_mode, audio: x.audio_interface, mount: x.tripod_mount } });
  for (const x of await rows('seller-policies')) await db.seller.upsert({ where: { id: x.seller_id }, update: {}, create: { id: x.seller_id, name: x.display_name, strategy: x.strategy, warrantyMonths: +x.warranty_months, standardCents: +x.standard_shipping_cents, standardDays: +x.standard_arrival_days, expressCents: +x.express_shipping_cents, expressDays: +x.express_arrival_days } });
  for (const x of await rows('listings')) await db.listing.upsert({ where: { id: x.listing_id }, update: {}, create: { id: x.listing_id, sellerId: x.seller_id, productId: x.product_id, listCents: +x.list_price_cents, floorCents: +x.private_floor_cents, onHand: +x.on_hand } });
  console.log('Seeded 8 fictional products, 3 sellers, and 21 listings. Existing inventory and policy edits preserved.');
} finally { await db.$disconnect(); }
