import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
export default defineConfig({
  testDir: './tests/e2e', fullyParallel: false,
  use: { baseURL: 'http://localhost:3100', trace: 'retain-on-failure', launchOptions: { ...(existsSync('/usr/bin/chromium') ? { executablePath: '/usr/bin/chromium' } : {}), args: ['--no-sandbox'] } },
  webServer: { command: 'pnpm --filter @pactra/web dev', url: 'http://localhost:3100', reuseExistingServer: true, timeout: 90_000 },
});
