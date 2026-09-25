import { test, expect } from '@playwright/test';
import { tools, mainSitePages } from '../qa.config.js';
import { gotoClean, monitorPageErrors, setInput } from '../helpers/common.js';
import { chooseIndiaLocale, chooseUnitedStatesLocale } from '../helpers/fixtures.js';

async function setLearnLocaleDirect(page, region, currency) {
  await expect.poll(async () => page.evaluate(() => Boolean(
    window.CarrowmontLocale && typeof window.CarrowmontLocale.setLocale === 'function'
  )), { timeout: 10000, message: 'CarrowmontLocale.setLocale should be available on Learn' }).toBe(true);

  await page.evaluate(({ region, currency }) => {
    window.CarrowmontLocale.setLocale(region, currency);
    if (window.CarrowmontContentLocale && typeof window.CarrowmontContentLocale.apply === 'function') {
      window.CarrowmontContentLocale.apply();
    }
  }, { region, currency });

  await expect.poll(async () => page.evaluate(() => ({
    region: window.CarrowmontLocale?.getRegion?.(),
    currency: window.CarrowmontLocale?.getCurrency?.()
  })), { timeout: 10000, message: `Locale API should report ${region}/${currency}` })
    .toEqual({ region, currency });

  const countryLabels = { IN: 'India', US: 'United States' };
  if (countryLabels[region]) {
    await expect(page.locator('#localeCountryLabel')).toHaveText(countryLabels[region], { timeout: 10000 });
  }
  await expect(page.locator('#localeCurrencyLabel')).toHaveText(currency, { timeout: 10000 });
}

async function expectLearnCategoryOrder(page, expectedFirstThree) {
  const boxes = page.locator('.planning-categories > .category-box');
  await expect(boxes).toHaveCount(6, { timeout: 10000 });
  for (let i = 0; i < expectedFirstThree.length; i += 1) {
    await expect(boxes.nth(i)).toHaveAttribute('data-category', expectedFirstThree[i], { timeout: 10000 });
  }
}

