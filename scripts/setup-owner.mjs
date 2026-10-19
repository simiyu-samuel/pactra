import { readFileSync, writeFileSync, chmodSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parse } from 'dotenv';
const path = fileURLToPath(new URL('../.env.local', import.meta.url));
if (!existsSync(path)) throw new Error('Create .env.local from .env.example first.');
let text = readFileSync(path, 'utf8');
const current = parse(text).OWNER_LOGIN_SECRET;
if (current && current.length < 32) throw new Error('The existing owner code is too short. Use at least 32 random characters.');
if (!current) {
  const line = `OWNER_LOGIN_SECRET=${randomBytes(32).toString('base64url')}`;
  text = /^OWNER_LOGIN_SECRET=.*$/m.test(text) ? text.replace(/^OWNER_LOGIN_SECRET=.*$/m, line) : text.trimEnd() + '\n\n# Private seller-console access\n' + line + '\n';
  writeFileSync(path, text, { mode: 0o600 });
}
chmodSync(path, 0o600);
console.log('Owner access configured. Copy OWNER_LOGIN_SECRET from .env.local into the seller workspace. Restart the web server after first setup.');
