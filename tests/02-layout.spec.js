import { test, expect } from '@playwright/test';
import { tools } from '../qa.config.js';
import { gotoClean, assertNoHorizontalOverflow, assertInsideParent, saveReferenceScreenshot } from '../helpers/common.js';

test.describe('Layout and responsive guardrails', () => {
  for (const tool of tools) {
    test(`[AUTO] ${tool.name}: no page-level horizontal overflow`, async ({ page }) => {
      await gotoClean(page, tool.path);
      await assertNoHorizontalOverflow(page, tool.name);
    });

    test(`[AUTO] ${tool.name}: report button stays inside its action container`, async ({ page }) => {
      await gotoClean(page, tool.path);
      await expect(page.locator(tool.reportButton)).toBeVisible();
      await assertInsideParent(page, tool.reportButton, tool.layoutParent);
    });

    test(`[VISUAL] ${tool.name}: capture full-page reference screenshot`, async ({ page }, testInfo) => {
      await gotoClean(page, tool.path);
      await saveReferenceScreenshot(page, testInfo.project.name, tool.key, testInfo.project.name.includes('mobile') ? 'mobile' : 'desktop');
      expect(true).toBeTruthy();
    });
  }
});
