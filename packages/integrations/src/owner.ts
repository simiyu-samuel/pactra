import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { db } from '@pactra/database';
import { RuleError } from '@pactra/domain';

const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export const ownerSessionSeconds = 4 * 60 * 60;
export const ownerConfigured = () => (process.env.OWNER_LOGIN_SECRET?.length ?? 0) >= 32;
const credentialDigest = () => digest(process.env.OWNER_LOGIN_SECRET || '');

export async function loginOwner(secret: string) {
  if (!ownerConfigured()) throw new RuleError('OWNER_NOT_CONFIGURED', 'Owner access has not been configured on this server.', 503);
  const valid = timingSafeEqual(Buffer.from(digest(secret), 'hex'), Buffer.from(credentialDigest(), 'hex'));
  // Commit attempts even on failed authentication; throwing inside this
  // transaction would roll back the durable rate-limit counter.
  const admitted = await db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(71934023)`;
    const now = new Date();
    const current = await tx.ownerLoginWindow.findUnique({ where: { id: 'global' } });
    if (current && +current.startedAt > +now - 900_000 && current.attempts >= 10) return false;
    if (!current || +current.startedAt <= +now - 900_000) {
      await tx.ownerLoginWindow.upsert({ where: { id: 'global' }, create: { id: 'global', startedAt: now, attempts: 1 }, update: { startedAt: now, attempts: 1 } });
    } else await tx.ownerLoginWindow.update({ where: { id: 'global' }, data: { attempts: { increment: 1 } } });
    return true;
  });
  if (!admitted) throw new RuleError('OWNER_RATE_LIMIT', 'Too many owner sign-in attempts. Try again in 15 minutes.', 429);
  if (!valid) throw new RuleError('OWNER_LOGIN_FAILED', 'Owner access code was not accepted.', 401);
  const token = randomBytes(32).toString('base64url');
  const session = await db.ownerSession.create({ data: { tokenHash: digest(token), credentialDigest: credentialDigest(), expiresAt: new Date(Date.now() + ownerSessionSeconds * 1000) } });
  return { token, expiresAt: session.expiresAt };
}

export async function requireOwner(token?: string) {
  if (!ownerConfigured() || !token) throw new RuleError('OWNER_REQUIRED', 'Sign in as the project owner to manage seller policies.', 401);
  const session = await db.ownerSession.findUnique({ where: { tokenHash: digest(token) } });
  if (!session || +session.expiresAt <= Date.now() || session.credentialDigest !== credentialDigest()) throw new RuleError('OWNER_REQUIRED', 'Your owner session expired. Sign in again.', 401);
  return session;
}

export async function logoutOwner(token?: string) {
  if (token) await db.ownerSession.deleteMany({ where: { tokenHash: digest(token) } });
}
