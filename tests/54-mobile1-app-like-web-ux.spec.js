import { test, expect } from '@playwright/test';

test.describe('MOBILE1 app-like mobile web UX', () => {
  test('mobile homepage exposes compact tool launcher and persistent bottom navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const bottom = page.locator('[data-mobile1-bottom-nav]');
    await expect(bottom).toBeVisible();
    for (const label of ['Home', 'My Money', 'Ask', 'Tools', 'More']) {
      await expect(bottom.getByText(label, { exact: true })).toBeVisible();
    }
    await expect(page.locator('[data-mobile1-quick-tools]')).toBeVisible();
    await expect(page.locator('[data-homepage-core-grid]')).toBeHidden();
    await expect(page.locator('.mobile-nav')).toBeHidden();
  });


  test('Ask is a first-level center mobile destination and remains distinct from Search', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const bottom = page.locator('[data-mobile1-bottom-nav]');
    const items = bottom.locator('[data-mobile1-nav]');
    await expect(items).toHaveCount(5);
    await expect(items.nth(1)).toHaveAttribute('data-mobile1-nav', 'my');
    await expect(items.nth(1)).toHaveAttribute('href', '/my-carrowmont.html');
    await expect(items.nth(1).getByText('My Money', { exact: true })).toBeVisible();
    await expect(items.nth(2)).toHaveAttribute('data-mobile1-nav', 'ask');
    await expect(items.nth(2)).toHaveAttribute('href', '/ask-carrowmont.html');
    await expect(items.nth(2).getByText('Ask', { exact: true })).toBeVisible();
    await expect(page.locator('[data-mobile1-header-search]')).toBeVisible();
    await expect(page.locator('[data-mobile1-header-search]')).toHaveAttribute('href', '/search.html');
    await page.locator('[data-mobile1-nav="more"]').click();
    const dialog = page.locator('#mobile1MoreDialog');
    await expect(dialog.getByText('Learn', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Research', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Ask Carrowmont', { exact: true })).toHaveCount(0);
    await expect(dialog.getByText('Search', { exact: true })).toHaveCount(0);
  });


  test('mobile header is one compact row: brand left, Search pill centered, country/currency right, no hamburger', async ({ page }) => {
    for (const width of [412, 390, 360]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/');
      const menu = page.locator('.header-inner > .mobile-nav');
      const brand = page.locator('.header-inner > .brand');
      const search = page.locator('[data-mobile1-header-search]');
      const locale = page.locator('.header-inner > .locale-menu');
      await expect(menu).toBeHidden();
      await expect(brand).toBeVisible();
      await expect(search).toBeVisible();
      await expect(search.getByText('Search', { exact: true })).toBeVisible();
      await expect(locale).toBeVisible();
      const geometry = await page.evaluate(() => {
        const box = (selector) => {
          const r = document.querySelector(selector)?.getBoundingClientRect();
          return r ? { left:r.left, right:r.right, top:r.top, bottom:r.bottom, width:r.width, height:r.height, cy:r.top+r.height/2 } : null;
        };
        const searchEl = document.querySelector('[data-mobile1-header-search]');
        const brandEl = document.querySelector('.header-inner > .brand .brand-name');
        const radius = searchEl ? parseFloat(getComputedStyle(searchEl).borderTopLeftRadius) : 0;
        const brandFont = brandEl ? parseFloat(getComputedStyle(brandEl).fontSize) : 0;
        return {
          header: box('.header-inner'), brand: box('.header-inner > .brand'), search: box('[data-mobile1-header-search]'),
          locale: box('.header-inner > .locale-menu'), radius, brandFont
        };
      });
      expect(geometry.brand.left, `${width}px brand should be the left-most header item`).toBeLessThan(geometry.search.left);
      expect(geometry.search.left, `${width}px Search should sit after the brand`).toBeGreaterThanOrEqual(geometry.brand.right - 1);
      expect(geometry.locale.left, `${width}px locale should sit after Search`).toBeGreaterThanOrEqual(geometry.search.right - 1);
      expect(Math.abs(geometry.locale.right - geometry.header.right), `${width}px locale should be anchored to the header's extreme right`).toBeLessThanOrEqual(2);
      expect(Math.abs(geometry.brand.cy - geometry.search.cy), `${width}px brand and Search should share one header row`).toBeLessThanOrEqual(4);
      expect(Math.abs(geometry.locale.cy - geometry.search.cy), `${width}px locale and Search should share one header row`).toBeLessThanOrEqual(4);
      expect(geometry.header.height, `${width}px header should stay compact`).toBeLessThanOrEqual(70);
      expect(geometry.brandFont, `${width}px CARROWMONT should retain a strong mobile brand size`).toBeGreaterThanOrEqual(width <= 360 ? 17 : 18);
      expect(geometry.search.width / geometry.search.height, `${width}px Search should be a horizontal pill`).toBeGreaterThan(1.8);
      expect(geometry.radius, `${width}px Search should have an oval radius`).toBeGreaterThanOrEqual(18);
      const dims = await page.evaluate(() => ({ body: document.body.scrollWidth, doc: document.documentElement.scrollWidth, width: window.innerWidth }));
      expect(dims.body).toBeLessThanOrEqual(dims.width);
      expect(dims.doc).toBeLessThanOrEqual(dims.width);
    }
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

  test('More opens accessible mobile destinations, locale control and branded social icons', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.locator('[data-mobile1-nav="more"]').click();
    const dialog = page.locator('#mobile1MoreDialog');
    await expect(dialog).toBeVisible();
    for (const label of ['Learn', 'Research', 'About', 'Methodology', 'Contact', 'Country & currency']) {
      await expect(dialog.getByText(label, { exact: true })).toBeVisible();
    }

    const social = dialog.locator('.mobile1-more-social');
    await expect(social.getByText('LinkedIn', { exact: true })).toBeVisible();
    await expect(social.getByText('Facebook', { exact: true })).toBeVisible();
    await expect(social.getByText('Instagram', { exact: true })).toBeVisible();
    await expect(social.getByText('YouTube', { exact: true })).toBeVisible();
    await expect(social.locator('.mobile1-social-linkedin')).toHaveCSS('color', 'rgb(10, 102, 194)');
    await expect(social.locator('.mobile1-social-facebook')).toHaveCSS('color', 'rgb(24, 119, 242)');
    await expect(social.locator('.mobile1-social-youtube')).toHaveCSS('color', 'rgb(255, 0, 0)');
    await expect(social.locator('linearGradient#cmInstagramGradientMobile1')).toHaveCount(1);
    await expect(social.locator('linearGradient#cmInstagramGradientMobile1 stop')).toHaveCount(5);
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
