import { expect } from '@playwright/test';
import { setInput } from './common.js';

export async function chooseIndiaLocale(page) {
  const summary = page.locator('#localeSummary, #localeMenu > summary, summary.locale-summary').first();
  const current = page.locator('#localeCurrent').first();
  const country = page.locator('#localeCountryLabel').first();
  const currencyLabel = page.locator('#localeCurrencyLabel').first();

  const currentText = (await current.count()) ? (await current.innerText().catch(() => '')) : '';
  const countryText = (await country.count()) ? (await country.innerText().catch(() => '')) : '';
  const currencyText = (await currencyLabel.count()) ? (await currencyLabel.innerText().catch(() => '')) : '';
  const indiaAlreadySelected = /India\s*·\s*INR/i.test(currentText) || (/^India$/i.test(countryText.trim()) && /^INR$/i.test(currencyText.trim()));
  const indiaExperienceActive = await page.locator('body.india-inr').count().catch(() => 0);
  if (indiaAlreadySelected && indiaExperienceActive) return;

  if (await summary.count()) {
    const details = summary.locator('xpath=ancestor::details[1]');
    const needsOpen = (await details.count()) && !(await details.getAttribute('open'));
    if (needsOpen || !(await details.count())) await summary.click().catch(() => {});
  }

  const region = page.locator('#regionSelect');
  const currency = page.locator('#currencySelect');
  if (await region.count()) {
    const options = await region.locator('option').evaluateAll(opts => opts.map(o => ({ value: o.value, text: (o.textContent || '').trim() })));
    const india = options.find(o => o.value === 'IN') || options.find(o => /^India$/i.test(o.text));
    if (india) await region.selectOption(india.value);
  }
  if (await currency.count()) {
    const options = await currency.locator('option').evaluateAll(opts => opts.map(o => ({ value: o.value, text: (o.textContent || '').trim() })));
    const inr = options.find(o => o.value === 'INR') || options.find(o => /INR/i.test(o.text));
    if (inr) await currency.selectOption(inr.value);
  }

  const done = page.locator('#localeDone, #localeDoneBtn').filter({ visible: true }).first();
  if (await done.count()) await done.click().catch(() => {});

  await page.waitForFunction(() => {
    const bodyIndia = document.body.classList.contains('india-inr');
    const c = document.querySelector('#localeCountryLabel')?.textContent?.trim();
    const m = document.querySelector('#localeCurrencyLabel')?.textContent?.trim();
    const current = document.querySelector('#localeCurrent')?.textContent || '';
    return bodyIndia || (c === 'India' && m === 'INR') || /India\s*·\s*INR/i.test(current);
  }, null, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(200);
}


export async function chooseUnitedStatesLocale(page) {
  const summary = page.locator('#localeSummary, #localeMenu > summary, summary.locale-summary').first();
  const current = page.locator('#localeCurrent').first();
  const country = page.locator('#localeCountryLabel').first();
  const currencyLabel = page.locator('#localeCurrencyLabel').first();

  const currentText = (await current.count()) ? (await current.innerText().catch(() => '')) : '';
  const countryText = (await country.count()) ? (await country.innerText().catch(() => '')) : '';
  const currencyText = (await currencyLabel.count()) ? (await currencyLabel.innerText().catch(() => '')) : '';
  const usAlreadySelected = /United States\s*·\s*USD/i.test(currentText) || (/^United States$/i.test(countryText.trim()) && /^USD$/i.test(currencyText.trim()));
  const indiaExperienceActive = await page.locator('body.india-inr').count().catch(() => 0);
  if (usAlreadySelected && !indiaExperienceActive) return;

  if (await summary.count()) {
    const details = summary.locator('xpath=ancestor::details[1]');
    const needsOpen = (await details.count()) && !(await details.getAttribute('open'));
    if (needsOpen || !(await details.count())) await summary.click().catch(() => {});
  }

  const region = page.locator('#regionSelect');
  const currency = page.locator('#currencySelect');
  if (await region.count()) {
    const options = await region.locator('option').evaluateAll(opts => opts.map(o => ({ value: o.value, text: (o.textContent || '').trim() })));
    const us = options.find(o => o.value === 'US') || options.find(o => /^United States$/i.test(o.text));
    if (us) await region.selectOption(us.value);
  }
  if (await currency.count()) {
    const options = await currency.locator('option').evaluateAll(opts => opts.map(o => ({ value: o.value, text: (o.textContent || '').trim() })));
    const usd = options.find(o => o.value === 'USD') || options.find(o => /USD/i.test(o.text));
    if (usd) await currency.selectOption(usd.value);
  }

  const done = page.locator('#localeDone, #localeDoneBtn').filter({ visible: true }).first();
  if (await done.count()) await done.click().catch(() => {});

  await page.waitForFunction(() => {
    const bodyIndia = document.body.classList.contains('india-inr');
    const c = document.querySelector('#localeCountryLabel')?.textContent?.trim();
    const m = document.querySelector('#localeCurrencyLabel')?.textContent?.trim();
    const current = document.querySelector('#localeCurrent')?.textContent || '';
    return !bodyIndia && ((c === 'United States' && m === 'USD') || /United States\s*·\s*USD/i.test(current));
  }, null, { timeout: 5000 }).catch(() => {});
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
    const goalContributionFrequency = page.locator('#contributionFrequency');
    if (await goalContributionFrequency.count()) await goalContributionFrequency.selectOption('monthly');
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
    const frequency = page.locator('#contributionFrequency');
    if (await frequency.count()) await frequency.selectOption('monthly');
    await setInput(page, '#currentSavings', 100000);
    await setInput(page, '#monthlySIP', 10000);
    await setInput(page, '#years', 15);
    await setInput(page, '#annualReturn', 12);
    await setInput(page, '#annualStepUp', 0);
  }

  await page.waitForTimeout(250);
}
