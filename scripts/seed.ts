import { readFile } from 'node:fs/promises';
import { parse } from 'csv-parse/sync';
import { ensurePolicyVersion, sellerSnapshot } from '../packages/integrations/src/policies';
import { db, json, lockSeller } from '../packages/database/src/index';

async function rows(name: string): Promise<Record<string, string>[]> {
  return parse(await readFile(new URL(`../assets/demo/${name}.csv`, import.meta.url)), { columns: true, skip_empty_lines: true });
}
try {
  for (const x of await rows('products')) await db.product.upsert({ where: { id: x.product_id }, update: {}, create: { id: x.product_id, name: x.name, role: x.role, score: +x.capability_score, video: x.max_video_mode, audio: x.audio_interface, mount: x.tripod_mount } });
  for (const x of await rows('seller-policies')) await db.seller.upsert({ where: { id: x.seller_id }, update: {}, create: { id: x.seller_id, name: x.display_name, strategy: x.strategy, warrantyMonths: +x.warranty_months, standardCents: +x.standard_shipping_cents, standardDays: +x.standard_arrival_days, expressCents: +x.express_shipping_cents, expressDays: +x.express_arrival_days } });
  for (const x of await rows('listings')) await db.listing.upsert({ where: { id: x.listing_id }, update: {}, create: { id: x.listing_id, sellerId: x.seller_id, productId: x.product_id, listCents: +x.list_price_cents, floorCents: +x.private_floor_cents, onHand: +x.on_hand } });
  const general = [
    { id: 'BAG-01', name: 'Everyday Carry Backpack', role: 'bags', description: 'Fictional 20-litre everyday backpack with padded laptop pocket and water-resistant outer fabric.', price: 7900, floor: 5900 },
    { id: 'HOME-01', name: 'Morning Electric Kettle', role: 'home', description: 'Fictional 1.7-litre electric kettle with automatic shut-off and a removable filter.', price: 4900, floor: 3500 },
    { id: 'AUD-01', name: 'Everyday Wireless Headphones', role: 'electronics', description: 'Fictional over-ear wireless headphones with USB-C charging and a folding design.', price: 9900, floor: 7200 },
    { id: 'SHOE-01', name: 'Everyday Walking Shoes', role: 'fashion', description: 'Fictional lightweight walking shoes, size EU 42, charcoal. This exact size and colour are part of the product.', price: 6900, floor: 4900 },
  ];
  for (const item of general) {
    const { price, floor, ...product } = item;
    await db.product.upsert({ where: { id: item.id }, update: {}, create: { ...product, score: 50, video: 'not_applicable', audio: 'not_applicable', mount: 'not_applicable' } });
    for (const seller of await db.seller.findMany({ where: { id: { in: ['pixel_port', 'studio_stack', 'swift_gear'] } } })) await db.$transaction(async tx => {
      await lockSeller(tx, seller.id);
      const id = seller.id + '-' + item.id;
      if (await tx.listing.findUnique({ where: { id } })) return;
      await ensurePolicyVersion(tx, seller.id);
      await tx.listing.create({ data: { id, sellerId: seller.id, productId: item.id, listCents: price, floorCents: floor, onHand: 10 } });
      const next = await tx.seller.update({ where: { id: seller.id }, data: { policyVersion: { increment: 1 } } });
      await tx.sellerPolicyVersion.create({ data: { sellerId: seller.id, version: next.policyVersion, snapshot: json(await sellerSnapshot(tx, seller.id)), note: 'Added demo product: ' + item.name, source: 'catalog_expansion' } });
    });
  }
  for (const seller of await db.seller.findMany()) await db.$transaction(async tx => { await lockSeller(tx, seller.id); await ensurePolicyVersion(tx, seller.id); });
  console.log('Catalog seeded. Existing inventory and seller rules preserved.');
} finally { await db.$disconnect(); }
