import { test, expect } from '@playwright/test';
import { gotoClean, assertNoHorizontalOverflow } from '../helpers/common.js';

const CASES = [
  {
    name: 'SIP / Recurring Investment', path: '/sip-calculator/', primary: '/compound-interest-monthly-contributions.html',
    related: ['/starting-investing-earlier.html','/step-up-sip-vs-regular-sip.html','/investment-time-to-target.html'], toolHref: '/sip-calculator/'
  },
  {
    name: 'Goal Planner', path: '/goal-planner/', primary: '/savings-goal-planning.html',
    related: ['/how-much-should-i-invest-each-month.html','/planning-life-goals.html','/emergency-fund-how-much.html'], toolHref: '/goal-planner/'
  },
  {
    name: 'Financial Independence', path: '/financial-independence/', primary: '/when-can-i-reach-financial-independence.html',
    related: ['/coast-fire-explained.html','/longevity-risk-retirement.html','/diversification-across-asset-classes.html'], toolHref: '/financial-independence/'
  },
  {
    name: 'Inflation Calculator', path: '/inflation-calculator/', primary: '/inflation-value-of-money-over-time.html',
    related: ['/future-cost-of-expenses.html','/inflation-purchasing-power-savings.html','/todays-money-vs-future-money.html'], toolHref: '/inflation-calculator/'
  },
  {
    name: 'Retirement Planner', path: '/retirement-calculator/planner.html', primary: '/how-much-money-do-i-need-to-retire.html',
    related: ['/retirement-expenses.html','/how-long-will-retirement-savings-last.html','/inflation-and-retirement-planning.html'], toolHref: '/retirement-calculator/'
  },
  {
    name: 'Budget & Cash Flow Planner', path: '/budget-cash-flow-planner/', primary: '/cash-flow-vs-income.html',
    related: ['/budgeting-by-pay-frequency.html','/budgeting-with-irregular-income.html','/sinking-fund-vs-emergency-fund.html'], toolHref: '/budget-cash-flow-planner/'
  }
];

test.describe('CORE6 Tool <-> Learn Integration V1', () => {
  test('[AUTO] each remaining core tool exposes a primary Learn bridge and a contextual result guide set', async ({ page }) => {
    for (const item of CASES) {
      await gotoClean(page, item.path);
      const bridge = page.locator('[data-cm-tool-learn="primary"]');
      await expect(bridge, `${item.name} primary Learn bridge`).toBeVisible();
      await expect(bridge.locator(`a[href="${item.primary}"]`)).toBeVisible();
      await expect(bridge.locator('a[href="/learn.html"]')).toBeVisible();
      const result = page.locator('[data-cm-tool-learn="result"]');
      await expect(result, `${item.name} result Learn card`).toBeVisible();
      for (const href of item.related) await expect(result.locator(`a[href="${href}"]`)).toBeVisible();
    }
  });

  test('[AUTO] selected Learn guides return to the same core tool at the top and through the shared bottom CTA', async ({ page }) => {
    for (const item of CASES) {
      for (const guide of [item.primary, ...item.related]) {
        await gotoClean(page, guide);
        await expect(page.locator(`.guide-action-first a[href="${item.toolHref}"]`), `${guide} top tool CTA`).toBeVisible();
        await expect(page.locator(`.learn-tool-return a[href="${item.toolHref}"]`), `${guide} bottom tool CTA`).toBeVisible();
      }
    }
  });

  test('[AUTO] Retirement landing page also exposes the primary learning path before planner entry', async ({ page }) => {
    await gotoClean(page, '/retirement-calculator/');
    const bridge = page.locator('[data-cm-tool-learn="primary"]');
    await expect(bridge).toBeVisible();
    await expect(bridge.locator('a[href="/how-much-money-do-i-need-to-retire.html"]')).toBeVisible();
  });

  test('[AUTO] CORE6 education cards remain mobile-safe at 390px and 360px', async ({ page }) => {
    for (const width of [390, 360]) {
      await page.setViewportSize({ width, height: 900 });
      for (const item of CASES) {
        await gotoClean(page, item.path);
        await assertNoHorizontalOverflow(page, `${width}px ${item.name} Tool-Learn integration`);
        await expect(page.locator('[data-cm-tool-learn="primary"]')).toBeVisible();
      }
    }
  });
});
