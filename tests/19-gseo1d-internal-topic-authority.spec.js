import { test, expect } from '@playwright/test';
import { gotoClean, assertNoHorizontalOverflow } from '../helpers/common.js';

const TOPIC_TOOL_CASES = [
  { category: 'investment', href: '/sip-calculator/' },
  { category: 'retirement', href: '/retirement-calculator/planner.html' },
  { category: 'budget', href: '/budget-cash-flow-planner/' },
  { category: 'goals', href: '/goal-planner/' },
  { category: 'fi', href: '/financial-independence/' },
  { category: 'inflation', href: '/inflation-calculator/' },
  { category: 'home', href: '/mortgage-payoff-calculator/decision-centre.html' }
];

test.describe('GSEO1D internal topic authority', () => {
  test('[AUTO] Learn hub exposes exactly one contextual primary-tool path for each mapped planning cluster', async ({ page }) => {
    await gotoClean(page, '/learn.html');
    await expect(page.locator('[data-cm-topic-tool]')).toHaveCount(7);

    for (const item of TOPIC_TOOL_CASES) {
      const category = page.locator(`[data-category="${item.category}"]`);
      await expect(category).toHaveCount(1);
      await expect(category.locator('[data-cm-topic-tool]')).toHaveCount(1);
      await expect(category.locator(`.category-tool-link[href="${item.href}"]`)).toBeVisible();
    }

    await expect(page.locator('[data-category="assets"] [data-cm-topic-tool]')).toHaveCount(0);
    await expect(page.locator('[data-category="foundation"] [data-cm-topic-tool]')).toHaveCount(0);
  });

  test('[AUTO] Mortgage Decision Centre and explainer stay bidirectionally connected', async ({ page }) => {
    await gotoClean(page, '/learn.html#home-loans');
    await expect(page.locator('[data-category="home"] a[href="/mortgage-payoff-calculator/decision-centre.html"]')).toBeVisible();

    await gotoClean(page, '/mortgage-payoff-calculator/decision-centre.html');
    await expect(page.locator('a[data-cm-topic-learn="prepay-vs-invest"][href="/mortgage-prepayment-vs-investing.html"]')).toBeVisible();

    await gotoClean(page, '/mortgage-prepayment-vs-investing.html');
    await expect(page.locator('.guide-index a[href="/mortgage-payoff-calculator/decision-centre.html"]')).toBeVisible();
  });

  test('[AUTO] GSEO1D contextual links remain mobile-safe at 390px and 360px', async ({ page }) => {
    for (const width of [390, 360]) {
      await page.setViewportSize({ width, height: 900 });
      await gotoClean(page, '/learn.html');
      await assertNoHorizontalOverflow(page, `${width}px GSEO1D Learn hub topic owners`);
      await expect(page.locator('[data-cm-topic-tool]')).toHaveCount(7);

      await gotoClean(page, '/mortgage-payoff-calculator/decision-centre.html');
      await assertNoHorizontalOverflow(page, `${width}px GSEO1D Mortgage Decision Centre Learn link`);
      await expect(page.locator('a[data-cm-topic-learn="prepay-vs-invest"]')).toBeVisible();
    }
  });
});
