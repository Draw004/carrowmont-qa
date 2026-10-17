import { test, expect } from '@playwright/test';
import {
  gotoClean,
  monitorPageErrors,
  assertNoHorizontalOverflow,
  setInput,
  validatePdfDownload
} from '../helpers/common.js';

const PATH = '/retirement-calculator/withdrawal-calculator.html';

async function calculate(page, input) {
  return page.evaluate(input => window.CarrowmontWithdrawalCore.calculate(input), input);
}

async function setLocale(page, region, currency) {
  await expect.poll(() => page.evaluate(() => Boolean(window.CarrowmontLocale?.setLocale)), { timeout: 10000 }).toBe(true);
  await page.evaluate(({ region, currency }) => window.CarrowmontLocale.setLocale(region, currency), { region, currency });
  await expect.poll(() => page.evaluate(() => ({
    region: window.CarrowmontLocale?.getRegion?.(),
    currency: window.CarrowmontLocale?.getCurrency?.()
  })), { timeout: 10000 }).toEqual({ region, currency });
}

const RUNWAY_ZERO = {
  mode: 'runway',
  startingBalance: 12000,
  startingWithdrawal: 1000,
  annualReturn: 0,
  inflationLinked: false,
  withdrawalGrowth: 0,
  timing: 'beginning',
  maxMonths: 1200,
  startAge: 60,
  useAge: false,
  targetMonths: 360,
  targetEndingBalance: 0
};

const SUPPORT_30Y = {
  mode: 'support',
  startingBalance: 1000000,
  startingWithdrawal: 0,
  annualReturn: 6,
  inflationLinked: false,
  withdrawalGrowth: 0,
  timing: 'beginning',
  targetMonths: 360,
  startAge: 60,
  useAge: false,
  targetEndingBalance: 0
};

