import { test, expect } from '@playwright/test';
import { tools, mainSitePages } from '../qa.config.js';
import { gotoClean, monitorPageErrors } from '../helpers/common.js';
import { chooseIndiaLocale, chooseUnitedStatesLocale } from '../helpers/fixtures.js';

async function chooseIndiaUsdLocale(page) {
  const summary = page.locator('#localeSummary, #localeMenu > summary, summary.locale-summary').first();
  if (await summary.count()) {
    const details = summary.locator('xpath=ancestor::details[1]');
    const needsOpen = (await details.count()) && !(await details.getAttribute('open'));
    if (needsOpen || !(await details.count())) await summary.click().catch(() => {});
  }

  const region = page.locator('#regionSelect');
  const currency = page.locator('#currencySelect');
  if (await region.count()) await region.selectOption('IN');
  if (await currency.count()) await currency.selectOption('USD');

  const done = page.locator('#localeDone, #localeDoneBtn').filter({ visible: true }).first();
  if (await done.count()) await done.click().catch(() => {});

  await page.waitForFunction(() => {
    const current = document.querySelector('#localeCurrent')?.textContent || '';
    return /India\s*·\s*USD/i.test(current);
  }, null, { timeout: 5000 });
  await page.waitForTimeout(200);
}

async function expectLearnCategoryOrder(page, expectedFirstThree) {
  const order = await page.locator('.planning-categories > .category-box').evaluateAll(nodes =>
    nodes.map(node => node.getAttribute('data-category')).filter(Boolean)
  );
  expect(order.slice(0, 3)).toEqual(expectedFirstThree);
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


  test('[AUTO] Learn hub: country controls terminology/order and currency controls money examples', async ({ page }) => {
    const errors = monitorPageErrors(page);
    await gotoClean(page, '/learn.html');

    // India + INR: India terminology and India-first content order.
    await chooseIndiaLocale(page);
    await expect(page.locator('#investmentCategoryTitle')).toHaveText('Monthly Investment (SIP)');
    await expect(page.locator('#investmentTargetTopicTitle')).toContainText('₹1 crore');
    await expect(page.locator('#investmentMonthlyTopicTitle')).toContainText('₹10,000');
    await expectLearnCategoryOrder(page, ['investment', 'retirement', 'goals']);

    // United States + USD: international terminology, USD examples and international order.
    await chooseUnitedStatesLocale(page);
    await expect(page.locator('#investmentCategoryTitle')).toHaveText('Monthly Investment');
    await expect(page.locator('#investmentTargetTopicTitle')).toContainText('$1 million');
    await expect(page.locator('#investmentMonthlyTopicTitle')).toContainText('$500');
    await expect(page.locator('#investmentCategoryTitle')).not.toContainText('SIP');
    await expectLearnCategoryOrder(page, ['retirement', 'goals', 'investment']);

    // India + USD: country still controls SIP terminology/order, currency controls the money examples.
    await chooseIndiaUsdLocale(page);
    await expect(page.locator('#investmentCategoryTitle')).toHaveText('Monthly Investment (SIP)');
    await expect(page.locator('#investmentTargetTopicTitle')).toContainText('$1 million');
    await expect(page.locator('#investmentMonthlyTopicTitle')).toContainText('$500');
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
