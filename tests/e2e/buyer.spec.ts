import { expect, test } from '@playwright/test';

test('the market explains the product and serves only public catalog fields', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Your agent negotiates. You make the call.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Choose the product. Negotiate the deal.' })).toBeVisible();
  await page.getByText('Looking elsewhere? Search other stores', { exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pactra sellers', exact: true })).toBeVisible();
  const response = await page.request.get('/api/bootstrap'); expect(response.ok()).toBeTruthy();
  const body = await response.text(); expect(body).not.toContain('floorCents'); expect(body).not.toContain('privateInstructions'); expect(body).not.toContain('tokenHash'); expect(body).not.toContain('PAYPAL_CLIENT_SECRET');
  const bootstrap = JSON.parse(body) as { sellers: Array<{ standardCents: number; standardDays: number; expressCents: number; expressDays: number }> };
  expect(bootstrap.sellers.length).toBeGreaterThan(0);
  expect(bootstrap.sellers[0]).toMatchObject({ standardCents: expect.any(Number), standardDays: expect.any(Number), expressCents: expect.any(Number), expressDays: expect.any(Number) });
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/pactra-desktop.png', fullPage: true });
});

test('the brief can be steered on a narrow mobile screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/negotiate');
  await expect(page.getByRole('heading', { name: 'Your next deal. On your terms.', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Delivery cost estimates' })).toContainText('Standard');
  await expect(page.getByRole('region', { name: 'Delivery cost estimates' })).toContainText('Express');
  await page.getByRole('button', { name: 'Lowest total' }).click();
  await expect(page.getByRole('button', { name: 'Lowest total' })).toHaveClass(/chosen/);
  await page.getByRole('spinbutton', { name: 'Total budget (including delivery)' }).fill('430');
  await expect(page.getByRole('spinbutton', { name: 'Total budget (including delivery)' })).toHaveValue('430');
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
