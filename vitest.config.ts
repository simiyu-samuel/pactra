import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
const source = (name: string) => fileURLToPath(new URL(`./packages/${name}/src/index.ts`, import.meta.url));
export default defineConfig({ resolve: { alias: { '@pactra/domain': source('domain'), '@pactra/database': source('database'), '@pactra/integrations': source('integrations') } }, test: { include: ['tests/**/*.test.ts'], exclude: process.env.TEST_DATABASE_URL ? [] : ['tests/integration/**'], testTimeout: 15_000 } });
