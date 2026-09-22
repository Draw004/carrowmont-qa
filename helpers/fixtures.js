import { expect } from '@playwright/test';
import { setInput } from './common.js';

async function chooseIndiaLocale(page) {
  const summary = page.locator('#localeSummary');
  if (!(await summary.count())) return;

  const current = page.locator('#localeCurrent');
  const currentText = (await current.count()) ? (await current.innerText().catch(() => '')) : '';
  if (/India\s*·\s*INR/i.test(currentText)) return;

  await summary.click();
  const region = page.locator('#regionSelect');
  const currency = page.locator('#currencySelect');
  if (await region.count()) await region.selectOption('IN');
  if (await currency.count()) await currency.selectOption('INR');

  const done = page.locator('#localeDone, #localeDoneBtn').filter({ visible: true }).first();
  if (await done.count()) await done.click();
  await page.waitForTimeout(200);
}

export async function prepareToolForQa(page, toolKey) {
  await chooseIndiaLocale(page);

  if (toolKey === 'financial-independence') {
    await setInput(page, '#currentAge', 35);
    await setInput(page, '#targetAge', 50);
    await setInput(page, '#monthlySpending', 100000);
    await setInput(page, '#spendingPct', 100);
    await setInput(page, '#monthlyIncome', 0);
    await setInput(page, '#withdrawalRate', 4);
    await setInput(page, '#inflation', 5);
    await setInput(page, '#currentAssets', 1500000);
    await setInput(page, '#monthlyContribution', 30000);
    await setInput(page, '#annualReturn', 10);
    await setInput(page, '#annualStepUp', 5);
    await expect(page.locator('#visualContent')).toBeVisible();
  }

  if (toolKey === 'goal-planner') {
    const education = page.locator('[data-goal="education"]');
    if (await education.count()) await education.click();
    await setInput(page, '#amountToday', 2500000);
    await setInput(page, '#years', 12);
    await setInput(page, '#inflationRate', 7);
    await setInput(page, '#existingSavings', 500000);
    await setInput(page, '#monthlyContribution', 8000);
    await setInput(page, '#returnRate', 10);
    const futureLump = page.locator('#futureLump');
    if (await futureLump.count()) await setInput(page, '#futureLump', 0);
  }

  if (toolKey === 'inflation-calculator') {
    await setInput(page, '#amountInput', 100000);
    await setInput(page, '#yearsInput', 20);
    await setInput(page, '#inflationInput', 5);
  }

  if (toolKey === 'retirement-planner') {
    const quick = page.locator('#quickModeBtn');
    if (await quick.count()) await quick.click();
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
    await expect(page.locator('#printBtn')).toBeEnabled({ timeout: 10000 });
  }

  if (toolKey === 'sip-calculator') {
    const growth = page.locator('#growthTab');
    if (await growth.count()) await growth.click();
    await setInput(page, '#currentSavings', 100000);
    await setInput(page, '#monthlySIP', 10000);
    await setInput(page, '#years', 15);
    await setInput(page, '#annualReturn', 12);
    await setInput(page, '#annualStepUp', 0);
  }

  await page.waitForTimeout(250);
}
