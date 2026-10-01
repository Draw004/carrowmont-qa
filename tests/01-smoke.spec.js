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

async function expectLearnCategoryOrder(page, expectedCategories) {
  const boxes = page.locator('.planning-categories > .category-box');
  await expect(boxes).toHaveCount(expectedCategories.length, { timeout: 10000 });
  for (let i = 0; i < expectedCategories.length; i += 1) {
    await expect(boxes.nth(i)).toHaveAttribute('data-category', expectedCategories[i], { timeout: 10000 });
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
    await expect(page.locator('#currentContributionLabel')).toHaveText('Current monthly contribution');
    await expect(page.locator('#currentContributionHelp')).toHaveText('Enter how much you currently contribute per month toward this goal.');

    const fieldOrder = await page.evaluate(() => {
      const top = id => document.getElementById(id).closest('.field').getBoundingClientRect().top;
      const contributionField = document.getElementById('contributionFrequency').closest('.field');
      return {
        payTop: top('payFrequency'),
        contributionTop: top('contributionFrequency'),
        savingsTop: top('existingSavings'),
        amountTop: top('monthlyContribution'),
        linkInsideContributionField: contributionField.contains(document.getElementById('sameAsPayCycle'))
      };
    });
    expect(fieldOrder.payTop).toBeLessThan(fieldOrder.savingsTop);
    expect(fieldOrder.contributionTop).toBeLessThan(fieldOrder.amountTop);
    expect(fieldOrder.linkInsideContributionField).toBe(true);

    await chooseUnitedStatesLocale(page);
    await expect(pay).toHaveValue('biweekly');
    await expect(contribution).toHaveValue('biweekly');
    await expect(contribution.locator('option[value="biweekly"]')).toHaveText('Biweekly (Every 2 Weeks)');

    await contribution.selectOption('weekly');
    await expect(pay).toHaveValue('biweekly');
    await expect(contribution).toHaveValue('weekly');
    await expect(page.locator('#currentContributionLabel')).toHaveText('Current weekly contribution');
    await expect(page.locator('#currentContributionHelp')).toHaveText('Enter how much you currently contribute per week toward this goal.');

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

  test('[AUTO] Financial Independence: frequency inputs are first, independent, linkable, and country-aware', async ({ page }) => {
    await gotoClean(page, '/financial-independence/');
    const pay = page.locator('#payFrequency');
    const investment = page.locator('#investmentFrequency');

    await chooseIndiaLocale(page);
    await expect(pay).toHaveValue('monthly');
    await expect(investment).toHaveValue('monthly');
    await expect(pay.locator('option[value="biweekly"]')).toHaveText('Every 2 Weeks');
    await expect(investment.locator('option[value="biweekly"]')).toHaveText('Every 2 Weeks');
    await expect(page.locator('#currentInvestmentLabel')).toHaveText('Current monthly investment');

    const fieldOrder = await page.evaluate(() => {
      const top = id => document.getElementById(id).closest('.field').getBoundingClientRect().top;
      const investmentField = document.getElementById('investmentFrequency').closest('.field');
      const fieldsGrid = document.getElementById('payFrequency').closest('.fields');
      const gridColumns = getComputedStyle(fieldsGrid).gridTemplateColumns.split(/\s+/).filter(Boolean);
      return {
        payTop: top('payFrequency'),
        investmentTop: top('investmentFrequency'),
        assetsTop: top('currentAssets'),
        amountTop: top('monthlyContribution'),
        singleColumn: gridColumns.length === 1,
        linkInsideInvestmentField: investmentField.contains(document.getElementById('sameAsPayCycle'))
      };
    });
    expect(fieldOrder.payTop).toBeLessThan(fieldOrder.assetsTop);
    expect(fieldOrder.investmentTop).toBeLessThan(fieldOrder.amountTop);
    if (fieldOrder.singleColumn) {
      expect(fieldOrder.payTop).toBeLessThan(fieldOrder.investmentTop);
      expect(fieldOrder.investmentTop).toBeLessThan(fieldOrder.assetsTop);
      expect(fieldOrder.assetsTop).toBeLessThan(fieldOrder.amountTop);
    } else {
      expect(Math.abs(fieldOrder.payTop - fieldOrder.investmentTop)).toBeLessThan(8);
    }
    expect(fieldOrder.linkInsideInvestmentField).toBe(true);

    await chooseUnitedStatesLocale(page);
    await expect(pay).toHaveValue('biweekly');
    await expect(investment).toHaveValue('biweekly');
    await expect(investment.locator('option[value="biweekly"]')).toHaveText('Biweekly (Every 2 Weeks)');

    await investment.selectOption('weekly');
    await expect(pay).toHaveValue('biweekly');
    await expect(investment).toHaveValue('weekly');
    await expect(page.locator('#currentInvestmentLabel')).toHaveText('Current weekly investment');
    await expect(page.locator('#currentInvestmentHelp')).toHaveText('Enter how much you currently invest per week toward Financial Independence.');

    await page.locator('#sameAsPayCycle').check();
    await expect(investment).toBeDisabled();
    await expect(investment).toHaveValue('biweekly');
    await pay.selectOption('semimonthly');
    await expect(investment).toHaveValue('semimonthly');

    await page.locator('#sameAsPayCycle').uncheck();
    await expect(investment).toBeEnabled();
    await investment.selectOption('weekly');
    await expect(pay).toHaveValue('semimonthly');
    await expect(investment).toHaveValue('weekly');
  });

  test('[AUTO] Financial Independence: Plan Until Age is a distinct planning mode with clear controls', async ({ page }) => {
    await gotoClean(page, '/financial-independence/');
    await expect(page.locator('#planningModeSustainable')).toBeChecked();
    await expect(page.locator('#withdrawalRateField')).toBeVisible();
    await expect(page.locator('#planUntilField')).toBeHidden();

    await page.locator('#planningModeUntilAge').check();
    await expect(page.locator('#planUntilField')).toBeVisible();
    await expect(page.locator('#withdrawalRateField')).toBeHidden();
    await expect(page.locator('#fiHeroLabel')).toHaveText('Required portfolio if FI started today');

    // Locale-neutral QA starts some tools with zeroed money inputs. Enter explicit
    // plan data before asserting that longevity outputs are rendered.
    await setInput(page, '#monthlySpending', 100000);
    await setInput(page, '#currentAssets', 1500000);
    await setInput(page, '#monthlyContribution', 30000);
    await expect(page.locator('#longevityBox')).toBeVisible();
    await expect(page.locator('#scenariosSection .section-head h2')).toHaveText('Today and your Target Age');
    await expect(page.locator('#scenariosSection .section-head p')).toContainText('Plan Longevity');
    await expect(page.locator('#scenarioGrid .scenario')).toHaveCount(2);
    await expect(page.locator('#scenarioGrid')).toHaveClass(/plan-until-grid/);
    await expect(page.locator('#scenarioGrid')).not.toContainText('Target Age +5');
    await expect(page.locator('#pathChartTitle')).toHaveText('Required portfolio vs accumulation path');
    await expect(page.locator('#growthChartTitle')).toHaveText('Portfolio balance through Plan Until Age');
    await expect(page.locator('#growthChartNote')).toContainText('spending rises with inflation');
    await expect(page.locator('#fiJourney .section-head h2')).toHaveText('See the full path from investing to portfolio drawdown');
    await expect(page.locator('#journeyHeadRow')).toContainText('Portfolio-funded spending');
    await expect(page.locator('#journeyHeadRow')).toContainText('End portfolio value');

    await setInput(page, '#targetAge', 60);
    await setInput(page, '#planUntilAge', 55);
    await page.locator('#planUntilAge').blur();
    await expect(page.locator('#planUntilAge')).toHaveValue('55');
    await expect(page.locator('#planUntilAge')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#planUntilAgeError')).toBeVisible();
    await expect(page.locator('#planUntilAgeError')).toHaveText('Plan Until Age must be greater than your Target Financial Independence Age.');
    await expect(page.locator('#targetPill')).toContainText('Plan until —');
    await expect(page.locator('#copyBtn')).toBeDisabled();
    await expect(page.locator('#reportBtn')).toBeDisabled();

    // Correcting the value should clear the validation state and restore the plan.
    await setInput(page, '#planUntilAge', 61);
    await page.locator('#planUntilAge').blur();
    await expect(page.locator('#planUntilAge')).toHaveValue('61');
    await expect(page.locator('#planUntilAge')).toHaveAttribute('aria-invalid', 'false');
    await expect(page.locator('#planUntilAgeError')).toBeHidden();
    await expect(page.locator('#targetPill')).toContainText('Plan until 61');
    await expect(page.locator('#copyBtn')).toBeEnabled();
    await expect(page.locator('#reportBtn')).toBeEnabled();

    // Manual keyboard entry must not be overwritten after the first digit by
    // the calculator's live-render cycle.
    const planUntil = page.locator('#planUntilAge');
    await planUntil.click();
    await planUntil.press('Control+A');
    await planUntil.pressSequentially('100');
    await expect(planUntil).toHaveValue('100');
    await planUntil.blur();
    await expect(planUntil).toHaveValue('100');
    await expect(page.locator('#targetPill')).toContainText('Plan until 100');

    // Raising Target FI Age above an existing Plan Until Age must surface the
    // same validation error without silently rewriting the user's horizon.
    await setInput(page, '#planUntilAge', 65);
    await page.locator('#planUntilAge').blur();
    await setInput(page, '#targetAge', 70);
    await page.locator('#targetAge').blur();
    await expect(page.locator('#planUntilAge')).toHaveValue('65');
    await expect(page.locator('#planUntilAgeError')).toBeVisible();
    await expect(page.locator('#planUntilAgeError')).toHaveText('Plan Until Age must be greater than your Target Financial Independence Age.');

    await page.locator('#planningModeSustainable').check();
    await expect(page.locator('#withdrawalRateField')).toBeVisible();
    await expect(page.locator('#planUntilField')).toBeHidden();
    await expect(page.locator('#longevityBox')).toBeHidden();
    await expect(page.locator('#fiHeroLabel')).toHaveText('Estimated FI number in today’s money');
    await expect(page.locator('#scenariosSection .section-head h2')).toHaveText('Today, your Target Age and Target Age +5');
    await expect(page.locator('#scenarioGrid .scenario')).toHaveCount(3);
    await expect(page.locator('#scenarioGrid')).not.toHaveClass(/plan-until-grid/);
    await expect(page.locator('#scenarioGrid')).toContainText('Target Age +5');
    await expect(page.locator('#pathChartTitle')).toHaveText('FI target vs projected portfolio value');
    await expect(page.locator('#growthChartTitle')).toHaveText('Money added vs projected portfolio value');
    await expect(page.locator('#journeyHeadRow')).toContainText('Total money added');
    await expect(page.locator('#journeyHeadRow')).not.toContainText('Portfolio-funded spending');
  });

  test('[AUTO] Retirement Planner: frequency inputs are first, independent, linkable, and country-aware', async ({ page }) => {
    await gotoClean(page, '/retirement-calculator/planner.html');
    const pay = page.locator('#payFrequency');
    const contribution = page.locator('#contributionFrequency');

    await chooseIndiaLocale(page);
    await expect(pay).toHaveValue('monthly');
    await expect(contribution).toHaveValue('monthly');
    await expect(pay.locator('option[value="biweekly"]')).toHaveText('Every 2 Weeks');
    await expect(contribution.locator('option[value="biweekly"]')).toHaveText('Every 2 Weeks');
    await expect(page.locator('#currentContributionLabel')).toHaveText('Current monthly retirement contribution');
    await expect(page.locator('#currentContributionHelp')).toHaveText('Enter how much you currently contribute per month toward retirement.');

    const fieldOrder = await page.evaluate(() => {
      const top = id => document.getElementById(id).closest('.field-card').getBoundingClientRect().top;
      const contributionField = document.getElementById('contributionFrequency').closest('.field-card');
      const formGrid = document.getElementById('payFrequency').closest('.form-grid');
      const gridColumns = getComputedStyle(formGrid).gridTemplateColumns.split(/\s+/).filter(Boolean);
      return {
        payTop: top('payFrequency'),
        contributionTop: top('contributionFrequency'),
        savingsTop: top('currentSavings'),
        amountTop: top('currentMonthlyInvestment'),
        singleColumn: gridColumns.length === 1,
        linkInsideContributionField: contributionField.contains(document.getElementById('sameAsPayCycle'))
      };
    });
    expect(fieldOrder.payTop).toBeLessThan(fieldOrder.savingsTop);
    expect(fieldOrder.contributionTop).toBeLessThan(fieldOrder.amountTop);
    if (fieldOrder.singleColumn) {
      expect(fieldOrder.payTop).toBeLessThan(fieldOrder.contributionTop);
      expect(fieldOrder.contributionTop).toBeLessThan(fieldOrder.savingsTop);
      expect(fieldOrder.savingsTop).toBeLessThan(fieldOrder.amountTop);
    } else {
      expect(Math.abs(fieldOrder.payTop - fieldOrder.contributionTop)).toBeLessThan(8);
    }
    expect(fieldOrder.linkInsideContributionField).toBe(true);

    await chooseUnitedStatesLocale(page);
    await expect(pay).toHaveValue('biweekly');
    await expect(contribution).toHaveValue('biweekly');
    await expect(contribution.locator('option[value="biweekly"]')).toHaveText('Biweekly (Every 2 Weeks)');

    await contribution.selectOption('weekly');
    await expect(pay).toHaveValue('biweekly');
    await expect(contribution).toHaveValue('weekly');
    await expect(page.locator('#currentContributionLabel')).toHaveText('Current weekly retirement contribution');

    await page.locator('#sameAsPayCycle').check();
    await expect(contribution).toBeDisabled();
    await expect(contribution).toHaveValue('biweekly');
    await pay.selectOption('semimonthly');
    await expect(contribution).toHaveValue('semimonthly');

    await page.locator('#sameAsPayCycle').uncheck();
    await expect(contribution).toBeEnabled();
    await contribution.selectOption('fourweekly');
    await expect(pay).toHaveValue('semimonthly');
    await expect(contribution).toHaveValue('fourweekly');
    await expect(page.locator('#currentContributionLabel')).toHaveText('Current retirement contribution every 4 weeks');
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

  test('[AUTO] Shared UI: all tool footers expose the six-tool registry with no navigation arrows', async ({ page }) => {
    const expectedHrefs = ['/sip-calculator/','/retirement-calculator/','/inflation-calculator/','/goal-planner/','/financial-independence/','/budget-cash-flow-planner/','/#tools'];
    for (const tool of tools) {
      await gotoClean(page, tool.path);
      const footer = page.locator('.site-footer .footer-col').filter({ has: page.locator('strong', { hasText: 'Tools' }) }).first();
      await expect(footer, `${tool.name}: Tools footer column`).toBeVisible();
      const hrefs = await footer.locator('a').evaluateAll(links => links.map(a => a.getAttribute('href')));
      for (const href of expectedHrefs) expect(hrefs, `${tool.name}: missing footer link ${href}`).toContain(href);
      expect(await footer.innerText(), `${tool.name}: footer navigation must not contain arrows`).not.toContain('→');
    }
  });

  test('[AUTO] Shared UI: currency options use CODE dot Currency Name across all tools', async ({ page }) => {
    for (const tool of tools) {
      await gotoClean(page, tool.path);
      const labels = await page.locator('#currencySelect option').allTextContents();
      expect(labels.length, `${tool.name}: currency list should not be empty`).toBeGreaterThan(5);
      for (const label of labels) expect(label, `${tool.name}: currency label ${label}`).toMatch(/^[A-Z]{3} · .+/);
    }
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
    await expectLearnCategoryOrder(page, ['investment', 'assets', 'retirement', 'budget', 'goals', 'fi', 'inflation', 'foundation']);

    // United States + USD: international terminology, USD examples and international order.
    await setLearnLocaleDirect(page, 'US', 'USD');
    await expect(page.locator('#investmentCategoryTitle')).toHaveText('Monthly Investment', { timeout: 10000 });
    await expect(page.locator('#investmentTargetTopicTitle')).toContainText('$1 million', { timeout: 10000 });
    await expect(page.locator('#investmentMonthlyTopicTitle')).toContainText('$500', { timeout: 10000 });
    await expect(page.locator('#investmentCategoryTitle')).not.toContainText('SIP', { timeout: 10000 });
    await expectLearnCategoryOrder(page, ['retirement', 'assets', 'budget', 'goals', 'investment', 'fi', 'inflation', 'foundation']);

    // India + USD: country still controls SIP terminology/order; currency controls money examples.
    await setLearnLocaleDirect(page, 'IN', 'USD');
    await expect(page.locator('#investmentCategoryTitle')).toHaveText('Monthly Investment (SIP)', { timeout: 10000 });
    await expect(page.locator('#investmentTargetTopicTitle')).toContainText('$1 million', { timeout: 10000 });
    await expect(page.locator('#investmentMonthlyTopicTitle')).toContainText('$500', { timeout: 10000 });
    await expectLearnCategoryOrder(page, ['investment', 'assets', 'retirement', 'budget', 'goals', 'fi', 'inflation', 'foundation']);

    expect(errors, `Learn hub browser errors:
${errors.join('\n')}`).toEqual([]);
  });


  test('[AUTO] Homepage: expanded country catalogue is alphabetical and Home is not duplicated in navigation', async ({ page }) => {
    await gotoClean(page, '/');
    const labels = await page.locator('#regionSelect option').allTextContents();
    expect(labels.at(-1)).toBe('Other / International');
    const countryLabels = labels.slice(0, -1);
    const sortedLabels = [...countryLabels].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
    expect(countryLabels).toEqual(sortedLabels);
    for (const country of ['Austria','Bangladesh','Belgium','Chile','Denmark','Finland','Ireland','Netherlands','Norway','Oman','Poland','Portugal','Qatar','Sweden']) {
      expect(countryLabels).toContain(country);
    }
    await expect(page.locator('.desktop-nav a', { hasText: /^Home$/ })).toHaveCount(0);
    await expect(page.locator('.hero-points .hero-point-icon')).toHaveCount(3);
    await expect(page.locator('.site-footer')).toHaveCSS('background-color', 'rgb(16, 41, 69)');
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

  test('[AUTO] Learn expansion: 14 new guides load with indexable article metadata', async ({ page }) => {
    const guides = [
      '/50-30-20-budget-rule.html','/zero-based-budgeting.html','/pay-yourself-first-budgeting.html','/sinking-fund-vs-emergency-fund.html',
      '/budgeting-with-irregular-income.html','/cash-flow-vs-income.html','/lifestyle-inflation.html','/how-much-should-i-save-each-month.html',
      '/budgeting-by-pay-frequency.html','/sequence-of-returns-risk.html','/4-percent-rule-retirement.html','/longevity-risk-retirement.html',
      '/coast-fire-explained.html','/sip-during-market-fall.html'
    ];
    for (const url of guides) {
      const errors = [];
      const onError = err => errors.push(err.message);
      page.on('pageerror', onError);
      await gotoClean(page, url);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /index,follow/);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://carrowmont.com' + url);
      const schema = await page.locator('script[type="application/ld+json"]').first().textContent();
      expect(schema || '').toContain('Article');
      expect(schema || '').toContain('Carrowmont');
      expect(errors, `${url} browser errors:\n${errors.join('\n')}`).toEqual([]);
      page.off('pageerror', onError);
    }
  });


  test('[AUTO] Assets & Investing expansion: 12 new global guides load with indexable metadata', async ({ page }) => {
    const guides = [
      '/gold-as-an-investment.html',
      '/physical-gold-vs-gold-etf.html',
      '/gold-vs-stocks.html',
      '/gold-and-inflation.html',
      '/rent-vs-buy-home.html',
      '/rental-yield-explained.html',
      '/real-estate-vs-stocks.html',
      '/what-is-a-reit.html',
      '/reit-vs-direct-property.html',
      '/asset-allocation-explained.html',
      '/stocks-vs-bonds.html',
      '/diversification-across-asset-classes.html',
    ];
    for (const url of guides) {
      const errors = [];
      const onError = err => errors.push(err.message);
      page.on('pageerror', onError);
      await gotoClean(page, url);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /index,follow/);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://carrowmont.com' + url);
      const schema = await page.locator('script[type="application/ld+json"]').first().textContent();
      expect(schema || '').toContain('Article');
      expect(schema || '').toContain('Carrowmont');
      await expect(page.locator('.reference-note')).toHaveCount(1);
      expect(errors, `${url} browser errors:\n${errors.join('\n')}`).toEqual([]);
      page.off('pageerror', onError);
    }
  });


  test('[AUTO] Learn article standard: compact hero, top tool action, bottom tool return, sources and disclaimer', async ({ page }, testInfo) => {
    const guides = [
      '/50-30-20-budget-rule.html',
      '/how-much-money-do-i-need-to-retire.html',
      '/compounding-and-time.html',
    ];
    for (const url of guides) {
      const errors = [];
      const onError = err => errors.push(err.message);
      page.on('pageerror', onError);
      await gotoClean(page, url);
      await expect(page.locator('body')).toHaveAttribute('data-cm-learn-article', '1');
      const h1 = page.locator('.learn-page-hero h1');
      await expect(h1).toHaveCount(1);
      const heroFontSize = await h1.evaluate(el => parseFloat(getComputedStyle(el).fontSize));
      if (testInfo.project.name === 'mobile-chromium') expect(heroFontSize).toBeLessThanOrEqual(40.5);
      else expect(heroFontSize).toBeLessThanOrEqual(56.5);
      const topAction = page.locator('.guide-action-first a[href]').first();
      await expect(topAction).toBeVisible();
      const topHref = await topAction.getAttribute('href');
      const bottomAction = page.locator('.learn-tool-return a[href]').first();
      await expect(bottomAction).toBeVisible();
      await expect(bottomAction).toHaveAttribute('href', topHref || '');
      await expect(page.locator('details.reference-note')).toHaveCount(1);
      await expect(page.locator('.learn-disclaimer')).toHaveCount(1);
      await expect(page.locator('.learn-more-row a[href="/learn.html"]')).toHaveCount(1);
      expect(errors, `${url} browser errors:\n${errors.join('\n')}`).toEqual([]);
      page.off('pageerror', onError);
    }
  });


  test('[AUTO] Learn v2 depth: representative pillar guides include rich answer, analysis, FAQ and sources', async ({ page }) => {
    const guides = [
      '/asset-allocation-explained.html',
      '/gold-as-an-investment.html',
      '/rent-vs-buy-home.html',
      '/4-percent-rule-retirement.html',
      '/sequence-of-returns-risk.html',
      '/financial-independence-number.html',
      '/inflation-value-of-money-over-time.html',
    ];
    for (const url of guides) {
      await gotoClean(page, url);
      await expect(page.locator('[data-cm-rich="1"]')).toHaveCount(1);
      await expect(page.locator('[data-cm-depth="1"]')).toHaveCount(1);
      await expect(page.locator('.guide-answer')).toHaveCount(1);
      expect(await page.locator('.guide-section h2').count(), `${url} should have substantive section depth`).toBeGreaterThanOrEqual(8);
      expect(await page.locator('details.reference-note a[href]').count(), `${url} should cite authoritative sources`).toBeGreaterThanOrEqual(3);
      await expect(page.getByRole('heading', { name: 'Frequently asked questions', exact: true })).toHaveCount(1);
      const guideText = (await page.locator('.guide-section').innerText()).trim();
      expect(guideText.split(/\s+/).length, `${url} should not regress to a thin guide`).toBeGreaterThanOrEqual(850);
    }
  });

});


test.describe('Budget & Cash Flow Planner contracts', () => {
  test('[AUTO] Budget: monthly and pay-cycle views, local save and deterministic insights work', async ({ page }) => {
    const errors = monitorPageErrors(page);
    await gotoClean(page, '/budget-cash-flow-planner/');
    await page.locator('#loadDefaultsBtn').click();
    await expect(page.locator('#moneyRemaining')).toContainText(/31,000|31K|31 k|₹31/);
    await expect(page.locator('#savingsRate')).toHaveText('12.5%');
    await page.getByRole('button', { name: 'Pay Cycle View' }).click();
    await expect(page.locator('.paycycle-card')).toBeVisible();
    await page.locator('#primaryPayFrequency').selectOption('biweekly');
    await expect(page.locator('#cycleIncome')).not.toHaveText('₹0');
    await page.locator('#saveMonthBtn').click();
    await expect(page.locator('#saveStatus')).toContainText('Saved');
    await expect(page.locator('#historyTableBody tr')).toHaveCount(1);
    await expect(page.locator('#insightGrid .insight-card').first()).toBeVisible();
    expect(errors, `Budget browser errors:
${errors.join('\n')}`).toEqual([]);
  });
});
