import { expect, test } from '@playwright/test';

test('the market explains the product and serves only public catalog fields', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Your terms. Negotiated.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Pixel Port' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Studio Stack' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Swift Gear' })).toBeVisible();
  const response = await page.request.get('/api/bootstrap'); expect(response.ok()).toBeTruthy();
  const body = await response.text(); expect(body).not.toContain('floorCents'); expect(body).not.toContain('tokenHash'); expect(body).not.toContain('PAYPAL_CLIENT_SECRET');
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/pactra-desktop.png', fullPage: true });
});

test('the brief can be steered on a narrow mobile screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/');
  await page.getByRole('button', { name: 'Lowest total' }).click();
  await expect(page.getByRole('button', { name: 'Lowest total' })).toHaveClass(/chosen/);
  await page.getByRole('spinbutton', { name: 'Total budget' }).fill('430');
  await expect(page.getByRole('spinbutton', { name: 'Total budget' })).toHaveValue('430');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: 'test-results/pactra-mobile.png', fullPage: true });
});

test('API rejects forged mutation origins and unknown private resources', async ({ request }) => {
  await request.get('/api/bootstrap');
  const rejected = await request.post('/api/shopping-sessions', { data: {}, headers: { Origin: 'https://not-pactra.example' } });
  expect(rejected.status()).toBe(403);
  const missing = await request.get('/api/shopping-sessions/00000000-0000-4000-8000-000000000000');
  expect(missing.status()).toBe(404);
});
