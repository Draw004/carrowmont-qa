import { test, expect } from '@playwright/test';
import { gotoClean, assertNoHorizontalOverflow } from '../helpers/common.js';

const TOPIC_TOOL_CASES = [
  { category: 'investment', href: '/sip-calculator/' },
  { category: 'retirement', href: '/retirement-calculator/' },
  { category: 'budget', href: '/budget-cash-flow-planner/' },
  { category: 'goals', href: '/goal-planner/' },
  { category: 'fi', href: '/financial-independence/' },
  { category: 'inflation', href: '/inflation-calculator/' },
  { category: 'home', href: '/mortgage-payoff-calculator/decision-centre.html' },
  { category: 'loans', href: '/loan-calculator/' }
];

test.describe('GSEO1D internal topic authority', () => {
  test('[AUTO] Learn hub exposes exactly one contextual primary-tool path for each mapped planning cluster', async ({ page }) => {
    await gotoClean(page, '/learn.html');
    await expect(page.locator('body')).toHaveClass(/learn-hub2-ready/);
    const related = page.locator('#learn2RelatedTool');

    for (const item of TOPIC_TOOL_CASES) {
      await page.locator(`[data-learn-topic="${item.category}"]`).click();
      await expect(related).toBeVisible();
      await expect(related.locator('a')).toHaveCount(1);
      await expect(related.locator('a')).toHaveAttribute('href', item.href);
      await expect(page.locator(`.planning-categories [data-category="${item.category}"] .category-tool-link[href="${item.href}"]`)).toHaveCount(1);
    }

    for (const category of ['assets','foundation']) {
      await page.locator(`[data-learn-topic="${category}"]`).click();
      await expect(related).toBeHidden();
      await expect(related.locator('a')).toHaveCount(0);
    }
  });

  test('[AUTO] Mortgage Decision Centre and explainer stay bidirectionally connected', async ({ page }) => {
    await gotoClean(page, '/learn.html#home-loans');
    await expect(page.locator('body')).toHaveClass(/learn-hub2-ready/);
    await expect(page.locator('[data-learn-topic="home"]')).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('#learn2RelatedTool a')).toHaveAttribute('href','/mortgage-payoff-calculator/decision-centre.html');

    await gotoClean(page, '/mortgage-payoff-calculator/decision-centre.html');
    await expect(page.locator('a[data-cm-topic-learn="prepay-vs-invest"][href="/mortgage-prepayment-vs-investing.html"]')).toBeVisible();

    await gotoClean(page, '/mortgage-prepayment-vs-investing.html');
    await expect(page.locator('.guide-index a[href="/mortgage-payoff-calculator/decision-centre.html"]')).toBeVisible();
  });

  test('[AUTO] GSEO1D contextual links remain mobile-safe at 390px and 360px', async ({ page }) => {
    for (const width of [390, 360]) {
      await page.setViewportSize({ width, height: 900 });
      await gotoClean(page, '/learn.html#home-loans');
      await expect(page.locator('body')).toHaveClass(/learn-hub2-ready/);
      await assertNoHorizontalOverflow(page, `${width}px GSEO1D Learn hub topic owners`);
      await expect(page.locator('[data-learn-topic="home"]')).toHaveAttribute('aria-pressed','true');
      await expect(page.locator('#learn2RelatedTool a')).toHaveAttribute('href','/mortgage-payoff-calculator/decision-centre.html');

      await gotoClean(page, '/mortgage-payoff-calculator/decision-centre.html');
      await assertNoHorizontalOverflow(page, `${width}px GSEO1D Mortgage Decision Centre Learn link`);
      await expect(page.locator('a[data-cm-topic-learn="prepay-vs-invest"]')).toBeVisible();
    }
  });
});
