import { test, expect } from '@playwright/test';
import { gotoClean, assertNoHorizontalOverflow } from '../helpers/common.js';

test.describe('HYGIENE1 localization and Learn navigation closeout', () => {
  test('New Zealand timezone wins over en-US browser language on first visit', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'en-US', timezoneId: 'Pacific/Auckland' });
    const page = await context.newPage();
    await gotoClean(page, '/');
    await expect(page.locator('#localeCountryLabel')).toHaveText('New Zealand');
    await expect(page.locator('#localeCurrencyLabel')).toHaveText('NZD');
    await context.close();
  });

  test('saved explicit country and currency override automatic first-visit inference', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'en-US', timezoneId: 'Pacific/Auckland' });
    const page = await context.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('carrowmont_region_v1', 'US');
      localStorage.setItem('carrowmont_currency_v1', 'USD');
    });
    await page.goto('/');
    await expect(page.locator('#localeCountryLabel')).toHaveText('United States');
    await expect(page.locator('#localeCurrencyLabel')).toHaveText('USD');
    await context.close();
  });

  test('desktop header uses canonical order with Search immediately after About', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoClean(page, '/');
    const labels = await page.locator('.desktop-nav > a').allTextContents();
    expect(labels.map(x => x.trim())).toEqual(['Plan','Tools','Learn','Research','Methodology','About','Search']);
    const relation = await page.evaluate(() => {
      const nav = document.querySelector('.desktop-nav');
      const search = nav?.querySelector('a[href="/search.html"]');
      const about = nav?.querySelector('a[href="/about.html"]');
      const locale = document.querySelector('.header-inner > .locale-menu');
      return { searchLast: search === nav?.lastElementChild, aboutBeforeSearch: about?.nextElementSibling === search, localeAfterNav: nav?.nextElementSibling === locale };
    });
    expect(relation).toEqual({ searchLast: true, aboutBeforeSearch: true, localeAfterNav: true });
  });

  test('Learn hub and articles expose the same major-topic banner', async ({ page }) => {
    await gotoClean(page, '/learn.html');
    const nav = page.locator('[data-cm-learn-topic-nav]');
    await expect(nav).toBeVisible();
    for (const label of ['Retirement','Assets & Investing','Credit, Loans & Debt','Budget & Cash Flow','Financial Goals','Inflation','Macro & Markets']) {
      await expect(nav.getByText(label, { exact: true })).toBeVisible();
    }
    await expect(nav.locator('[data-cm-learn-topic="investment"]')).toHaveText('SIP & Investing');
    await nav.getByText('Retirement', { exact: true }).click();
    await expect(page).toHaveURL(/#topic-retirement$/);
    await expect(page.locator('#topic-retirement')).toBeVisible();

    await gotoClean(page, '/asset-allocation-explained.html');
    const articleNav = page.locator('[data-cm-learn-topic-nav]');
    await expect(articleNav).toBeVisible();
    await expect(articleNav.locator('[data-cm-learn-topic="retirement"]')).toHaveAttribute('href', '/learn.html#topic-retirement');
  });

  test('topic banner remains usable without horizontal page overflow on 390 and 360', async ({ page }) => {
    for (const width of [390, 360]) {
      await page.setViewportSize({ width, height: 844 });
      for (const target of ['/learn.html', '/asset-allocation-explained.html']) {
        await gotoClean(page, target);
        await expect(page.locator('[data-cm-learn-topic-nav]')).toBeVisible();
        await assertNoHorizontalOverflow(page, `${width}px ${target}`);
      }
    }
  });

  test('direct New Zealand calculator visit uses NZD rather than USD', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'en-US', timezoneId: 'Pacific/Auckland' });
    const page = await context.newPage();
    await gotoClean(page, '/loan-calculator/');
    await expect(page.locator('#localeCurrent')).toHaveText('New Zealand · NZD');
    await expect(page.locator('.currency-prefix').first()).toHaveText('NZ$');
    await context.close();
  });
});