test.describe('RETIRE1 Retirement Withdrawal / Drawdown / SWP Calculator', () => {
  test('[AUTO] canonical identity, indexability and required controls are present', async ({ page }) => {
    const errors = monitorPageErrors(page);
    await gotoClean(page, PATH);

    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('See how withdrawals, returns and inflation can change how long retirement savings may last.');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://carrowmont.com/retirement-calculator/withdrawal-calculator.html');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index,follow');
    await expect(page).toHaveTitle('Retirement Withdrawal & Drawdown Calculator | Carrowmont');

    for (const selector of [
      '#runwayModeBtn','#supportModeBtn','#startingBalance','#startingWithdrawal','#annualReturn',
      '#inflationToggle','#withdrawalGrowth','#startAge','#targetYears','#targetAge','#targetEndingBalance',
      '#timing','#maxYears','#withdrawalBalanceChart','#sensitivityGrid','#annualScheduleBody',
      '#copyBtn','#csvBtn','#reportBtn'
    ]) await expect(page.locator(selector), selector).toHaveCount(1);

    await expect(page.getByRole('heading', { name: 'Return sensitivity — not a forecast', exact: true })).toBeVisible();
    await expect(page.getByText('Constant-return illustration, not a forecast.', { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('[AUTO] monthly engine handles zero return, effective annual conversion and annual withdrawal steps', async ({ page }) => {
    await gotoClean(page, PATH);

    const zero = await calculate(page, RUNWAY_ZERO);
    expect(zero.ok).toBe(true);
    expect(zero.result.depleted).toBe(true);
    expect(zero.result.depletionMonth).toBe(12);
    expect(zero.result.totalWithdrawals).toBeCloseTo(12000, 8);
    expect(zero.result.endingBalance).toBeCloseTo(0, 8);

    const rate = await page.evaluate(() => window.CarrowmontWithdrawalCore.monthlyRate(12));
    expect(rate).toBeCloseTo(Math.pow(1.12, 1 / 12) - 1, 12);

    const stepped = await page.evaluate(() => window.CarrowmontWithdrawalCore.simulate({
      mode: 'runway', startingBalance: 50000, startingWithdrawal: 1000,
      annualReturn: 0, inflationLinked: true, withdrawalGrowth: 10,
      timing: 'beginning', maxMonths: 24, startAge: 60, horizonMonths: 24
    }));
    expect(stepped.schedule[0].plannedWithdrawal).toBeCloseTo(1000, 8);
    expect(stepped.schedule[11].plannedWithdrawal).toBeCloseTo(1000, 8);
    expect(stepped.schedule[12].plannedWithdrawal).toBeCloseTo(1100, 8);
    expect(stepped.annualSummary).toHaveLength(2);
  });

  test('[AUTO] reverse solve reuses forward engine and supports target ending balance and timing', async ({ page }) => {
    await gotoClean(page, PATH);

    const zero = await calculate(page, {
      ...SUPPORT_30Y,
      startingBalance: 120000,
      annualReturn: 0,
      targetMonths: 120
    });
    expect(zero.ok).toBe(true);
    expect(zero.startingWithdrawal).toBeCloseTo(1000, 6);
    expect(zero.result.endingBalance).toBeLessThan(0.01);

    const beginning = await calculate(page, SUPPORT_30Y);
    const end = await calculate(page, { ...SUPPORT_30Y, timing: 'end' });
    expect(beginning.ok).toBe(true);
    expect(beginning.startingWithdrawal).toBeCloseTo(5865.15523025865, 6);
    expect(end.startingWithdrawal).toBeGreaterThan(beginning.startingWithdrawal);

    const preserve = await calculate(page, { ...SUPPORT_30Y, targetEndingBalance: 250000 });
    expect(preserve.ok).toBe(true);
    expect(preserve.startingWithdrawal).toBeLessThan(beginning.startingWithdrawal);
    expect(preserve.result.endingBalance).toBeCloseTo(250000, 2);
  });

  test('[AUTO] negative returns and return sensitivity are modelled without forecast language', async ({ page }) => {
    await gotoClean(page, PATH);
    const result = await calculate(page, {
      ...RUNWAY_ZERO,
      startingBalance: 1000000,
      startingWithdrawal: 5000,
      annualReturn: 6,
      maxMonths: 600
    });
    expect(result.ok).toBe(true);
    expect(result.sensitivity.map(x => x.annualReturn)).toEqual([4, 6, 8]);
    expect(result.sensitivity[0].result.depletionMonth).toBe(324);
    expect(result.sensitivity[1].result.depleted).toBe(false);

    const negative = await calculate(page, { ...RUNWAY_ZERO, startingBalance: 100000, startingWithdrawal: 1000, annualReturn: -5, maxMonths: 240 });
    expect(negative.ok).toBe(true);
    expect(negative.result.depletionMonth).toBeGreaterThan(0);
    await expect(page.getByRole('heading', { name: 'Return sensitivity — not a forecast', exact: true })).toBeVisible();
  });

  test('[AUTO] UI switches between runway and reverse-solve modes with chart, sensitivity and annual schedule', async ({ page }) => {
    const errors = monitorPageErrors(page);
    await gotoClean(page, PATH);

    await setInput(page, '#startingBalance', 12000);
    await setInput(page, '#startingWithdrawal', 1000);
    await setInput(page, '#annualReturn', 0);
    await page.locator('#inflationToggle').uncheck();
    await expect(page.locator('#primaryResultValue')).toHaveText('1 year');
    await expect(page.locator('#withdrawalBalanceChart svg')).toHaveCount(1);
    await expect(page.locator('#sensitivityGrid .sensitivity-card')).toHaveCount(3);
    await expect(page.locator('#annualScheduleBody tr')).toHaveCount(1);

    await page.locator('#supportModeBtn').click();
    await expect(page.locator('#supportFields')).toBeVisible();
    await expect(page.locator('#startingWithdrawalField')).toBeHidden();
    await setInput(page, '#startingBalance', 120000);
    await setInput(page, '#targetYears', 10);
    await setInput(page, '#annualReturn', 0);
    await setInput(page, '#targetEndingBalance', 0);
    await expect(page.locator('#primaryResultTitle')).toHaveText('Modelled starting withdrawal');
    await expect(page.locator('#primaryResultValue')).toContainText('1,000');

    await page.locator('input[name="horizonMode"][value="age"]').check();
    await expect(page.locator('#targetAgeField')).toBeVisible();
    await expect(page.locator('#targetYearsField')).toBeHidden();
    await setInput(page, '#startAge', 60);
    await setInput(page, '#targetAge', 70);
    await expect(page.locator('#primaryResultSub')).toContainText('to age 70');
    expect(errors).toEqual([]);
  });

  test('[AUTO] country controls SWP, drawdown and withdrawal terminology while currency alone does not change math', async ({ page }) => {
    await gotoClean(page, PATH);
    const base = { ...SUPPORT_30Y };

    await setLocale(page, 'IN', 'INR');
    await expect(page.locator('#productLabel')).toHaveText('Retirement SWP / Withdrawal Calculator');
    const india = (await calculate(page, base)).startingWithdrawal;

    await setLocale(page, 'US', 'USD');
    await expect(page.locator('#productLabel')).toHaveText('Retirement Withdrawal Calculator');
    const us = (await calculate(page, base)).startingWithdrawal;

    await setLocale(page, 'GB', 'GBP');
    await expect(page.locator('#productLabel')).toHaveText('Retirement Drawdown Calculator');
    await setLocale(page, 'IE', 'EUR');
    await expect(page.locator('#productLabel')).toHaveText('Retirement Drawdown Calculator');
    await setLocale(page, 'AU', 'AUD');
    await expect(page.locator('#productLabel')).toHaveText('Retirement Withdrawal Calculator');
    await setLocale(page, 'OTHER', 'EUR');
    await expect(page.locator('#productLabel')).toHaveText('Retirement Withdrawal & Drawdown Calculator');
    const other = (await calculate(page, base)).startingWithdrawal;

    expect(us).toBeCloseTo(india, 10);
    expect(other).toBeCloseTo(india, 10);
  });

  test('[AUTO] Retirement Planner handoff stages both balances for explicit review and keeps financial values out of the URL', async ({ page }) => {
    const errors = monitorPageErrors(page);
    await gotoClean(page, '/retirement-calculator/planner.html');

    // A clean Chromium profile resolves to a non-India locale, and the established
    // Retirement Planner intentionally starts non-India monetary inputs at zero.
    // Build a real calculated planner state before testing the handoff; otherwise
    // the anchor correctly navigates as a normal link with no values to stage.
    await setLocale(page, 'US', 'USD');
    await setInput(page, '#currentSavings', 500000);
    await setInput(page, '#currentMonthlyInvestment', 2000);
    await setInput(page, '#quickMonthlyExpense', 6000);
    await expect(page.locator('#projectedCorpus')).not.toHaveText('—');
    await expect(page.locator('#requiredCorpus')).not.toHaveText('—');
    await expect(page.locator('#withdrawalPlannerBtn')).toBeVisible();

    await page.locator('#withdrawalPlannerBtn').click();
    await page.waitForURL(/withdrawal-calculator\.html$/);
    const url = new URL(page.url());
    expect(url.pathname).toBe('/retirement-calculator/withdrawal-calculator.html');
    expect(url.search).toBe('');
    expect(url.hash).toBe('');
    expect(url.search).not.toMatch(/balance|corpus|income|spending|return|inflation|amount|value/i);

    const panel = page.locator('#retirementImportPanel');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('values are staged for review');
    const projectedVisible = await page.locator('#useProjectedImport').isVisible();
    const targetVisible = await page.locator('#useTargetImport').isVisible();
    expect(projectedVisible || targetVisible).toBe(true);

    const before = await page.locator('#startingBalance').inputValue();
    if (projectedVisible) await page.locator('#useProjectedImport').click();
    else await page.locator('#useTargetImport').click();
    await expect(panel).toBeHidden();
    expect(await page.locator('#startingBalance').inputValue()).not.toBe(before);
    expect(errors).toEqual([]);
  });

  test('[AUTO] Copy Summary, CSV and five-page PDF report use the current result', async ({ page }) => {
    await gotoClean(page, PATH);
    await setLocale(page, 'US', 'USD');
    await expect(page.locator('#primaryResultValue')).not.toHaveText('—');

    await page.locator('#copyBtn').click();
    await expect(page.locator('#copyStatus')).toContainText(/copied|unavailable/i);

    const csvDownload = page.waitForEvent('download');
    await page.locator('#csvBtn').click();
    const csv = await csvDownload;
    expect(csv.suggestedFilename()).toBe('carrowmont-retirement-withdrawal-schedule.csv');

    const pdfDownload = page.waitForEvent('download', { timeout: 30000 });
    await page.locator('#reportBtn').click();
    const pdf = await pdfDownload;
    const info = await validatePdfDownload(pdf, 5);
    expect(info.pages).toBeGreaterThanOrEqual(5);
    await expect(page.locator('#reportDownloadStatus')).toHaveText('Report has been downloaded.', { timeout: 30000 });
  });

  test('[AUTO] Tools Hub, Learn journeys and sitemap expose one crawlable canonical RETIRE1 route', async ({ page, request }) => {
    await gotoClean(page, '/tools.html');
    const card = page.locator('[data-secondary-tool="retirement-withdrawal"]');
    await expect(card).toHaveCount(1);
    await expect(card.locator('a')).toHaveAttribute('href', PATH);

    await gotoClean(page, '/how-long-will-retirement-savings-last.html');
    await expect(page.locator(`a[href="${PATH}"]`).first()).toBeVisible();
    await gotoClean(page, '/sequence-of-returns-risk.html');
    await expect(page.locator(`a[href="${PATH}"]`).first()).toBeVisible();

    const sitemap = await (await request.get('/sitemap.xml')).text();
    expect((sitemap.match(/https:\/\/carrowmont\.com\/retirement-calculator\/withdrawal-calculator\.html/g) || []).length).toBe(1);
  });

  test('[AUTO] compact footer stays at five localized gateways instead of growing with every calculator', async ({ page }) => {
    for (const entry of [
      { path: '/', region: 'IN', currency: 'INR', housing: 'Home Loan', investment: 'SIP Calculator' },
      { path: '/loan-calculator/', region: 'US', currency: 'USD', housing: 'Mortgage', investment: 'Recurring Investment Calculator' },
      { path: PATH, region: 'OTHER', currency: 'EUR', housing: 'Mortgage & Home Loan', investment: 'Recurring Investment Calculator' }
    ]) {
      await gotoClean(page, entry.path);
      await setLocale(page, entry.region, entry.currency);
      const toolsCol = page.locator('.site-footer .footer-col[data-cm-compact-tools="1"]');
      await expect(toolsCol).toHaveCount(1);
      const links = toolsCol.locator(':scope > a');
      await expect(links).toHaveCount(5);
      await expect(links.nth(0)).toHaveText('All financial tools');
      await expect(links.nth(1)).toHaveText(entry.investment);
      await expect(links.nth(2)).toHaveText('Retirement Planner');
      await expect(links.nth(3)).toHaveText(entry.housing);
      await expect(links.nth(4)).toHaveText('Budget & Cash Flow Planner');
      await expect(toolsCol).not.toContainText('Loan / EMI');
      await expect(toolsCol).not.toContainText('Compound Interest');
    }
  });

  test('[AUTO] calculator has no page-level horizontal overflow at [1280, 390, 360]', async ({ page }) => {
    for (const width of [1280, 390, 360]) {
      await page.setViewportSize({ width, height: 900 });
      await gotoClean(page, PATH);
      await assertNoHorizontalOverflow(page, `${width}px RETIRE1`);
      await expect(page.locator('#reportBtn')).toBeVisible();
      const height = await page.locator('#reportBtn').evaluate(el => el.getBoundingClientRect().height);
      expect(height).toBeGreaterThanOrEqual(40);
      await expect(page.locator('#withdrawalBalanceChart svg')).toHaveCount(1);
    }
  });
});
