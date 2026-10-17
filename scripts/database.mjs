import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

config({ path: fileURLToPath(new URL('../.env.local', import.meta.url)), quiet: true });
config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
const cli = fileURLToPath(new URL('../packages/database/node_modules/prisma/build/index.js', import.meta.url));
const result = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], { cwd: fileURLToPath(new URL('../packages/database/', import.meta.url)), env: process.env, stdio: 'inherit' });
if (result.error) { console.error('Could not start the Prisma CLI. Run pnpm install first.'); process.exit(1); }
process.exit(result.status ?? 1);
