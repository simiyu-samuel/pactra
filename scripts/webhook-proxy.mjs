import { createServer } from 'node:http';

// Only the PayPal webhook is forwarded. Catalog, sessions and seller routes remain local.
const target = 'http://127.0.0.1:3100/api/webhooks/paypal';
const server = createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.url !== '/api/webhooks/paypal' || req.method !== 'POST') {
    res.writeHead(404).end(); return;
  }
  try {
    const chunks = []; let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 50_000) { res.writeHead(413).end(); return; }
      chunks.push(chunk);
    }
    const headers = { 'Content-Type': 'application/json' };
    for (const [key, value] of Object.entries(req.headers)) if (key.startsWith('paypal-') && typeof value === 'string') headers[key] = value;
    const upstream = await fetch(target, { method: 'POST', headers, body: Buffer.concat(chunks), signal: AbortSignal.timeout(30_000), redirect: 'error' });
    res.writeHead(upstream.status, { 'Content-Type': 'application/json' }).end(await upstream.text());
  } catch { res.writeHead(502).end('{"error":"Local webhook unavailable"}'); }
});
server.listen(3102, '127.0.0.1', () => console.log('PayPal webhook-only proxy ready on 127.0.0.1:3102.'));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
