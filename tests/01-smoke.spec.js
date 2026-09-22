import { test, expect } from '@playwright/test';
import { tools, mainSitePages } from '../qa.config.js';
import { gotoClean, monitorPageErrors } from '../helpers/common.js';
import { chooseIndiaLocale, chooseUnitedStatesLocale } from '../helpers/fixtures.js';

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
