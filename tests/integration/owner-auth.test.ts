import { afterAll, afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createHash, randomUUID } from 'node:crypto';
import { db } from '../../packages/database/src/index';
import { loginOwner, loginDemoSeller, sellerDemoEnabled, logoutOwner, requireOwner } from '../../packages/integrations/src/owner';
if (!process.env.DATABASE_URL?.split('?')[0].endsWith('/pactra_test')) throw new Error('Owner tests require pactra_test.');
const secret = 'owner-test-access-code-at-least-32-characters';
beforeEach(async () => { vi.stubEnv('OWNER_LOGIN_SECRET', secret); vi.stubEnv('SELLER_DEMO_ACCESS', 'false'); vi.stubEnv('PAYPAL_ENV', 'sandbox'); await db.ownerSession.deleteMany(); await db.ownerLoginWindow.deleteMany(); });
afterEach(() => vi.unstubAllEnvs());
afterAll(() => db.$disconnect());
it('stores only a token digest and revokes the owner session on sign-out', async () => {
  const result = await loginOwner(secret);
  const owner = await requireOwner(result.token);
  expect(owner.tokenHash).not.toBe(result.token);
  expect(owner.tokenHash).toBe(createHash('sha256').update(result.token).digest('hex'));
  expect(JSON.stringify(owner)).not.toContain(secret);
  await logoutOwner(result.token);
  await expect(requireOwner(result.token)).rejects.toMatchObject({ code: 'OWNER_REQUIRED' });
});
it('does not elevate a browser session into an owner session', async () => {
  const token = randomUUID();
  const guest = await db.browserSession.create({ data: { tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 60_000) } });
  await expect(requireOwner(token)).rejects.toMatchObject({ code: 'OWNER_REQUIRED' });
  await db.browserSession.delete({ where: { id: guest.id } });
});
it('rejects expired sessions and invalidates sessions when the owner code rotates', async () => {
  const result = await loginOwner(secret);
  const owner = await requireOwner(result.token);
  await db.ownerSession.update({ where: { id: owner.id }, data: { expiresAt: new Date(Date.now() - 1) } });
  await expect(requireOwner(result.token)).rejects.toMatchObject({ code: 'OWNER_REQUIRED' });
  const fresh = await loginOwner(secret);
  vi.stubEnv('OWNER_LOGIN_SECRET', secret + '-rotated');
  await expect(requireOwner(fresh.token)).rejects.toMatchObject({ code: 'OWNER_REQUIRED' });
});
it('persists rejected login attempts and enforces the shared durable limit', async () => {
  await expect(loginOwner('wrong')).rejects.toMatchObject({ code: 'OWNER_LOGIN_FAILED' });
  await expect(loginOwner('wrong-again')).rejects.toMatchObject({ code: 'OWNER_LOGIN_FAILED' });
  expect((await db.ownerLoginWindow.findUniqueOrThrow({ where: { id: 'global' } })).attempts).toBe(2);
  await db.ownerLoginWindow.update({ where: { id: 'global' }, data: { attempts: 10 } });
  await expect(loginOwner(secret)).rejects.toMatchObject({ code: 'OWNER_RATE_LIMIT' });
  expect(await db.ownerSession.count()).toBe(0);
});
it('refuses owner sign-in when the server secret is not configured', async () => {
  vi.stubEnv('OWNER_LOGIN_SECRET', '');
  await expect(loginOwner('')).rejects.toMatchObject({ code: 'OWNER_NOT_CONFIGURED' });
});

it('opens a hashed, expiring shared-demo session without the owner code or its login-attempt quota', async () => {
  vi.stubEnv('SELLER_DEMO_ACCESS', 'true');
  expect(sellerDemoEnabled()).toBe(true);
  const result = await loginDemoSeller();
  const session = await requireOwner(result.token);
  expect(session.demo).toBe(true);
  expect(session.tokenHash).toBe(createHash('sha256').update(result.token).digest('hex'));
  expect(+result.expiresAt - Date.now()).toBeGreaterThan(3.9 * 60 * 60 * 1000);
  expect(await db.ownerLoginWindow.count()).toBe(0);
  await logoutOwner(result.token);
  await expect(requireOwner(result.token)).rejects.toMatchObject({ code: 'OWNER_REQUIRED' });
});
it('requires explicit demo enablement and sandbox, including for existing demo sessions', async () => {
  await expect(loginDemoSeller()).rejects.toMatchObject({ code: 'SELLER_DEMO_DISABLED' });
  vi.stubEnv('SELLER_DEMO_ACCESS', 'true');
  const demo = await loginDemoSeller();
  const owner = await loginOwner(secret);
  vi.stubEnv('SELLER_DEMO_ACCESS', 'false');
  await expect(requireOwner(demo.token)).rejects.toMatchObject({ code: 'OWNER_REQUIRED' });
  expect((await requireOwner(owner.token)).demo).toBe(false);
  vi.stubEnv('SELLER_DEMO_ACCESS', 'true');
  vi.stubEnv('PAYPAL_ENV', 'live');
  await expect(loginDemoSeller()).rejects.toMatchObject({ code: 'SELLER_DEMO_DISABLED' });
  await expect(requireOwner(demo.token)).rejects.toMatchObject({ code: 'OWNER_REQUIRED' });
  vi.stubEnv('PAYPAL_ENV', '');
  await expect(loginDemoSeller()).rejects.toMatchObject({ code: 'SELLER_DEMO_DISABLED' });
});
it('invalidates demo sessions after expiry or owner-secret rotation', async () => {
  vi.stubEnv('SELLER_DEMO_ACCESS', 'true');
  const first = await loginDemoSeller();
  const session = await requireOwner(first.token);
  await db.ownerSession.update({ where: { id: session.id }, data: { expiresAt: new Date(Date.now() - 1) } });
  await expect(requireOwner(first.token)).rejects.toMatchObject({ code: 'OWNER_REQUIRED' });
  const next = await loginDemoSeller();
  vi.stubEnv('OWNER_LOGIN_SECRET', secret + '-rotated');
  await expect(requireOwner(next.token)).rejects.toMatchObject({ code: 'OWNER_REQUIRED' });
  vi.stubEnv('OWNER_LOGIN_SECRET', '');
  expect(sellerDemoEnabled()).toBe(false);
  await expect(loginDemoSeller()).rejects.toMatchObject({ code: 'SELLER_DEMO_DISABLED' });
});
