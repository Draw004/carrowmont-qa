import { test, expect } from '@playwright/test';
import { tools, standardDownloadMessage } from '../qa.config.js';
import { gotoClean, installCanvasTextProbe, getCanvasText, validatePdfDownload } from '../helpers/common.js';
import { prepareToolForQa } from '../helpers/fixtures.js';

test.describe('PDF report generation and download standard', () => {
  for (const tool of tools) {
    test(`[AUTO] ${tool.name}: PDF downloads and uses standardized success message`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'chrome-desktop', 'Generate PDFs once in Chrome to keep the full suite fast');
      test.setTimeout(120000);
      await gotoClean(page, tool.path);
      await prepareToolForQa(page, tool.key);
      await installCanvasTextProbe(page);
      const button = page.locator(tool.reportButton);
      await expect(button).toBeVisible();
      const downloadPromise = page.waitForEvent('download', { timeout: 90000 });
      await button.click();
      const download = await downloadPromise;
      const info = await validatePdfDownload(download, tool.reportMinPages);
      await expect(page.locator(tool.reportStatus)).toHaveText(standardDownloadMessage, { timeout: 15000 });
      expect(info.pages).toBeGreaterThanOrEqual(tool.reportMinPages);
      const canvasText = await getCanvasText(page);

      if (tool.key === 'sip-calculator') {
        expect(canvasText).toContain('Contribution frequency');
        expect(canvasText).toContain('Monthly');
      }

      if (tool.requiresToolsReportPage) {
        expect(canvasText).toContain('Continue planning with Carrowmont');
        const expectedOtherTools = tool.key === 'goal-planner'
          ? ['Retirement Planner', 'SIP Calculator', 'Financial Independence', 'Inflation Calculator']
          : ['SIP Calculator', 'Goal Planner', 'Financial Independence', 'Inflation Calculator'];
        for (const title of expectedOtherTools) expect(canvasText, `${tool.name} report missing ${title}`).toContain(title);
      }
    });
  }
});
