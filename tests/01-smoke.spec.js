import { test, expect } from '@playwright/test';
import { tools, mainSitePages } from '../qa.config.js';
import { gotoClean, monitorPageErrors } from '../helpers/common.js';
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
        // India/INR uses SIP terminology; international views use Monthly Investment terminology.
        await chooseUnitedStatesLocale(page);
        await expect(page.getByRole('heading', { name: /See how monthly investments may grow/i }).first()).toBeVisible();
        await expect(page.getByText('Generate Investment Report', { exact: true }).first()).toBeVisible();
        const indiaBadgeInternational = page.getByText('POPULAR IN INDIA', { exact: true }).first();
        if (await indiaBadgeInternational.count()) await expect(indiaBadgeInternational).toBeHidden();

        await chooseIndiaLocale(page);
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