test.describe('Carrowmont smoke and content contracts', () => {
  for (const tool of tools) {
    test(`[AUTO] ${tool.name}: loads without JavaScript errors and required controls exist`, async ({ page }) => {
      const errors = monitorPageErrors(page);
      await gotoClean(page, tool.path);
      if (tool.key === 'sip-calculator') {
        // The same calculator is intentionally localized by country/currency:
        // India/INR uses SIP terminology; international views use Recurring Investment terminology.
        await chooseUnitedStatesLocale(page);
        await expect(page.locator('.product-label')).toHaveText('Recurring Investment Calculator');
        await expect(page.locator('#contributionFrequency')).toHaveValue('biweekly');
        await expect(page.locator('#contributionFrequency option[value="biweekly"]')).toHaveText('Biweekly (Every 2 Weeks)');
        await expect(page.getByRole('heading', { name: /See how biweekly investments may grow/i }).first()).toBeVisible();
        await expect(page.getByText('Generate Investment Report', { exact: true }).first()).toBeVisible();
        const indiaBadgeInternational = page.getByText('POPULAR IN INDIA', { exact: true }).first();
        if (await indiaBadgeInternational.count()) await expect(indiaBadgeInternational).toBeHidden();

        await chooseIndiaLocale(page);
        await expect(page.locator('.product-label')).toHaveText('SIP Calculator');
        await expect(page.locator('#contributionFrequency')).toHaveValue('monthly');
        await expect(page.locator('#contributionFrequency option[value="biweekly"]')).toHaveText('Every 2 Weeks');
        await expect(page.getByRole('heading', { name: /See how a monthly SIP may grow/i }).first()).toBeVisible();
        await expect(page.getByText('Generate SIP Report', { exact: true }).first()).toBeVisible();
        await expect(page.getByText('POPULAR IN INDIA', { exact: true }).first()).toBeVisible();
        await expect(page.getByText('Copy Summary', { exact: true }).first()).toBeVisible();
      } else {
        await expect(page.locator('body')).toContainText(tool.requiredText[0]);
        for (const text of tool.requiredText.slice(1)) await expect(page.getByText(text, { exact: true })).toBeVisible();
      }
      await expect(page.getByText('Back to all Carrowmont tools', { exact: false })).toBeVisible();
      for (const selector of tool.keyInputs) await expect(page.locator(selector), `${tool.name}: ${selector}`).toBeVisible();
      expect(errors, `${tool.name} browser errors:\n${errors.join('\n')}`).toEqual([]);
    });
  }

  test('[AUTO] SIP: changing country reapplies the new country frequency suggestion after a manual override', async ({ page }) => {
    await gotoClean(page, '/sip-calculator/');
    await chooseUnitedStatesLocale(page);
    await expect(page.locator('#contributionFrequency')).toHaveValue('biweekly');

    await page.locator('#contributionFrequency').selectOption('weekly');
    await expect(page.locator('#contributionFrequency')).toHaveValue('weekly');

    await page.locator('#regionSelect').evaluate(el => {
      el.value = 'IN';
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(page.locator('#localeCurrent')).toHaveText(/India\s*·\s*INR/, { timeout: 10000 });
    await expect(page.locator('#contributionFrequency')).toHaveValue('monthly');
    await expect(page.locator('#contributionFrequency option[value="biweekly"]')).toHaveText('Every 2 Weeks');

    await page.locator('#regionSelect').evaluate(el => {
      el.value = 'AU';
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(page.locator('#localeCurrent')).toHaveText(/Australia\s*·\s*AUD/, { timeout: 10000 });
    await expect(page.locator('#contributionFrequency')).toHaveValue('biweekly');
    await expect(page.locator('#contributionFrequency option[value="biweekly"]')).toHaveText('Fortnightly (Every 2 Weeks)');
  });

  test('[AUTO] SIP: changing currency alone preserves a manual contribution-frequency choice', async ({ page }) => {
    await gotoClean(page, '/sip-calculator/');
    await chooseUnitedStatesLocale(page);
    await page.locator('#contributionFrequency').selectOption('weekly');
    await page.locator('#currencySelect').evaluate(el => {
      el.value = 'EUR';
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(page.locator('#contributionFrequency')).toHaveValue('weekly');
  });

  test('[AUTO] SIP: country list is alphabetical, expanded locale profiles are configured, and international terminology stays correct', async ({ page }) => {
    await gotoClean(page, '/sip-calculator/');

    const labels = await page.locator('#regionSelect option').allTextContents();
    expect(labels.at(-1)).toBe('Other / International');
    const countryLabels = labels.slice(0, -1);
    const sortedLabels = [...countryLabels].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
    expect(countryLabels).toEqual(sortedLabels);

    for (const country of ['Austria','Bangladesh','Belgium','Chile','Denmark','Finland','Ireland','Netherlands','Norway','Oman','Poland','Portugal','Qatar','Sweden']) {
      expect(countryLabels).toContain(country);
    }

    const profiles = await page.evaluate(() => {
      const codes = ['AT','BD','BE','CL','DK','FI','IE','NL','NO','OM','PL','PT','QA','SE'];
      return Object.fromEntries(codes.map(code => [code, window.CarrowmontLocale.regions[code]]));
    });
    expect(profiles).toEqual({
      AT: { label:'Austria', locale:'de-AT', currency:'EUR', contributionFrequency:'monthly', twoWeekLabel:'neutral' },
      BD: { label:'Bangladesh', locale:'en-BD', currency:'BDT', contributionFrequency:'monthly', twoWeekLabel:'neutral' },
      BE: { label:'Belgium', locale:'nl-BE', currency:'EUR', contributionFrequency:'monthly', twoWeekLabel:'neutral' },
      CL: { label:'Chile', locale:'es-CL', currency:'CLP', contributionFrequency:'monthly', twoWeekLabel:'neutral' },
      DK: { label:'Denmark', locale:'da-DK', currency:'DKK', contributionFrequency:'monthly', twoWeekLabel:'neutral' },
      FI: { label:'Finland', locale:'fi-FI', currency:'EUR', contributionFrequency:'monthly', twoWeekLabel:'neutral' },
      IE: { label:'Ireland', locale:'en-IE', currency:'EUR', contributionFrequency:'monthly', twoWeekLabel:'fortnightly' },
      NL: { label:'Netherlands', locale:'nl-NL', currency:'EUR', contributionFrequency:'monthly', twoWeekLabel:'neutral' },
      NO: { label:'Norway', locale:'nb-NO', currency:'NOK', contributionFrequency:'monthly', twoWeekLabel:'neutral' },
      OM: { label:'Oman', locale:'en-OM', currency:'OMR', contributionFrequency:'monthly', twoWeekLabel:'neutral' },
      PL: { label:'Poland', locale:'pl-PL', currency:'PLN', contributionFrequency:'monthly', twoWeekLabel:'neutral' },
      PT: { label:'Portugal', locale:'pt-PT', currency:'EUR', contributionFrequency:'monthly', twoWeekLabel:'neutral' },
      QA: { label:'Qatar', locale:'en-QA', currency:'QAR', contributionFrequency:'monthly', twoWeekLabel:'neutral' },
      SE: { label:'Sweden', locale:'sv-SE', currency:'SEK', contributionFrequency:'monthly', twoWeekLabel:'neutral' }
    });

    await page.locator('#regionSelect').evaluate(el => {
      el.value = 'BD';
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(page.locator('#localeCurrent')).toHaveText(/Bangladesh\s*·\s*BDT/, { timeout: 10000 });
    await expect(page.locator('.product-label')).toHaveText('Recurring Investment Calculator');
    await expect(page.locator('#sipAmountLabel')).toHaveText('Current monthly investment');
    await expect(page.locator('.currency-prefix').first()).toHaveText('৳');
    await expect(page.locator('#contributionFrequency option[value="biweekly"]')).toHaveText('Every 2 Weeks');

    await page.locator('#regionSelect').evaluate(el => {
      el.value = 'IE';
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(page.locator('#contributionFrequency option[value="biweekly"]')).toHaveText('Fortnightly (Every 2 Weeks)');
  });

  test('[AUTO] Goal Planner: frequency inputs are independent, linkable, and country-aware', async ({ page }) => {
    await gotoClean(page, '/goal-planner/');
    const pay = page.locator('#payFrequency');
    const contribution = page.locator('#contributionFrequency');

    // Browser locale can legitimately initialize Goal Planner to the US (biweekly).
    // Set India explicitly before validating the Monthly country default so this
    // test is deterministic in CI and still verifies the country-aware behavior.
    await chooseIndiaLocale(page);
    await expect(pay).toHaveValue('monthly');
    await expect(contribution).toHaveValue('monthly');
    await expect(pay.locator('option[value="biweekly"]')).toHaveText('Every 2 Weeks');
    await expect(contribution.locator('option[value="biweekly"]')).toHaveText('Every 2 Weeks');

    await chooseUnitedStatesLocale(page);
    await expect(pay).toHaveValue('biweekly');
    await expect(contribution).toHaveValue('biweekly');
    await expect(contribution.locator('option[value="biweekly"]')).toHaveText('Biweekly (Every 2 Weeks)');

    await contribution.selectOption('weekly');
    await expect(pay).toHaveValue('biweekly');
    await expect(contribution).toHaveValue('weekly');

    await page.locator('#sameAsPayCycle').check();
    await expect(contribution).toBeDisabled();
    await expect(contribution).toHaveValue('biweekly');
    await pay.selectOption('semimonthly');
    await expect(contribution).toHaveValue('semimonthly');

    await page.locator('#sameAsPayCycle').uncheck();
    await expect(contribution).toBeEnabled();
    await contribution.selectOption('weekly');
    await expect(pay).toHaveValue('semimonthly');
    await expect(contribution).toHaveValue('weekly');
  });

  test('[AUTO] Goal Planner: one-time investment timing appears only when an amount is entered', async ({ page }) => {
    await gotoClean(page, '/goal-planner/');
    await expect(page.locator('#futureLumpTimingField')).toBeHidden();
    await setInput(page, '#futureLump', 50000);
    await expect(page.locator('#futureLumpTimingField')).toBeVisible();
    await expect(page.locator('#futureLumpYear')).toBeEnabled();
    await setInput(page, '#futureLump', 0);
    await expect(page.locator('#futureLumpTimingField')).toBeHidden();
    await expect(page.locator('#futureLumpYear')).toBeDisabled();
  });

  test('[AUTO] Other calculators: country catalogue matches SIP expansion and is alphabetical', async ({ page }) => {
    const localeTools = tools.filter(tool => tool.key !== 'sip-calculator');
    const expectedAdded = ['Austria','Bangladesh','Belgium','Chile','Denmark','Finland','Ireland','Netherlands','Norway','Oman','Poland','Portugal','Qatar','Sweden'];
    for (const tool of localeTools) {
      await gotoClean(page, tool.path);
      const labels = await page.locator('#regionSelect option').allTextContents();
      expect(labels).toHaveLength(44);
      expect(labels.at(-1)).toBe('Other / International');
      const countryLabels = labels.slice(0, -1);
      const sortedLabels = [...countryLabels].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
      expect(countryLabels, `${tool.name}: country list should be alphabetical`).toEqual(sortedLabels);
      for (const country of expectedAdded) expect(countryLabels, `${tool.name}: missing ${country}`).toContain(country);
    }
  });

  for (const p of mainSitePages) {
    test(`[AUTO] Main site ${p.key}: loads and contains expected content`, async ({ page }) => {
      const errors = monitorPageErrors(page);
      await gotoClean(page, p.path);
      await expect(page.locator('body')).toContainText(p.text);
      expect(errors, `Main site ${p.key} errors:\n${errors.join('\n')}`).toEqual([]);
    });
  }

  test('[AUTO] Learn hub localization contract v3: country controls terminology/order and currency controls money examples', async ({ page }) => {
    const errors = monitorPageErrors(page);
    await gotoClean(page, '/learn.html');

    // India + INR: India terminology and India-first content order.
    await setLearnLocaleDirect(page, 'IN', 'INR');
    await expect(page.locator('#investmentCategoryTitle')).toHaveText('Monthly Investment (SIP)', { timeout: 10000 });
    await expect(page.locator('#investmentTargetTopicTitle')).toContainText('₹1 crore', { timeout: 10000 });
    await expect(page.locator('#investmentMonthlyTopicTitle')).toContainText('₹10,000', { timeout: 10000 });
    await expectLearnCategoryOrder(page, ['investment', 'retirement', 'goals']);

    // United States + USD: international terminology, USD examples and international order.
    await setLearnLocaleDirect(page, 'US', 'USD');
    await expect(page.locator('#investmentCategoryTitle')).toHaveText('Monthly Investment', { timeout: 10000 });
    await expect(page.locator('#investmentTargetTopicTitle')).toContainText('$1 million', { timeout: 10000 });
    await expect(page.locator('#investmentMonthlyTopicTitle')).toContainText('$500', { timeout: 10000 });
    await expect(page.locator('#investmentCategoryTitle')).not.toContainText('SIP', { timeout: 10000 });
    await expectLearnCategoryOrder(page, ['retirement', 'goals', 'investment']);

    // India + USD: country still controls SIP terminology/order; currency controls money examples.
    await setLearnLocaleDirect(page, 'IN', 'USD');
    await expect(page.locator('#investmentCategoryTitle')).toHaveText('Monthly Investment (SIP)', { timeout: 10000 });
    await expect(page.locator('#investmentTargetTopicTitle')).toContainText('$1 million', { timeout: 10000 });
    await expect(page.locator('#investmentMonthlyTopicTitle')).toContainText('$500', { timeout: 10000 });
    await expectLearnCategoryOrder(page, ['investment', 'retirement', 'goals']);

    expect(errors, `Learn hub browser errors:
${errors.join('\n')}`).toEqual([]);
  });

  test('[AUTO] Homepage: India/INR Want to build section is present near the first viewport on desktop', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'Desktop visibility check');
    await gotoClean(page, '/');
    await chooseIndiaLocale(page);
    const target = page.locator('.india-sip-spotlight h2').filter({ hasText: /Want to build/i }).filter({ hasText: /1\s*Crore/i }).first();
    await expect(target).toBeVisible();
    const box = await target.boundingBox();
    expect(box).not.toBeNull();
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    expect(box.y, 'The India/INR 1 Crore section should begin within roughly one viewport plus a small scroll cue').toBeLessThan(viewportHeight + 350);
  });
});
