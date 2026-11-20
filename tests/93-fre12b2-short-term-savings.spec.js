import { test, expect } from '@playwright/test';
import { gotoClean, assertNoHorizontalOverflow, monitorPageErrors } from '../helpers/common.js';

const TOOL = '/emergency-fund-runway-calculator.html';
const ANCHOR = TOOL + '#short-term-savings-comparison';
const GUIDE = '/where-to-keep-short-term-savings.html';

async function fillComparison(page, overrides = {}) {
  const values = {
    stsAmountNow: '100000', stsGoalAmount: '110000', stsHorizonMonths: '12',
    stsInstantAccessAmount: '20000', stsMonthlyContribution: '500', stsSavingsRatePct: '3',
    stsTermRatePct: '4', stsTermMonths: '12', stsFundYieldPct: '3.5',
    stsGovernmentYieldPct: '3.8', stsGovernmentTermMonths: '12', ...overrides
  };
  for (const [id, value] of Object.entries(values)) await page.locator('#' + id).fill(value);
  await page.locator('#stsCalculateBtn').click();
}

function numberFromMoney(text) {
  const normalized = String(text || '').replace(/[^0-9.\-]/g, '');
  return Number(normalized);
}

test.describe('FRE12B-2 Short-Term Savings Comparison', () => {
  test('[AUTO] focused deep link preserves the existing Emergency Fund tool and opens the new comparison', async ({page}) => {
    const errors = monitorPageErrors(page);
    await gotoClean(page, ANCHOR);
    await expect(page.locator('h1')).toContainText('essential spending');
    await expect(page.locator('#short-term-savings-comparison')).toBeVisible();
    await expect(page.locator('#stsHeading')).toContainText('near-term money');
    await expect(page.locator('#calculateBtn')).toBeVisible();
    await expect(page.locator('#stsCalculateBtn')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('[AUTO] deterministic example compares all four options without turning the highest scenario into advice', async ({page}) => {
    await gotoClean(page, ANCHOR);
    await fillComparison(page);
    expect(numberFromMoney(await page.locator('#stsSavingsValue').innerText())).toBeCloseTo(109124.79, 0);
    expect(numberFromMoney(await page.locator('#stsTermValue').innerText())).toBeCloseTo(109950.83, 0);
    expect(numberFromMoney(await page.locator('#stsFundValue').innerText())).toBeCloseTo(109536.87, 0);
    expect(numberFromMoney(await page.locator('#stsGovernmentValue').innerText())).toBeCloseTo(109785.02, 0);
    await expect(page.locator('#stsDecisionText')).toContainText('highest modeled ending value');
    await expect(page.locator('#stsDecisionText')).toContainText('not a recommendation or guarantee');
    await expect(page.locator('#stsFundStatus')).toContainText('Check risk');
  });

  test('[AUTO] maturity after the goal is visibly rejected instead of assuming an early sale', async ({page}) => {
    await gotoClean(page, ANCHOR);
    await fillComparison(page, {stsTermMonths:'24', stsGovernmentTermMonths:'24'});
    await expect(page.locator('#stsTermStatus')).toContainText('Maturity mismatch');
    await expect(page.locator('#stsTermValue')).toHaveText('-');
    await expect(page.locator('#stsGovernmentStatus')).toContainText('Maturity mismatch');
    await expect(page.locator('#stsGovernmentValue')).toHaveText('-');
    await expect(page.locator('#stsWarnings')).toContainText('matures after the goal date');
    await expect(page.locator('#stsWarnings')).toContainText('selling before maturity');
  });

  test('[AUTO] country terminology changes labels without converting the entered amounts', async ({page}) => {
    await gotoClean(page, ANCHOR);
    await page.locator('#stsAmountNow').fill('123456');
    await page.evaluate(() => window.CarrowmontLocale.setRegion('IN'));
    await expect(page.locator('#stsTermTitle')).toContainText('Fixed deposit (FD)');
    await expect(page.locator('#stsAmountNow')).toHaveValue('123456');
    await page.evaluate(() => window.CarrowmontLocale.setRegion('US'));
    await expect(page.locator('#stsTermTitle')).toContainText('Certificate of deposit (CD)');
    await expect(page.locator('#stsAmountNow')).toHaveValue('123456');
  });

  test('[AUTO] Tools and Learn discover the existing anchored decision while public tool count stays 23', async ({page}) => {
    await gotoClean(page, '/tools.html');
    await expect(page.locator('.directory-tool-card')).toHaveCount(23);
    await expect(page.locator('[data-secondary-tool="emergency-fund-runway"] a[href="'+ANCHOR+'"]')).toHaveCount(1);
    await gotoClean(page, GUIDE);
    await expect(page.locator('.guide-action-first a[href="'+ANCHOR+'"]')).toBeVisible();
    await expect(page.locator('.guide-action-first')).toContainText('does not fetch live rates');
  });

  test('[AUTO] mobile comparison is overflow-safe and entered financial values are not stored', async ({page}) => {
    await page.setViewportSize({width:360,height:780});
    await gotoClean(page, ANCHOR);
    await fillComparison(page, {stsAmountNow:'987654', stsGoalAmount:'999999'});
    await assertNoHorizontalOverflow(page, 'FRE12B-2 mobile comparison');
    const stored = await page.evaluate(() => JSON.stringify({local:{...localStorage},session:{...sessionStorage}}));
    expect(stored).not.toContain('987654');
    expect(stored).not.toContain('999999');
  });
});
