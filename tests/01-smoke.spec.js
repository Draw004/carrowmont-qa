import { test, expect } from '@playwright/test';
import { tools, mainSitePages } from '../qa.config.js';
import { gotoClean, monitorPageErrors } from '../helpers/common.js';

test.describe('Carrowmont smoke and content contracts', () => {
  for (const tool of tools) {
    test(`[AUTO] ${tool.name}: loads without JavaScript errors and required controls exist`, async ({ page }) => {
      const errors = monitorPageErrors(page);
      await gotoClean(page, tool.path);
      await expect(page.locator('body')).toContainText(tool.requiredText[0]);
      await expect(page.getByText('Back to all Carrowmont tools', { exact: false })).toBeVisible();
      for (const text of tool.requiredText.slice(1)) await expect(page.getByText(text, { exact: true })).toBeVisible();
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

  test('[AUTO] Homepage: Want to build section is present near the first viewport on desktop', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'Desktop visibility check');
    await gotoClean(page, '/');
    const target = page.getByText(/Want to build.*1 Crore/i).first();
    await expect(target).toBeAttached();
    const box = await target.boundingBox();
    expect(box).not.toBeNull();
    expect(box.y, 'The 1 Crore section should begin close enough to the first desktop viewport to encourage scrolling/click-through').toBeLessThan(1100);
  });
});
