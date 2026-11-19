import { test, expect } from '@playwright/test';
import { gotoClean, assertNoHorizontalOverflow } from '../helpers/common.js';

// Real-browser fidelity checks complement the no-dependency release standards gate.
test.describe('Development standards - canonical locale controls', () => {
  test('[AUTO] main Home exposes the approved visible globe and dropdown chevron', async ({ page }) => {
    await gotoClean(page, '/');
    const summary = page.locator('.site-header .locale-summary').first();
    await expect(summary).toBeVisible();
    await expect(summary.locator('.locale-icon svg')).toHaveCount(1);
    await expect(summary.locator('.chevron svg')).toHaveCount(1);
    await expect(summary).toHaveAttribute('aria-label', 'Choose country and currency');
  });

  test('[AUTO] canonical Debt Payoff tool shows globe, country/currency and chevron', async ({ page }) => {
    await gotoClean(page, '/budget-cash-flow-planner/debt-payoff-calculator.html');
    const summary = page.locator('#localeSummary');
    await expect(summary).toBeVisible();
    await expect(summary.locator('.locale-globe svg')).toHaveCount(1);
    await expect(summary.locator('.locale-chevron svg')).toHaveCount(1);
    await expect(page.locator('#localeCurrent')).not.toBeEmpty();
    await expect(summary).toHaveAttribute('aria-label', 'Choose country and currency');
    await expect(page.locator('header.site-header nav.top-nav a[href="/tools.html"]')).toHaveCount(1);
    await expect(page.locator('header.site-header nav.top-nav a[href="/"]')).toHaveCount(1);
  });

  test('[AUTO] canonical tool locale header remains usable at 360px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await gotoClean(page, '/budget-cash-flow-planner/debt-payoff-calculator.html');
    await expect(page.locator('#localeSummary')).toBeVisible();
    await assertNoHorizontalOverflow(page, 'canonical locale header at 360px');
  });
});
