import { test, expect } from '@playwright/test';
import { gotoClean, assertNoHorizontalOverflow } from '../helpers/common.js';
import { chooseIndiaLocale, chooseUnitedStatesLocale } from '../helpers/fixtures.js';

test.describe('GSEO2A sitewide search visibility foundation', () => {
  test('[AUTO] SIP keeps one stable crawlable search identity while visible terminology still localizes', async ({ page }) => {
    await gotoClean(page, '/sip-calculator/');
    await expect(page).toHaveTitle('SIP Calculator & Recurring Investment Calculator | Carrowmont');
    await expect(page.locator('[data-cm-search-identity]')).toContainText('SIP means Systematic Investment Plan.');

    await chooseUnitedStatesLocale(page);
    await expect(page).toHaveTitle('SIP Calculator & Recurring Investment Calculator | Carrowmont');
    await expect(page.locator('.product-label')).toHaveText('Recurring Investment Calculator');
    await expect(page.locator('[data-cm-search-identity]')).toContainText('SIP means Systematic Investment Plan.');

    await chooseIndiaLocale(page);
    await expect(page).toHaveTitle('SIP Calculator & Recurring Investment Calculator | Carrowmont');
    await expect(page.locator('.product-label')).toHaveText('SIP Calculator');
  });

  test('[AUTO] retirement landing and detailed planner have distinct search ownership', async ({ page }) => {
    await gotoClean(page, '/retirement-calculator/');
    await expect(page).toHaveTitle('Retirement Calculator & Retirement Planner | Carrowmont');
    await expect(page.locator('main')).toContainText('Retirement calculator:');

    await gotoClean(page, '/retirement-calculator/planner.html');
    await expect(page).toHaveTitle('Detailed Retirement Planner | Carrowmont');
    await expect(page.locator('main h1')).toHaveText('Your retirement plan should reflect how your expenses actually change.');
  });

  test('[AUTO] SWP and Loan search intents have useful crawlable explanations and bidirectional Learn paths', async ({ page }) => {
    await gotoClean(page, '/retirement-calculator/withdrawal-calculator.html');
    await expect(page).toHaveTitle('SWP, Retirement Withdrawal & Drawdown Calculator | Carrowmont');
    await expect(page.locator('main')).toContainText('Systematic Withdrawal Plan (SWP)');
    await expect(page.locator('a[href="/what-is-swp-systematic-withdrawal-plan.html"]')).toBeVisible();

    await gotoClean(page, '/what-is-swp-systematic-withdrawal-plan.html');
    await expect(page.locator('.guide-answer')).toBeVisible();
    await expect(page.locator('a[href="/retirement-calculator/withdrawal-calculator.html"]').first()).toBeVisible();

    await gotoClean(page, '/loan-calculator/');
    await expect(page.locator('a[href="/how-is-loan-emi-calculated.html"]')).toBeVisible();
    await expect(page.locator('a[href="/loan-interest-rate-vs-term.html"]')).toBeVisible();

    for (const path of ['/how-is-loan-emi-calculated.html', '/loan-interest-rate-vs-term.html']) {
      await gotoClean(page, path);
      await expect(page.locator('.guide-answer')).toBeVisible();
      await expect(page.locator('a[href="/loan-calculator/"]').first()).toBeVisible();
    }
  });

  test('[AUTO] Learn hub exposes the new Loans and Debt cluster and remains mobile-safe', async ({ page }) => {
    for (const width of [1280, 390, 360]) {
      await page.setViewportSize({ width, height: 900 });
      await gotoClean(page, '/learn.html');
      await page.evaluate(() => { window.location.hash = 'loans-and-debt'; });
      await expect(page).toHaveURL(/#loans-and-debt$/);
      const loans = page.locator('[data-category="loans"]');
      await expect(loans).toHaveCount(1);
      await expect(loans.getByRole('heading', { name: 'Loans & Debt' })).toBeVisible();
      await expect(loans.locator('a[href="/loan-calculator/"]')).toBeVisible();
      await expect(loans.locator('a[href="/how-is-loan-emi-calculated.html"]')).toBeVisible();
      await expect(loans.locator('a[href="/loan-interest-rate-vs-term.html"]')).toBeVisible();
      await assertNoHorizontalOverflow(page, `GSEO2A Learn hub ${width}px`);
    }
  });

  test('[AUTO] Tools Hub schema lists all 19 live tools including SWP and stable SIP identity', async ({ page }) => {
    await gotoClean(page, '/tools.html');
    const itemList = await page.locator('script[type="application/ld+json"]').evaluateAll(nodes => {
      for (const node of nodes) {
        try {
          const parsed = JSON.parse(node.textContent || '{}');
          const graph = Array.isArray(parsed['@graph']) ? parsed['@graph'] : [parsed];
          const collection = graph.find(entry => entry['@type'] === 'CollectionPage');
          if (collection?.mainEntity?.['@type'] === 'ItemList') return collection.mainEntity;
        } catch {}
      }
      return null;
    });
    expect(itemList?.numberOfItems).toBe(19);
    expect(itemList?.itemListElement).toHaveLength(19);
    expect(itemList.itemListElement.some(item => item.url === 'https://carrowmont.com/retirement-calculator/withdrawal-calculator.html')).toBe(true);
    expect(itemList.itemListElement.some(item => item.url === 'https://carrowmont.com/home-affordability-calculator.html')).toBe(true);
    expect(itemList.itemListElement.find(item => item.url === 'https://carrowmont.com/sip-calculator/')?.name)
      .toBe('SIP Calculator & Recurring Investment Calculator');
  });
});
