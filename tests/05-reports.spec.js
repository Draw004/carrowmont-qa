import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { tools, standardDownloadMessage } from '../qa.config.js';
import { gotoClean, installCanvasTextProbe, getCanvasText, validatePdfDownload } from '../helpers/common.js';
import { prepareToolForQa, chooseUnitedStatesLocale } from '../helpers/fixtures.js';

function savePdfArtifact(info, name) {
  const dir = path.resolve('qa-artifacts', 'pdfs');
  fs.mkdirSync(dir, { recursive: true });
  const safe = String(name).replace(/[^a-z0-9._-]+/gi, '-').toLowerCase();
  fs.copyFileSync(info.filePath, path.join(dir, `${safe}.pdf`));
}

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
      savePdfArtifact(info, tool.key);
      await expect(page.locator(tool.reportStatus)).toHaveText(standardDownloadMessage, { timeout: 15000 });
      expect(info.pages).toBeGreaterThanOrEqual(tool.reportMinPages);
      const canvasText = await getCanvasText(page);

      if (tool.key === 'sip-calculator') {
        expect(canvasText).toContain('SIP Planning Report');
        expect(canvasText).toContain('Contribution frequency');
        expect(canvasText).toContain('Monthly');
      }

      if (tool.key === 'goal-planner') {
        expect(canvasText).toContain('Pay frequency');
        expect(canvasText).toContain('Savings / contribution frequency');
        expect(canvasText).toContain('Alternative one-time investment');
        expect(canvasText).toContain('Monthly');
      }

      if (tool.key === 'financial-independence') {
        expect(canvasText).toContain('Income / pay frequency');
        expect(canvasText).toContain('Investment frequency');
        expect(canvasText).toContain('Monthly');
      }

      if (tool.requiresGuideReportPage) {
        expect(canvasText, `${tool.name} report missing Report Guide & Methodology page`).toContain('Report Guide & Methodology');
        expect(canvasText, `${tool.name} report missing How to read section`).toContain('How to read this report');
        expect(canvasText, `${tool.name} report missing terminology section`).toContain('Terminology used in this report');
        expect(canvasText, `${tool.name} report missing disclaimer section`).toContain('Important assumptions & disclaimer');
        expect(canvasText, `${tool.name} report missing contact details`).toContain('contact@carrowmont.com');
      }

      if (tool.requiresToolsReportPage) {
        expect(canvasText).toContain('Continue planning with Carrowmont');
        const expectedOtherTools = {
          'financial-independence': ['SIP Calculator', 'Retirement Planner', 'Goal Planner', 'Inflation Calculator'],
          'goal-planner': ['SIP Calculator', 'Retirement Planner', 'Financial Independence', 'Inflation Calculator'],
          'inflation-calculator': ['SIP Calculator', 'Retirement Planner', 'Goal Planner', 'Financial Independence'],
          'retirement-planner': ['SIP Calculator', 'Goal Planner', 'Financial Independence', 'Inflation Calculator'],
          'sip-calculator': ['Retirement Planner', 'Goal Planner', 'Financial Independence', 'Inflation Calculator']
        }[tool.key] || [];
        for (const title of expectedOtherTools) expect(canvasText, `${tool.name} report missing ${title}`).toContain(title);
      }

      if (tool.key === 'financial-independence') {
        expect(canvasText).toContain('Printed value labels mark the selected age');
        expect(canvasText).toContain('Target ');
        expect(canvasText).toContain('Portfolio ');
      }
    });
  }

  test('[AUTO] International report tool card uses Recurring Investment Calculator instead of SIP Calculator', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chrome-desktop', 'Generate this report once in Chrome');
    test.setTimeout(120000);
    await gotoClean(page, '/goal-planner/');
    await chooseUnitedStatesLocale(page);
    await installCanvasTextProbe(page);
    const downloadPromise = page.waitForEvent('download', { timeout: 90000 });
    await page.locator('#reportBtn').click();
    const download = await downloadPromise;
    const info = await validatePdfDownload(download, 5);
    savePdfArtifact(info, 'goal-planner-international');
    const canvasText = await getCanvasText(page);
    expect(canvasText).toContain('Recurring Investment Calculator');
    expect(canvasText).not.toContain('Monthly Investment Calculator');
  });

  test('[AUTO] Financial Independence PDF includes printed values for both charts', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chrome-desktop', 'Generate this report once in Chrome');
    test.setTimeout(120000);
    await gotoClean(page, '/financial-independence/');
    await prepareToolForQa(page, 'financial-independence');
    await installCanvasTextProbe(page);
    const downloadPromise = page.waitForEvent('download', { timeout: 90000 });
    await page.locator('#reportBtn').click();
    await downloadPromise;
    const canvasText = await getCanvasText(page);
    expect(canvasText).toContain('Target ');
    expect(canvasText).toContain('Portfolio ');
    expect(canvasText).toContain('Money added ');
    expect(canvasText).toContain('Printed value labels mark the selected age');
  });

});
