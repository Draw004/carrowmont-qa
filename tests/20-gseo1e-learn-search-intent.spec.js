import { test, expect } from '@playwright/test';
import { gotoClean, assertNoHorizontalOverflow } from '../helpers/common.js';

const CASES = [
  '/zero-based-budgeting.html',
  '/asset-allocation-explained.html',
  '/diversification-across-asset-classes.html',
  '/emergency-fund-how-much.html',
  '/how-much-should-i-invest-each-month.html'
];

test.describe('GSEO1E Learn search-intent refinement', () => {
  test('[AUTO] asset allocation owns the definition query with a definition-first snippet', async ({ page }) => {
    await gotoClean(page, '/asset-allocation-explained.html');
    await expect(page).toHaveTitle('What Is Asset Allocation? How It Works | Carrowmont');
    await expect(page.locator('main h1')).toHaveText('What is asset allocation, and why does it matter?');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Asset allocation is how a portfolio is divided/);
  });

  test('[AUTO] zero-based budgeting keeps its primary intent and clarifies observed zero-sum wording', async ({ page }) => {
    await gotoClean(page, '/zero-based-budgeting.html');
    await expect(page).toHaveTitle('Zero-Based Budgeting: How It Works | Carrowmont');
    await expect(page.locator('main h1')).toHaveText('What is zero-based budgeting and how does it work?');
    await expect(page.getByRole('heading', { name: 'What if I searched for zero-sum budgeting or zero-balance budgeting?' })).toBeVisible();
    await expect(page.getByText(/zero unassigned income/)).toBeVisible();
  });

  test('[AUTO] diversification stays distinct from asset allocation and links to the definition guide', async ({ page }) => {
    await gotoClean(page, '/diversification-across-asset-classes.html');
    await expect(page).toHaveTitle('Diversification Across Asset Classes | Carrowmont');
    await expect(page.getByRole('heading', { name: 'How is diversification different from asset allocation?' })).toBeVisible();
    const assetAllocationLinks = page.getByRole('link', { name: 'Asset allocation', exact: true });
    expect(await assetAllocationLinks.count()).toBeGreaterThanOrEqual(1);
    await expect(assetAllocationLinks.first()).toBeVisible();
    await expect(assetAllocationLinks.first()).toHaveAttribute('href', '/asset-allocation-explained.html');
  });

  test('[AUTO] emergency-fund question is aligned to the owned should-you-have intent', async ({ page }) => {
    await gotoClean(page, '/emergency-fund-how-much.html');
    await expect(page).toHaveTitle('How Much Emergency Fund Should You Have? | Carrowmont');
    await expect(page.locator('main h1')).toHaveText('How much emergency fund should you have?');
    const structuredData = await page.locator('script[type="application/ld+json"]').first().evaluate((node) => JSON.parse(node.textContent || '{}'));
    const graph = Array.isArray(structuredData['@graph']) ? structuredData['@graph'] : [structuredData];
    const article = graph.find((node) => node['@type'] === 'Article');
    expect(article?.headline).toBe('How much emergency fund should you have?');
  });

  test('[AUTO] monthly investment guide asks the observed question while retaining Goal Planner handoff', async ({ page }) => {
    await gotoClean(page, '/how-much-should-i-invest-each-month.html');
    await expect(page).toHaveTitle('How Much Should You Invest Each Month? | Carrowmont');
    await expect(page.locator('main h1')).toHaveText('How much should you invest each month to reach a financial goal?');
    await expect(page.locator('.guide-action-first a[href="/goal-planner/"]')).toBeVisible();
    await expect(page.locator('title')).not.toContainText('Calculator');
  });

  test('[AUTO] GSEO1E Learn refinements remain mobile-safe at 390px and 360px', async ({ page }) => {
    for (const width of [390, 360]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of CASES) {
        await gotoClean(page, path);
        await assertNoHorizontalOverflow(page, `${width}px GSEO1E ${path}`);
      }
    }
  });
});
