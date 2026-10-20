import { NextRequest, NextResponse } from 'next/server';
import { db } from '@pactra/database';
import { loginOwner, logoutOwner, requireOwner, ownerConfigured, ownerSessionSeconds, publishPolicy, addSellerProduct } from '@pactra/integrations';
import { RuleError } from '@pactra/domain';
import { z } from 'zod';

const cookie = 'pactra_owner';
const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const, path: '/api/owner' });
const reply = (body: unknown) => NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });

// All POST requests reach this handler only after the shared origin check.
export async function ownerApi(req: NextRequest, path: string[], readBody: () => Promise<unknown>) {
  const token = req.cookies.get(cookie)?.value;
  if (path.length === 1 && path[0] === 'session' && req.method === 'GET') {
    try { await requireOwner(token); return reply({ authenticated: true, configured: true }); }
    catch (error) { if (!(error instanceof RuleError) || error.code !== 'OWNER_REQUIRED') throw error; return reply({ authenticated: false, configured: ownerConfigured() }); }
  }
  if (path.length === 1 && path[0] === 'login' && req.method === 'POST') {
    const { secret } = z.object({ secret: z.string().max(256) }).strict().parse(await readBody());
    const session = await loginOwner(secret);
    const response = reply({ authenticated: true, expiresAt: session.expiresAt });
    response.cookies.set(cookie, session.token, { ...cookieOptions(), maxAge: ownerSessionSeconds });
    return response;
  }
  if (path.length === 1 && path[0] === 'logout' && req.method === 'POST') {
    await logoutOwner(token);
    const response = reply({ authenticated: false });
    response.cookies.set(cookie, '', { ...cookieOptions(), maxAge: 0 });
    return response;
  }
  const owner = await requireOwner(token);
  if (path.length === 1 && path[0] === 'sellers' && req.method === 'GET') {
    const sellers = await db.seller.findMany({ orderBy: { id: 'asc' }, include: { listings: { orderBy: { id: 'asc' }, include: { product: true } }, policyVersions: { orderBy: { version: 'desc' }, take: 20, select: { id: true, version: true, note: true, source: true, createdAt: true, snapshot: true } } } });
    return reply({ sellers });
  }
  if (path.length === 3 && path[0] === 'sellers' && path[2] === 'products' && req.method === 'POST') return reply(await addSellerProduct(path[1], await readBody(), owner.id));
  if (path.length === 3 && path[0] === 'sellers' && path[2] === 'publish' && req.method === 'POST') {
    return reply(await publishPolicy(path[1], await readBody(), owner.id));
  }
  throw new RuleError('NOT_FOUND', 'Owner resource not found.', 404);
}
