import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { gotoClean, setInput, assertNoHorizontalOverflow } from '../helpers/common.js';

const PATH = '/mortgage-payoff-calculator/';

async function setLocale(page, region, currency) {
  await expect.poll(() => page.evaluate(() => Boolean(window.CarrowmontLocale?.setLocale))).toBe(true);
  await page.evaluate(({ region, currency }) => window.CarrowmontLocale.setLocale(region, currency), { region, currency });
  await expect.poll(() => page.evaluate(() => ({ region: window.CarrowmontLocale.getRegion(), currency: window.CarrowmontLocale.getCurrency() }))).toEqual({ region, currency });
}

async function coreCalculate(page, input) {
  return page.evaluate(input => window.CarrowmontMortgageCore.calculate(input), input);
}

async function chooseMode(page, mode) {
  await page.locator(`.mode-btn[data-mode="${mode}"]`).click();
  await expect(page.locator(`.mode-btn[data-mode="${mode}"]`)).toHaveAttribute('aria-pressed', 'true');
}

async function chooseView(page, view) {
  await page.locator(`.view-btn[data-view="${view}"]`).click();
  await expect(page.locator(`.view-btn[data-view="${view}"]`)).toHaveAttribute('aria-pressed', 'true');
}

test.describe('CORE7 Home Loan / Mortgage Prepayment & Early Payoff', () => {
  test('[AUTO] deterministic amortization fixtures cover zero rate, standard mortgage and Canada fixed convention', async ({ page }) => {
    await gotoClean(page, PATH);

    const zero = await coreCalculate(page, {
      balance: 120000, annualRatePct: 0, remainingYears: 10, remainingMonths: 0,
      paymentFrequency: 'monthly', country: 'US', mode: 'recurring', recurringEnabled: false,
      startDate: '2026-10-11'
    });
    expect(zero.ok).toBe(true);
    expect(zero.baseline.payment).toBeCloseTo(1000, 8);
    expect(zero.baseline.totalInterest).toBeCloseTo(0, 8);
    expect(zero.baseline.payoffPeriods).toBe(120);

    const standard = await coreCalculate(page, {
      balance: 300000, annualRatePct: 6, remainingYears: 30, remainingMonths: 0,
      paymentFrequency: 'monthly', country: 'US', mode: 'recurring', recurringEnabled: false,
      startDate: '2026-10-11'
    });
    const monthlyRate = 0.06 / 12;
    const independentPayment = 300000 * monthlyRate / (1 - Math.pow(1 + monthlyRate, -360));
    expect(standard.ok).toBe(true);
    expect(standard.baseline.payment).toBeCloseTo(independentPayment, 8);
    expect(standard.baseline.payoffPeriods).toBe(360);
    expect(standard.baseline.finalBalance).toBeLessThan(0.01);

    const canada = await coreCalculate(page, {
      balance: 500000, annualRatePct: 5.25, remainingYears: 25, remainingMonths: 0,
      paymentFrequency: 'monthly', country: 'CA', rateMode: 'fixed', mode: 'recurring', recurringEnabled: false,
      startDate: '2026-10-11'
    });
    const caRate = Math.pow(1 + 0.0525 / 2, 2 / 12) - 1;
    const caPayment = 500000 * caRate / (1 - Math.pow(1 + caRate, -300));
    expect(canada.ok).toBe(true);
    expect(canada.common.convention).toBe('canada-fixed');
    expect(canada.baseline.payment).toBeCloseTo(caPayment, 8);
  });

  test('[AUTO] recurring part-prepayment is neutral by default and quarterly remains an explicit user choice', async ({ page }) => {
    await gotoClean(page, PATH);
    await setLocale(page, 'IN', 'INR');

    await expect(page.locator('#recurringEnabled')).not.toBeChecked();
    await expect(page.locator('#extraFrequency')).toHaveValue('');
    await expect(page.locator('#extraFrequency option[value="quarterly"]')).toHaveText('Quarterly');
    await expect(page.locator('#recurringFields')).toHaveClass(/hidden/);
    await expect(page.locator('#resultSubtext')).toContainText('Recurring part-prepayment is currently off');

    await page.locator('#recurringEnabled').check();
    await expect(page.locator('#recurringFields')).not.toHaveClass(/hidden/);
    await setInput(page, '#recurringExtra', 100000);
    await expect(page.locator('#validationMessage')).toContainText('choosing its frequency');

    await page.locator('#extraFrequency').selectOption('quarterly');
    await expect(page.locator('#validationMessage')).toBeHidden();
    await expect(page.locator('#timeSaved')).not.toHaveText('0 months');
  });

  test('[AUTO] Monthly View and Pay Cycle View do not change amortization, while Pay Cycle View derives a set-aside', async ({ page }) => {
    await gotoClean(page, PATH);
    await setLocale(page, 'IN', 'INR');
    await page.locator('#recurringEnabled').check();
    await setInput(page, '#recurringExtra', 90000);
    await page.locator('#extraFrequency').selectOption('quarterly');

    const monthly = await page.evaluate(() => ({
      payoff: document.querySelector('#scenarioPayoff').textContent,
      interest: document.querySelector('#interestSaved').textContent,
      tableRows: document.querySelectorAll('#periodTableBody tr').length
    }));

    await chooseView(page, 'paycycle');
    await page.locator('#payFrequency').selectOption('monthly');
    const paycycle = await page.evaluate(() => ({
      payoff: document.querySelector('#scenarioPayoff').textContent,
      interest: document.querySelector('#interestSaved').textContent,
      tableRows: document.querySelectorAll('#periodTableBody tr').length,
      setAside: document.querySelector('#setAsideAmount').textContent,
      visible: !document.querySelector('#setAsideCard').classList.contains('hidden')
    }));

    expect(paycycle.payoff).toBe(monthly.payoff);
    expect(paycycle.interest).toBe(monthly.interest);
    expect(paycycle.tableRows).toBe(monthly.tableRows);
    expect(paycycle.visible).toBe(true);
    const numeric = Number(paycycle.setAside.replace(/[^0-9.]/g, ''));
    expect(numeric).toBeCloseTo(30000, 0);
  });

  test('[AUTO] target payoff applies its optional lump sum before interest and never produces a negative balance', async ({ page }) => {
    await gotoClean(page, PATH);
    const result = await coreCalculate(page, {
      balance: 300000, annualRatePct: 6, remainingYears: 30, remainingMonths: 0,
      paymentFrequency: 'monthly', country: 'US', mode: 'target', targetYears: 20, targetMonths: 0,
      targetLumpSum: 20000, startDate: '2026-10-11'
    });
    expect(result.ok).toBe(true);
    expect(result.scenario.initialLumpSum).toBe(20000);
    expect(result.scenario.ledger[0].openingBalance).toBeCloseTo(280000, 8);
    expect(result.annualSummary[0].openingBalance).toBeCloseTo(300000, 8);
    expect(result.annualSummary[0].extraRepayments).toBeGreaterThanOrEqual(20000);
    expect(result.scenario.ledger.at(-1).closingBalance).toBeGreaterThanOrEqual(0);
    expect(result.scenario.ledger.at(-1).closingBalance).toBeLessThan(0.01);
  });

  test('[AUTO] too-small lender repayment reports negative amortization and does not claim a payoff date', async ({ page }) => {
    await gotoClean(page, PATH);
    await page.locator('#useCurrentPayment').check();
    await setInput(page, '#currentPayment', 10000);
    await expect(page.locator('#validationMessage')).toContainText('not high enough to reduce principal');
    await expect(page.locator('#resultHeadline')).toHaveText('Review the highlighted assumptions.');
  });

  test('[AUTO] country terminology changes labels but keeps one stable tool URL and calculation engine', async ({ page }) => {
    await gotoClean(page, PATH);
    const expectations = [
      ['IN','INR','Home Loan Prepayment / Foreclosure','Part-Prepayment Frequency'],
      ['US','USD','Mortgage Payoff','Extra Principal Frequency'],
      ['CA','CAD','Mortgage Prepayment & Payoff','Prepayment Frequency'],
      ['GB','GBP','Mortgage Overpayment','Overpayment Frequency'],
      ['AU','AUD','Home Loan Extra Repayments','Extra Repayment Frequency'],
      ['NZ','NZD','Home Loan Extra Repayments','Extra Repayment Frequency']
    ];
    for (const [region,currency,product,frequencyLabel] of expectations) {
      await setLocale(page, region, currency);
      await expect(page.locator('#productLabel')).toHaveText(product);
      await expect(page.locator('#extraFrequencyLabel')).toHaveText(frequencyLabel);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://carrowmont.com/mortgage-payoff-calculator/');
      await expect(page.locator('#extraFrequency')).toHaveValue('');
    }
  });

  test('[AUTO] shared browser state is semantic and same-currency Budget handoff requires explicit user action', async ({ page }) => {
    await page.goto(PATH, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await setLocale(page, 'IN', 'INR');
    const stored = await page.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('carrowmont_plan_context_v1'));
      return raw;
    });
    expect(stored.version).toBe(1);
    expect(stored.housingLoan.balance.value).toBe(5000000);
    expect(stored.housingLoan.balance.currency).toBe('INR');
    expect(stored.housingLoan.monthlyEquivalentPayment.value).toBeGreaterThan(0);

    await page.goto('/budget-cash-flow-planner/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    const banner = page.locator('#cmSharedPlanBanner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Home-loan repayment available from Carrowmont');
    const rentAmount = page.locator('#essentialRows .entry-row').filter({ has: page.locator('[data-field="name"][value="Rent / mortgage"]') }).locator('[data-field="amount"]');
    const before = await rentAmount.inputValue();
    const expectedPayment = stored.housingLoan.monthlyEquivalentPayment.value;
    await banner.getByRole('button', { name: 'Use in Rent / mortgage' }).click();
    const liveRentAmount = page.locator('#essentialRows .entry-row').filter({ has: page.locator('[data-field="name"][value="Rent / mortgage"]') }).locator('[data-field="amount"]');
    const after = await liveRentAmount.inputValue();
    expect(Number(after)).toBeCloseTo(expectedPayment, 6);
    expect(Number(after)).toBeGreaterThan(0);
    if (Math.abs(expectedPayment - Number(before)) > 1e-6) expect(after).not.toBe(before);
  });

  test('[AUTO] CSV includes scenario metadata and the full repayment ledger', async ({ page }) => {
    await gotoClean(page, PATH);
    await chooseMode(page, 'target');
    await setInput(page, '#targetYears', 10);
    await setInput(page, '#targetMonths', 0);
    await setInput(page, '#targetLumpSum', 250000);
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#csvBtn').click();
    const download = await downloadPromise;
    const file = await download.path();
    const text = fs.readFileSync(file, 'utf8');
    expect(text).toContain('target_upfront_lump_sum,250000');
    expect(text).toContain('target_payoff_date,');
    expect(text).toContain('methodology_version,1.0.0');
    expect(text).toContain('period,date,opening_balance,interest,scheduled_repayment,extra_repayment,principal_repaid,closing_balance');
    expect(text.trim().split(/\r?\n/).length).toBeGreaterThan(40);
  });

  test('[AUTO] desktop and mobile layouts remain inside the viewport', async ({ page }) => {
    for (const width of [1440, 390, 360, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await gotoClean(page, PATH);
      await assertNoHorizontalOverflow(page, `${width}px mortgage payoff calculator`);
      await expect(page.locator('#localeSummary')).toBeVisible();
      await expect(page.locator('#reportBtn')).toBeVisible();
      await expect(page.locator('#balanceChart')).toBeVisible();
    }
  });
});
