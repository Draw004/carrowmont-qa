import { test, expect } from '@playwright/test';
import { gotoClean } from '../helpers/common.js';

async function runSearch(page, query) {
  const input = page.locator('[data-cm-search-input]').first();
  await input.fill(query);
  await input.press('Enter');
  await expect(page.locator('[data-cm-search-root]').first()).toHaveAttribute('data-search-state', 'results');
  return page.locator('[data-search-result-link]');
}

test.describe('FRE8I Ask and Search relevance', () => {
  test('[AUTO] Ask understands topic plus intent for starting to invest in gold and hands the same private query to broader Search', async ({ page }) => {
    const query = 'how to start investing in gold';
    await gotoClean(page, '/ask-carrowmont.html');
    await page.locator('#askQuestion').fill(query);
    await page.locator('#askStartBtn').click();

    const matches = page.locator('#askUnsupported .ask-route-result');
    await expect(matches).toHaveCount(3);
    await expect(matches.nth(0)).toContainText('Gold as an Investment: Risks and Role');
    await expect(matches.nth(1)).toContainText('Investing for Beginners: A Simple Starting Guide');

    await Promise.all([
      page.waitForURL(/\/search\.html$/),
      page.locator('#askSearchAll').click()
    ]);
    await expect(page.locator('[data-cm-search-input]')).toHaveValue(query);
    const results = page.locator('[data-search-result-link]');
    await expect(results.first()).toContainText('Gold as an Investment: Risks and Role');
    expect(await results.count()).toBeGreaterThanOrEqual(8);
    await expect(page.getByRole('link', { name: /Physical Gold vs Gold ETF/i })).toBeVisible();
    expect(new URL(page.url()).search).toBe('');
  });

  test('[AUTO] near-equivalent gold wording keeps the direct gold guide first while Search remains broader', async ({ page }) => {
    await gotoClean(page, '/search.html');
    for (const query of ['how to invest in gold', 'gold investing for beginners']) {
      const results = await runSearch(page, query);
      await expect(results.first()).toContainText('Gold as an Investment: Risks and Role');
      expect(await results.count()).toBeGreaterThanOrEqual(8);
    }
  });

  test('[AUTO] semantic ranking works across retirement, inflation and debt rather than one topic only', async ({ page }) => {
    await gotoClean(page, '/search.html');
    for (const [query, expected] of [
      ['starting retirement planning', 'Detailed Retirement Planner'],
      ['how to calculate inflation', 'Inflation & Purchasing Power Calculator'],
      ['how to pay debt faster', 'Debt Payoff Calculator'],
      ['how much emergency savings do i need', 'Emergency Fund & Financial Runway Calculator'],
      ['how to reduce credit card debt', 'Credit Card Payoff Calculator']
    ]) {
      const results = await runSearch(page, query);
      await expect(results.first()).toContainText(expected);
    }
  });
});
