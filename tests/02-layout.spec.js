import { test, expect } from '@playwright/test';
import { tools } from '../qa.config.js';
import { gotoClean, assertNoHorizontalOverflow, assertInsideParent, saveReferenceScreenshot } from '../helpers/common.js';
import { prepareToolForQa } from '../helpers/fixtures.js';

test.describe('Layout and responsive guardrails', () => {
  test('[AUTO] Retirement and Inflation headers align with the SIP header standard', async ({ page }) => {
    const metric = async path => {
      await gotoClean(page, path);
      return page.locator('.site-header .container').evaluate(el => {
        const r = el.getBoundingClientRect();
        return { left: r.left, right: r.right, width: r.width };
      });
    };
    const sip = await metric('/sip-calculator/');
    const retirement = await metric('/retirement-calculator/planner.html');
    const inflation = await metric('/inflation-calculator/');
    for (const [name, current] of [['Retirement', retirement], ['Inflation', inflation]]) {
      expect(Math.abs(current.left - sip.left), `${name} header left edge`).toBeLessThan(2);
      expect(Math.abs(current.right - sip.right), `${name} header right edge`).toBeLessThan(2);
      expect(Math.abs(current.width - sip.width), `${name} header width`).toBeLessThan(2);
    }
  });

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
      await prepareToolForQa(page, tool.key);
      await saveReferenceScreenshot(page, testInfo.project.name, tool.key, testInfo.project.name.includes('mobile') ? 'mobile' : 'desktop');
      expect(true).toBeTruthy();
    });
  }
});
