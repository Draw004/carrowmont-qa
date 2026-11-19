import { test, expect } from '@playwright/test';
import { gotoClean, assertNoHorizontalOverflow, monitorPageErrors } from '../helpers/common.js';

const TOOL = '/budget-cash-flow-planner/credit-card-payoff-calculator.html';
const GUIDE = '/balance-transfer-credit-card.html';

test.describe('FRE12B-1 Balance Transfer Decision (existing Credit Card Payoff tool)', () => {
  test('[AUTO] deep link opens the optional comparison without replacing existing payoff functionality', async ({ page }) => {
    const errors = monitorPageErrors(page);
    await gotoClean(page, TOOL + '#balance-transfer');
    await expect(page.locator('h1')).toContainText('credit-card payoff and balance-transfer choices');
    await expect(page.locator('#tab-transfer')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#btForm')).toBeVisible();
    await expect(page.locator('#btSummary')).toContainText('transferring costs less');
    await expect(page.locator('#btSavings')).toContainText('less with transfer');
    await expect(page.locator('#minimumInterest')).not.toHaveText('—');
    await expect(page.locator('#btPromoBalance')).not.toHaveText('—');
    await expect(page.locator('#btPromoPayment')).not.toHaveText('—');
    await expect(page.locator('#reportBtn')).toBeEnabled();
    expect(errors).toEqual([]);
  });

  test('[AUTO] expensive transfer never claims a saving and leaves account state untouched', async ({ page }) => {
    await gotoClean(page, TOOL + '#balance-transfer');
    await page.locator('#btBalance').fill('1200');
    await page.locator('#btCurrentApr').fill('0');
    await page.locator('#btIntroApr').fill('0');
    await page.locator('#btPostApr').fill('0');
    await page.locator('#btFeePct').fill('3');
    await page.locator('#btPayment').fill('100');
    await page.locator('#btCompare').click();
    await expect(page.locator('#btSummary')).toContainText('keeping your current card costs less');
    await expect(page.locator('#btSavings')).toContainText('more with transfer');
    const stored = await page.evaluate(() => JSON.stringify({local:{...localStorage},session:{...sessionStorage}}));
    expect(stored).not.toContain('1200');
  });

  test('[AUTO] validation blocks incomplete or impossible assumptions before comparing', async ({ page }) => {
    await gotoClean(page, TOOL + '#balance-transfer');
    await page.locator('#btBalance').fill('');
    await page.locator('#btCompare').click();
    await expect(page.locator('#btError')).toBeVisible();
    await expect(page.locator('#btError')).toContainText('positive balance');
    await expect(page.locator('#btSavings')).toHaveText('—');
    await page.locator('#btBalance').fill('1200');
    await page.locator('#btIntroMonths').fill('2.5');
    await page.locator('#btCompare').click();
    await expect(page.locator('#btError')).toContainText('whole months');
  });

  test('[AUTO] mobile layout and input controls are overflow-safe at 360px', async ({ page }) => {
    await page.setViewportSize({width:360,height:780});
    await gotoClean(page, TOOL + '#balance-transfer');
    await expect(page.locator('#btForm')).toBeVisible();
    await assertNoHorizontalOverflow(page, 'FRE12B-1 mobile expanded comparison');
    await page.locator('#btFeeTreatment').selectOption('upfront');
    await page.locator('#btCompare').click();
    await expect(page.locator('#btWarnings')).toContainText('extra cash now');
    await assertNoHorizontalOverflow(page, 'FRE12B-1 mobile results');
  });

  test('[AUTO] Learn and Tools link to the established calculator; public sitemap remains unchanged', async ({page,request}) => {
    await gotoClean(page, GUIDE);
    await expect(page.locator('a[href="'+TOOL+'#balance-transfer"]').first()).toBeVisible();
    await gotoClean(page, '/tools.html');
    await expect(page.locator('[data-secondary-tool="credit-card-payoff-comparison"] a[href="'+TOOL+'#balance-transfer"]')).toHaveCount(1);
    await expect(page.locator('.directory-tool-card')).toHaveCount(23);
    const sitemap = await (await request.get('/sitemap.xml')).text();
    expect(sitemap).not.toContain('balance-transfer-decision.html');
  });
});
