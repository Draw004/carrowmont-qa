import { test, expect } from '@playwright/test';

test.describe('MOBILE1 app-like mobile web UX', () => {
  test('mobile homepage exposes compact tool launcher and persistent bottom navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const bottom = page.locator('[data-mobile1-bottom-nav]');
    await expect(bottom).toBeVisible();
    for (const label of ['Home', 'Tools', 'Learn', 'Research', 'More']) {
      await expect(bottom.getByText(label, { exact: true })).toBeVisible();
    }
    await expect(page.locator('[data-mobile1-quick-tools]')).toBeVisible();
    await expect(page.locator('[data-homepage-core-grid]')).toBeHidden();
    await expect(page.locator('.mobile-nav')).toBeHidden();
  });

  test('India quick tools surface SIP, EMI, Retirement, Compound and Goals', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      localStorage.setItem('carrowmont_region_v1', 'IN');
      localStorage.setItem('carrowmont_currency_v1', 'INR');
    });
    await page.goto('/');
    const quick = page.locator('[data-mobile1-quick-tools]');
    await expect(quick).toBeVisible();
    for (const label of ['SIP', 'EMI', 'Retirement', 'Compound', 'Goals']) {
      await expect(quick.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test('More opens accessible mobile destinations and locale control', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.locator('[data-mobile1-nav="more"]').click();
    const dialog = page.locator('#mobile1MoreDialog');
    await expect(dialog).toBeVisible();
    for (const label of ['Search', 'About', 'Methodology', 'Contact', 'Country & currency']) {
      await expect(dialog.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test('main hubs receive mobile bottom navigation without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    for (const path of ['/', '/tools.html', '/learn.html', '/research.html', '/about.html', '/contact.html']) {
      await page.goto(path);
      await expect(page.locator('[data-mobile1-bottom-nav]')).toBeVisible();
      const dims = await page.evaluate(() => ({ body: document.body.scrollWidth, doc: document.documentElement.scrollWidth, width: window.innerWidth }));
      expect(dims.body).toBeLessThanOrEqual(dims.width);
      expect(dims.doc).toBeLessThanOrEqual(dims.width);
    }
  });

  test('desktop homepage remains on the established full-card layout and has no mobile bottom bar', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.locator('[data-homepage-core-grid]')).toBeVisible();
    await expect(page.locator('[data-mobile1-bottom-nav]')).toBeHidden();
    await expect(page.locator('[data-mobile1-quick-tools]')).toBeHidden();
  });
});
