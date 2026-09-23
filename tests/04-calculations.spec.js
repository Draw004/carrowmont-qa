import { test, expect } from '@playwright/test';
import { gotoClean, setInput, parseMoney, parsePercent, relativeError } from '../helpers/common.js';
import { sipFutureValue, sipFrequencyPeriods, inflationFutureValue, goalFutureCost, fiToday, fiAtAge } from '../helpers/calculations.js';

test.describe('Calculation regression and independent formula checks', () => {
  test('[AUTO] SIP: future value matches an independent monthly compounding calculation', async ({ page }) => {
    await gotoClean(page, '/sip-calculator/');
    await page.locator('#growthTab').click();
    await page.locator('#contributionFrequency').selectOption('monthly');
    await setInput(page, '#currentSavings', 100000);
    await setInput(page, '#monthlySIP', 10000);
    await setInput(page, '#years', 15);
    await setInput(page, '#annualReturn', 12);
    await setInput(page, '#annualStepUp', 0);
    const actual = parseMoney(await page.locator('#heroValue').innerText());
    const expected = sipFutureValue({ currentSavings: 100000, monthlySIP: 10000, years: 15, annualReturnPct: 12, annualStepUpPct: 0, contributionFrequency: 'monthly' });
    expect(Number.isFinite(actual)).toBeTruthy();
    expect(relativeError(actual, expected), `SIP actual ${actual} expected ${expected}`).toBeLessThan(0.012);
  });

  test('[AUTO] SIP: contribution-frequency constants stay standardized', async () => {
    expect(sipFrequencyPeriods).toEqual({
      weekly: 52,
      biweekly: 26,
      semimonthly: 24,
      fourweekly: 13,
      monthly: 12
    });
    expect(sipFrequencyPeriods.biweekly).not.toBe(sipFrequencyPeriods.semimonthly);
  });

  for (const contributionFrequency of ['weekly', 'biweekly', 'semimonthly', 'fourweekly']) {
    test(`[AUTO] SIP: ${contributionFrequency} future value matches an independent periodic-compounding calculation`, async ({ page }) => {
      await gotoClean(page, '/sip-calculator/');
      await page.locator('#growthTab').click();
      await page.locator('#contributionFrequency').selectOption(contributionFrequency);
      await setInput(page, '#currentSavings', 100000);
      await setInput(page, '#monthlySIP', 10000);
      await setInput(page, '#years', 15);
      await setInput(page, '#annualReturn', 12);
      await setInput(page, '#annualStepUp', 0);
      const actual = parseMoney(await page.locator('#heroValue').innerText());
      const expected = sipFutureValue({ currentSavings: 100000, monthlySIP: 10000, years: 15, annualReturnPct: 12, annualStepUpPct: 0, contributionFrequency });
      expect(Number.isFinite(actual)).toBeTruthy();
      expect(relativeError(actual, expected), `SIP ${contributionFrequency} actual ${actual} expected ${expected}`).toBeLessThan(0.012);
    });
  }

  test('[AUTO] SIP: annual step-up remains annual for weekly contributions', async ({ page }) => {
    await gotoClean(page, '/sip-calculator/');
    await page.locator('#growthTab').click();
    await page.locator('#contributionFrequency').selectOption('weekly');
    await setInput(page, '#currentSavings', 0);
    await setInput(page, '#monthlySIP', 1000);
    await setInput(page, '#years', 2);
    await setInput(page, '#annualReturn', 0);
    await setInput(page, '#annualStepUp', 10);
    const actual = parseMoney(await page.locator('#totalInvested').innerText());
    const expected = 52 * 1000 + 52 * 1100;
    expect(relativeError(actual, expected), `Weekly step-up invested ${actual} expected ${expected}`).toBeLessThan(0.006);
  });

  test('[AUTO] Inflation: future value matches compound inflation formula', async ({ page }) => {
    await gotoClean(page, '/inflation-calculator/');
    await setInput(page, '#amountInput', 100000);
    await setInput(page, '#yearsInput', 20);
    await setInput(page, '#inflationInput', 5);
    const actual = parseMoney(await page.locator('#futureValue').innerText());
    const expected = inflationFutureValue(100000, 5, 20);
    expect(relativeError(actual, expected), `Inflation actual ${actual} expected ${expected}`).toBeLessThan(0.006);
  });

  test('[AUTO] Goal Planner: approved education fixture remains consistent', async ({ page }) => {
    await gotoClean(page, '/goal-planner/');
    const education = page.locator('[data-goal="education"]');
    if (await education.count()) await education.click();
    await setInput(page, '#amountToday', 2500000);
    await setInput(page, '#years', 12);
    await setInput(page, '#inflationRate', 7);
    await setInput(page, '#existingSavings', 500000);
    await setInput(page, '#monthlyContribution', 8000);
    await setInput(page, '#returnRate', 10);
    await setInput(page, '#futureLump', 0);
    const futureCost = parseMoney(await page.locator('#futureCost').innerText());
    const projected = parseMoney(await page.locator('#projectedPlan').innerText());
    const monthly = parseMoney(await page.locator('#totalMonthly').innerText());
    const funding = parsePercent(await page.locator('#fundingPct').innerText());
    const independentCost = goalFutureCost(2500000, 7, 12);
    expect(relativeError(futureCost, independentCost)).toBeLessThan(0.012);
    expect(relativeError(projected, 3714577)).toBeLessThan(0.015);
    expect(relativeError(monthly, 15144)).toBeLessThan(0.02);
    expect(Math.abs(funding - 66)).toBeLessThanOrEqual(1);
  });

  test('[AUTO] Financial Independence: FI today and target-age values match independent formulas', async ({ page }) => {
    await gotoClean(page, '/financial-independence/');
    await setInput(page, '#currentAge', 35);
    await setInput(page, '#targetAge', 50);
    await setInput(page, '#monthlySpending', 100000);
    await setInput(page, '#spendingPct', 100);
    await setInput(page, '#monthlyIncome', 0);
    await setInput(page, '#withdrawalRate', 4);
    await setInput(page, '#inflation', 5);
    const actualToday = parseMoney(await page.locator('#fiToday').innerText());
    const actualTarget = parseMoney(await page.locator('#fiTargetAge').innerText());
    const expectedToday = fiToday(100000, 100, 0, 4);
    const expectedTarget = fiAtAge(expectedToday, 5, 15);
    expect(relativeError(actualToday, expectedToday)).toBeLessThan(0.012);
    expect(relativeError(actualTarget, expectedTarget)).toBeLessThan(0.012);
  });

  test('[AUTO] Retirement Planner: approved quick-mode fixture remains consistent', async ({ page }) => {
    await gotoClean(page, '/retirement-calculator/planner.html');
    await page.locator('#quickModeBtn').click();
    await setInput(page, '#currentAge', 35);
    await setInput(page, '#retirementAge', 60);
    await setInput(page, '#planningAge', 90);
    await setInput(page, '#currentSavings', 1000000);
    await setInput(page, '#currentMonthlyInvestment', 20000);
    await setInput(page, '#preReturn', 10);
    await setInput(page, '#postReturn', 7.5);
    await setInput(page, '#bufferRate', 10);
    await setInput(page, '#quickMonthlyExpense', 90000);
    await setInput(page, '#quickRetirementPct', 65);
    await setInput(page, '#quickInflation', 5);
    const corpus = parseMoney(await page.locator('#requiredCorpus').innerText());
    const projected = parseMoney(await page.locator('#projectedCorpus').innerText());
    const monthly = parseMoney(await page.locator('#totalMonthlyNeeded').innerText());
    const funded = parsePercent(await page.locator('#fundedPercent').innerText());
    expect(relativeError(corpus, 56325098), `Required corpus ${corpus}`).toBeLessThan(0.015);
    expect(relativeError(projected, 35501204), `Projected corpus ${projected}`).toBeLessThan(0.015);
    expect(relativeError(monthly, 36884), `Monthly investment ${monthly}`).toBeLessThan(0.025);
    expect(Math.abs(funded - 63)).toBeLessThanOrEqual(1);
  });
});
