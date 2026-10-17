import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors, assertNoHorizontalOverflow, setInput } from '../helpers/common.js';

const PATH = '/loan-calculator/';

async function calculate(page, input) {
  return page.evaluate(input => window.CarrowmontLoanCore.calculate(input), input);
}

async function setLocale(page, region, currency) {
  await expect.poll(() => page.evaluate(() => Boolean(window.CarrowmontLocale?.setLocale)), { timeout: 10000 }).toBe(true);
  await page.evaluate(({ region, currency }) => window.CarrowmontLocale.setLocale(region, currency), { region, currency });
  await expect.poll(() => page.locator('#localeCurrent').innerText()).toContain(currency);
}

const BASE = {
  mode: 'payment', principal: 500000, targetPayment: 12000, annualRate: 10,
  termYears: 5, termMonths: 0, firstPaymentDate: '', fixedFee: 0,
  percentageFee: 0, extraMonthly: 0, oneTimeExtra: 0, oneTimeMonth: 12
};

test.describe('CORE9 Loan / EMI Calculator', () => {
  test('[AUTO] canonical identity, indexability and required controls are present', async ({ page }) => {
    const errors = monitorPageErrors(page);
    await gotoClean(page, PATH);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('See what a loan could cost each month.');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://carrowmont.com/loan-calculator/');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index,follow');
    await expect(page).toHaveTitle('Loan & EMI Calculator | Carrowmont');
    for (const selector of ['#principal','#targetPayment','#annualRate','#termYears','#termMonths','#fixedFee','#percentageFee','#extraMonthly','#oneTimeExtra','#oneTimeMonth','#balanceChart','#amortizationTableBody','#copySummaryBtn','#csvBtn','#reportBtn']) {
      await expect(page.locator(selector), selector).toHaveCount(1);
    }
    expect(errors).toEqual([]);
  });

  test('[AUTO] standard payment fixture, zero-rate case and one-month case match reducing-balance formulas', async ({ page }) => {
    await gotoClean(page, PATH);
    const standard = await calculate(page, BASE);
    const expected = 500000 * (0.10/12) * Math.pow(1+0.10/12,60) / (Math.pow(1+0.10/12,60)-1);
    expect(standard.ok).toBe(true);
    expect(standard.scheduledPayment).toBeCloseTo(expected, 8);
    expect(standard.payoffMonths).toBe(60);
    expect(standard.schedule.at(-1).endingBalance).toBeCloseTo(0, 6);
    expect(standard.totalRepayment).toBeCloseTo(standard.principal + standard.totalInterest, 5);

    const zero = await calculate(page, { ...BASE, principal: 12000, annualRate: 0, termYears: 1 });
    expect(zero.ok).toBe(true);
    expect(zero.scheduledPayment).toBeCloseTo(1000, 10);
    expect(zero.totalInterest).toBeCloseTo(0, 10);

    const one = await calculate(page, { ...BASE, principal: 10000, annualRate: 12, termYears: 0, termMonths: 1 });
    expect(one.ok).toBe(true);
    expect(one.scheduledPayment).toBeCloseTo(10100, 8);
    expect(one.schedule).toHaveLength(1);
    expect(one.schedule[0].endingBalance).toBeCloseTo(0, 8);
  });

  test('[AUTO] reverse principal formula and long-term allowed boundary stay finite and deterministic', async ({ page }) => {
    await gotoClean(page, PATH);
    const reverse = await calculate(page, { ...BASE, mode: 'principal', targetPayment: 12000 });
    const r=0.10/12, n=60;
    const expected = 12000 * (1 - Math.pow(1+r,-n)) / r;
    expect(reverse.ok).toBe(true);
    expect(reverse.principal).toBeCloseTo(expected, 8);
    expect(reverse.scheduledPayment).toBeCloseTo(12000, 8);

    const long = await calculate(page, { ...BASE, principal: 1000000, annualRate: 0.01, termYears: 50, termMonths: 0 });
    expect(long.ok).toBe(true);
    expect(long.schedule).toHaveLength(600);
    expect(Number.isFinite(long.totalInterest)).toBe(true);
    expect(long.schedule.at(-1).endingBalance).toBeCloseTo(0, 5);
  });

  test('[AUTO] fees stay separate from principal and interest while total cost reconciles', async ({ page }) => {
    await gotoClean(page, PATH);
    const result = await calculate(page, { ...BASE, fixedFee: 5000, percentageFee: 2 });
    expect(result.ok).toBe(true);
    expect(result.principal).toBeCloseTo(500000, 8);
    expect(result.fees).toBeCloseTo(15000, 8);
    expect(result.totalRepayment).toBeCloseTo(result.principal + result.totalInterest, 5);
    expect(result.totalCostIncludingFees).toBeCloseTo(result.totalRepayment + 15000, 5);
  });

  test('[AUTO] recurring, one-time and combined extra payments reduce balance without negative final rows', async ({ page }) => {
    await gotoClean(page, PATH);
    const baseline = await calculate(page, BASE);
    const recurring = await calculate(page, { ...BASE, extraMonthly: 2000 });
    const once = await calculate(page, { ...BASE, oneTimeExtra: 50000, oneTimeMonth: 12 });
    const combined = await calculate(page, { ...BASE, extraMonthly: 2000, oneTimeExtra: 50000, oneTimeMonth: 12 });
    for (const result of [recurring, once, combined]) {
      expect(result.ok).toBe(true);
      expect(result.totalInterest).toBeLessThan(baseline.totalInterest);
      expect(result.payoffMonths).toBeLessThan(baseline.payoffMonths);
      expect(result.schedule.at(-1).endingBalance).toBeCloseTo(0, 6);
      expect(Math.min(...result.schedule.map(row => row.endingBalance))).toBeGreaterThanOrEqual(0);
      expect(result.schedule.reduce((s,row)=>s+row.interest,0)).toBeCloseTo(result.totalInterest, 5);
    }
    expect(combined.totalInterest).toBeLessThan(recurring.totalInterest);
    expect(combined.totalInterest).toBeLessThan(once.totalInterest);
  });

  test('[AUTO] web controls update reverse mode, extra-payment results, chart and full amortization table', async ({ page }) => {
    const errors = monitorPageErrors(page);
    await gotoClean(page, PATH);
    await page.locator('#principalModeBtn').click();
    await expect(page.locator('#targetPaymentField')).toBeVisible();
    await expect(page.locator('#principalField')).toBeHidden();
    await setInput(page, '#targetPayment', 15000);
    await setInput(page, '#annualRate', 9);
    await setInput(page, '#termYears', 4);
    await expect(page.locator('#heroResultLabel')).toHaveText('Modeled loan amount');

    const advanced = page.locator('#advancedAssumptions');
    if (!(await advanced.getAttribute('open'))) await advanced.locator('summary').click();
    await setInput(page, '#extraMonthly', 1000);
    await setInput(page, '#oneTimeExtra', 10000);
    await setInput(page, '#oneTimeMonth', 6);
    await expect(page.locator('#extraSavingsCard')).toBeVisible();
    await expect(page.locator('#balanceChart path')).toHaveCount(3);
    const rows = await page.locator('#amortizationTableBody tr').count();
    expect(rows).toBeGreaterThan(0);
    expect(rows).toBeLessThanOrEqual(48);
    expect(errors).toEqual([]);
  });

  test('[AUTO] country controls loan terminology while currency changes formatting without changing math', async ({ page }) => {
    await gotoClean(page, PATH);
    await setLocale(page, 'IN', 'INR');
    await expect(page.locator('#productLabel')).toHaveText('EMI Calculator');
    await expect(page.locator('#chipPayment')).toHaveText('Monthly EMI');
    const before = await page.locator('#heroResultValue').innerText();

    await setLocale(page, 'US', 'USD');
    await expect(page.locator('#productLabel')).toHaveText('Loan Calculator');
    await expect(page.locator('#chipPayment')).toHaveText('Monthly payment');
    const usValue = (await calculate(page, BASE)).scheduledPayment;
    await setLocale(page, 'GB', 'GBP');
    await expect(page.locator('#productLabel')).toHaveText('Loan Repayment Calculator');
    await expect(page.locator('#chipPayment')).toHaveText('Monthly repayment');
    await setLocale(page, 'AU', 'AUD');
    await expect(page.locator('#productLabel')).toHaveText('Loan Repayment Calculator');
    await setLocale(page, 'NZ', 'NZD');
    await expect(page.locator('#productLabel')).toHaveText('Loan Repayment Calculator');
    await setLocale(page, 'OTHER', 'EUR');
    await expect(page.locator('#productLabel')).toHaveText('Loan / EMI Calculator');
    const otherValue = (await calculate(page, BASE)).scheduledPayment;
    expect(otherValue).toBeCloseTo(usValue, 10);
    expect(before).toContain('₹');
  });

  test('[AUTO] calculator has no page-level horizontal overflow at [1440, 390, 360] and the table scrolls locally', async ({ page }) => {
    for (const width of [1440, 390, 360]) {
      await page.setViewportSize({ width, height: 900 });
      await gotoClean(page, PATH);
      await assertNoHorizontalOverflow(page, `${width}px loan calculator`);
      const scroll = await page.locator('.table-scroll').evaluate(el => ({ client: el.clientWidth, scroll: el.scrollWidth, overflowX: getComputedStyle(el).overflowX }));
      if (width <= 390) expect(scroll.scroll).toBeGreaterThan(scroll.client);
      await expect(page.locator('#reportBtn')).toBeVisible();
      const height = await page.locator('#reportBtn').evaluate(el => el.getBoundingClientRect().height);
      expect(height).toBeGreaterThanOrEqual(40);
    }
  });

  test('[AUTO] homepage, tools directory, sitemap and debt Learn guide expose crawlable loan calculator links', async ({ page, request }) => {
    await gotoClean(page, '/');
    await expect(page.locator('[data-tool-id="loan"] a[href="/loan-calculator/"]')).toHaveCount(1);
    await gotoClean(page, '/tools.html');
    await expect(page.locator('[data-directory-tool="loan"] a[href="/loan-calculator/"]')).toHaveCount(1);
    const sitemap = await (await request.get('/sitemap.xml')).text();
    expect(sitemap).toContain('<loc>https://carrowmont.com/loan-calculator/</loc>');
    await gotoClean(page, '/debt-snowball-vs-avalanche.html');
    await expect(page.locator('a[href="/loan-calculator/"]').first()).toBeVisible();
  });
});
