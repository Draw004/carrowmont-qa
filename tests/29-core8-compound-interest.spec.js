import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors, assertNoHorizontalOverflow, setInput } from '../helpers/common.js';

const PATH = '/compound-interest-calculator/';

async function calculate(page, input) {
  return page.evaluate(input => window.CarrowmontCompoundCore.calculate(input), input);
}

async function setLocale(page, region, currency) {
  await expect.poll(() => page.evaluate(() => Boolean(window.CarrowmontLocale?.setLocale)), { timeout: 10000 }).toBe(true);
  await page.evaluate(({ region, currency }) => window.CarrowmontLocale.setLocale(region, currency), { region, currency });
  await expect.poll(() => page.locator('#localeCurrent').innerText()).toContain(currency);
}

async function openAdvanced(page) {
  const advanced = page.locator('details.advanced');
  if (await advanced.count() && !(await advanced.getAttribute('open'))) await advanced.locator('summary').click();
  await expect(page.locator('#inflationEnabled')).toBeVisible();
}

test.describe('CORE8 Compound Interest Calculator', () => {
  test('[AUTO] canonical identity, indexability and deterministic calculator controls are present', async ({ page }) => {
    const errors = monitorPageErrors(page);
    await gotoClean(page, PATH);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('See how compounding can change your money over time.');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://carrowmont.com/compound-interest-calculator/');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index,follow');
    await expect(page).toHaveTitle('Compound Interest Calculator | Carrowmont');
    for (const selector of ['#principal','#annualRate','#years','#compoundingFrequency','#contributionEnabled','#inflationEnabled','#growthChart','#annualTableBody','#reportBtn']) {
      await expect(page.locator(selector), selector).toHaveCount(1);
    }
    expect(errors).toEqual([]);
  });

  test('[AUTO] monthly compounding fixture matches principal formula, EAR and simple-interest comparison', async ({ page }) => {
    await gotoClean(page, PATH);
    const result = await calculate(page, {
      principal: 100000, annualRate: 12, years: 1, compounding: 'monthly',
      contributionEnabled: false, contribution: 0, contributionFrequency: 'monthly', contributionTiming: 'end',
      inflationEnabled: false, inflation: 0
    });
    expect(result.ok).toBe(true);
    expect(result.endingValue).toBeCloseTo(112682.503013, 5);
    expect(result.effectiveAnnualRate).toBeCloseTo(0.12682503013, 10);
    expect(result.simpleEndingValue).toBeCloseTo(112000, 5);
    expect(result.compoundVsSimpleDifference).toBeGreaterThan(0);
  });

  test('[AUTO] zero rate, daily compounding and negative valid rates remain finite', async ({ page }) => {
    await gotoClean(page, PATH);
    const zero = await calculate(page, {
      principal: 0, annualRate: 0, years: 1, compounding: 'monthly',
      contributionEnabled: true, contribution: 1000, contributionFrequency: 'monthly', contributionTiming: 'end',
      inflationEnabled: false, inflation: 0
    });
    expect(zero.ok).toBe(true);
    expect(zero.endingValue).toBeCloseTo(12000, 8);

    const daily = await calculate(page, {
      principal: 10000, annualRate: 5, years: 2, compounding: 'daily',
      contributionEnabled: false, contribution: 0, contributionFrequency: 'monthly', contributionTiming: 'end',
      inflationEnabled: false, inflation: 0
    });
    expect(daily.ok).toBe(true);
    expect(daily.endingValue).toBeCloseTo(10000 * Math.pow(1 + 0.05 / 365, 730), 6);

    const negative = await calculate(page, {
      principal: 10000, annualRate: -5, years: 2, compounding: 'monthly',
      contributionEnabled: false, contribution: 0, contributionFrequency: 'monthly', contributionTiming: 'end',
      inflationEnabled: false, inflation: 0
    });
    expect(negative.ok).toBe(true);
    expect(Number.isFinite(negative.endingValue)).toBe(true);
    expect(negative.endingValue).toBeLessThan(10000);
  });

  test('[AUTO] beginning contributions receive more modeled growth than end-of-period contributions', async ({ page }) => {
    await gotoClean(page, PATH);
    const base = {
      principal: 0, annualRate: 12, years: 1, compounding: 'monthly',
      contributionEnabled: true, contribution: 1000, contributionFrequency: 'monthly',
      inflationEnabled: false, inflation: 0
    };
    const end = await calculate(page, { ...base, contributionTiming: 'end' });
    const beginning = await calculate(page, { ...base, contributionTiming: 'beginning' });
    expect(end.ok).toBe(true);
    expect(beginning.ok).toBe(true);
    expect(beginning.endingValue).toBeGreaterThan(end.endingValue);
    expect(beginning.totalContributed).toBeCloseTo(end.totalContributed, 8);
  });

  test('[AUTO] independent contribution cadence and inflation-adjusted value use deterministic formulas', async ({ page }) => {
    await gotoClean(page, PATH);
    const result = await calculate(page, {
      principal: 50000, annualRate: 8, years: 10, compounding: 'quarterly',
      contributionEnabled: true, contribution: 2000, contributionFrequency: 'monthly', contributionTiming: 'end',
      inflationEnabled: true, inflation: 3
    });
    expect(result.ok).toBe(true);
    expect(result.totalContributed).toBeCloseTo(290000, 6);
    expect(result.realEndingValue).toBeCloseTo(result.endingValue / Math.pow(1.03, 10), 6);
    expect(result.series).toHaveLength(11);
  });

  test('[AUTO] optional controls update the web results, chart and annual table', async ({ page }) => {
    const errors = monitorPageErrors(page);
    await gotoClean(page, PATH);
    await setInput(page, '#principal', 100000);
    await setInput(page, '#annualRate', 10);
    await setInput(page, '#years', 5);
    await page.locator('#compoundingFrequency').selectOption('monthly');
    await page.locator('#contributionEnabled').check();
    await setInput(page, '#contributionAmount', 5000);
    await page.locator('#contributionFrequency').selectOption('monthly');
    await openAdvanced(page);
    await page.locator('#inflationEnabled').check();
    await setInput(page, '#inflationRate', 4);
    await expect(page.locator('#endingValue')).not.toHaveText(/^(?:₹|\$|£|€)?\s*0(?:\.00)?$/);
    await expect(page.locator('#realValueCard')).toBeVisible();
    await expect(page.locator('#growthChart path')).toHaveCount(3);
    await expect(page.locator('#annualTableBody tr')).toHaveCount(6);
    expect(errors).toEqual([]);
  });

  test('[AUTO] country controls terminology while currency changes units without changing the contribution cadence', async ({ page }) => {
    await gotoClean(page, PATH);
    await setLocale(page, 'IN', 'INR');
    await expect(page.locator('#contributionFrequency option[value="biweekly"]')).toHaveText(/Every 2 Weeks/i);
    const indiaFrequency = await page.locator('#contributionFrequency').inputValue();
    await setLocale(page, 'GB', 'GBP');
    await expect(page.locator('#contributionFrequency option[value="biweekly"]')).toHaveText(/Fortnightly/i);
    await setLocale(page, 'US', 'USD');
    await expect(page.locator('#contributionFrequency option[value="biweekly"]')).toHaveText(/Biweekly/i);
    const usFrequency = await page.locator('#contributionFrequency').inputValue();
    await page.locator('#localeSummary').click();
    await expect(page.locator('#currencySelect')).toBeVisible();
    await page.locator('#currencySelect').selectOption('EUR');
    await page.locator('#localeDone').click();
    await expect(page.locator('#localeCurrent')).toContainText('EUR');
    await expect(page.locator('#contributionFrequency')).toHaveValue(usFrequency);
    expect(indiaFrequency).toBeTruthy();
  });

  test('[AUTO] calculator avoids horizontal overflow at [1440, 390, 360] and preserves tap-sized primary actions', async ({ page }) => {
    for (const width of [1440, 390, 360]) {
      await page.setViewportSize({ width, height: 900 });
      await gotoClean(page, PATH);
      await assertNoHorizontalOverflow(page, `${width}px compound calculator`);
      await expect(page.locator('#reportBtn')).toBeVisible();
      const height = await page.locator('#reportBtn').evaluate(el => el.getBoundingClientRect().height);
      expect(height).toBeGreaterThanOrEqual(40);
    }
  });

  test('[AUTO] homepage, tools directory, sitemap and Learn pages expose crawlable compound calculator links', async ({ page, request }) => {
    await gotoClean(page, '/');
    await expect(page.locator('[data-tool-id="compound"] a[href="/compound-interest-calculator/"]')).toHaveCount(1);
    await gotoClean(page, '/tools.html');
    await expect(page.locator('[data-directory-tool="compound"] a[href="/compound-interest-calculator/"]')).toHaveCount(1);
    const sitemap = await (await request.get('/sitemap.xml')).text();
    expect(sitemap).toContain('<loc>https://carrowmont.com/compound-interest-calculator/</loc>');
    await gotoClean(page, '/compounding-and-time.html');
    await expect(page.locator('a[href="/compound-interest-calculator/"]').first()).toBeVisible();
    await gotoClean(page, '/compound-interest-monthly-contributions.html');
    await expect(page.locator('a[href="/compound-interest-calculator/"]').first()).toBeVisible();
  });
});
