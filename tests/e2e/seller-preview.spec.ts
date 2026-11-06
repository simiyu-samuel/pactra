import { expect, test } from '@playwright/test';

const catalog = { sellers: [{ name: 'Pixel Port', standardCents: 800, standardDays: 5, expressCents: 1500, expressDays: 2, warrantyMonths: 12, listings: [{ listCents: 4000, product: { name: 'Coffee maker', brand: 'A brand', role: 'home', description: 'A simple coffee maker for everyday use.', images: ['https://example.com/coffee.jpg'] } }] }] };

test('judges can explore and save practice edits without an owner session or writes', async ({ page }) => {
  test.setTimeout(90_000);
  const ownerCalls: string[] = [];
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/owner')) ownerCalls.push(request.url()); });
  await page.route('**/api/bootstrap', route => route.fulfill({ json: catalog }));
  await page.goto('/');
  await page.getByRole('link', { name: 'Try the seller workspace', exact: true }).first().click();
  await expect(page.getByRole('region', { name: 'Practice workspace', exact: true })).toBeVisible();
  await expect(page.getByLabel('Shop access code')).toHaveCount(0);
  await page.getByRole('navigation', { name: 'Seller tools' }).getByRole('link', { name: /Products/ }).click();
  await page.getByRole('button', { name: 'Edit Coffee maker' }).click();
  await page.getByLabel('Asking price · USD').fill('49');
  await page.getByLabel('I have checked this product').check();
  await page.getByRole('button', { name: 'Publish product', exact: true }).click();
  await expect(page.getByText('Practice product saved in this tab. The live catalog is unchanged.', { exact: true })).toBeVisible();
  await expect(page.getByRole('table')).toContainText('$49');
  await page.getByRole('navigation', { name: 'Seller tools' }).getByRole('link', { name: 'Agent rules' }).click();
  await page.getByLabel('Negotiation approach').selectOption('speed_first');
  await page.getByLabel('What changed?').fill('Try faster delivery');
  await page.getByRole('button', { name: 'Save my rules' }).click();
  await expect(page.getByRole('status')).toContainText('Practice rules saved');
  await page.getByRole('navigation', { name: 'Seller tools' }).getByRole('link', { name: 'Orders & payments' }).click();
  await expect(page.getByText('This practice workspace contains no buyer orders', { exact: false })).toBeVisible();
  expect(ownerCalls).toEqual([]);
  expect((await page.context().cookies()).some(cookie => cookie.name === 'pactra_owner')).toBe(false);
  await page.goto('/seller-preview#products');
  await page.reload();
  await expect(page.getByRole('table')).toContainText('$40');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Products', exact: true }).click();
  await page.getByRole('navigation', { name: 'Seller tools' }).getByRole('link', { name: 'Agent rules' }).click();
  await expect(page.getByRole('heading', { name: 'Agent rules', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
