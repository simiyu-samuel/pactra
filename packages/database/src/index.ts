import { PrismaClient, Prisma } from '@prisma/client';
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

let directory = process.cwd();
for (let depth = 0; depth < 6; depth++) {
  if (existsSync(resolve(directory, 'pnpm-workspace.yaml'))) {
    for (const filename of ['.env.local', '.env']) {
      const path = resolve(directory, filename);
      if (existsSync(path)) config({ path, quiet: true });
    }
    break;
  }
  directory = dirname(directory);
}
if (process.env.PACTRA_ENV_FILE) config({ path: process.env.PACTRA_ENV_FILE, quiet: true });
const globalDb = globalThis as unknown as { pactraDb?: PrismaClient };
export const db = globalDb.pactraDb ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalDb.pactraDb = db;
export { Prisma };
export type Tx = Prisma.TransactionClient;
export const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value));

export async function event(tx: Tx, roomId: string, type: string, data: unknown) {
  const room = await tx.shoppingSession.update({ where: { id: roomId }, data: { nextSeq: { increment: 1 } } });
  await tx.roomEvent.create({ data: { roomId, sequence: room.nextSeq, type, data: json(data) } });
}
export async function lockRoom(tx: Tx, roomId: string) {
  await tx.$queryRaw`SELECT id FROM "ShoppingSession" WHERE id = ${roomId} FOR UPDATE`;
}
export async function lockCheckout(tx: Tx, id: string) {
  await tx.$queryRaw`SELECT id FROM "Checkout" WHERE id = ${id} FOR UPDATE`;
}

export async function lockSeller(tx: Tx, id: string) {
  await tx.$queryRaw`SELECT id FROM "Seller" WHERE id = ${id} FOR UPDATE`;
}
