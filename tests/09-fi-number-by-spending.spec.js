import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import {
  gotoClean,
  monitorPageErrors,
  setInput,
  assertNoHorizontalOverflow,
  chartHasGeometry,
  saveReferenceScreenshot,
  validatePdfDownload
} from '../helpers/common.js';

const PAGE = '/financial-independence-number-by-spending.html';

async function waitForRendered(page) {
  await expect(page.locator('#fiTodayValue')).not.toHaveText('—');
  await expect(page.locator('#rateComparisonBody tr')).toHaveCount(4);
  await expect(page.locator('#spendingSensitivityBody tr')).toHaveCount(5);
  await expect(page.locator('#sensitivityChart .chart-callout')).toHaveCount(3);
}

async function coreResult(page, values) {
  return await page.evaluate((inputs) => window.CarrowmontFINumberBySpendingCore.calculate(inputs), values);
}

function savePdfArtifact(info, name) {
  const dir = path.resolve('qa-artifacts', 'pdfs');
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(info.filePath, path.join(dir, name));
}

async function dismissAnalyticsConsent(page) {
  const banner = page.locator('#carrowmontAnalyticsConsent');
  if (!(await banner.count())) return;
  if (!(await banner.isVisible().catch(() => false))) return;
  const decline = banner.locator('[data-analytics-choice="denied"]');
  if (await decline.count()) await decline.click();
  await banner.waitFor({ state: 'detached', timeout: 3000 }).catch(() => {});
}

test.describe('FI Number by Spending', () => {
  test('[AUTO] page loads cleanly with one H1, no-login positioning and complete default result', async ({ page }) => {
    const errors = monitorPageErrors(page);
    await gotoClean(page, PAGE);
    await waitForRendered(page);
    expect(errors).toEqual([]);
    await expect(page.locator('h1')).toHaveCount(1);
    const defaultCurrencySymbol = await page.evaluate(() => window.CarrowmontLocale.currencySymbol());
    await expect(page.locator('#annualSpendingValue')).toContainText(defaultCurrencySymbol);
    await expect(page.locator('#fiTodayValue')).toContainText(defaultCurrencySymbol);
    await expect(page.locator('#multipleValue')).toHaveText('25×');
    await expect(page.locator('body')).toContainText('No login');
    await expect(page.locator('body')).toContainText('Local calculations');
    await expect(page.locator('#generateReportBtn')).toBeEnabled();
  });

  test('[AUTO] pure core matches approved annual/monthly, 3.5%, inflation, sensitivity and zero fixtures', async ({ page }) => {
    await gotoClean(page, PAGE);
    const annual = await coreResult(page, { view:'annual', spending:1200000, withdrawalRate:4, yearsUntilFi:0, inflationRate:5 });
    const monthly = await coreResult(page, { view:'monthly', spending:100000, withdrawalRate:4, yearsUntilFi:0, inflationRate:5 });
    const threeFive = await coreResult(page, { view:'annual', spending:1200000, withdrawalRate:3.5, yearsUntilFi:0, inflationRate:5 });
    const inflation = await coreResult(page, { view:'annual', spending:1200000, withdrawalRate:4, yearsUntilFi:10, inflationRate:5 });
    const zero = await coreResult(page, { view:'monthly', spending:0, withdrawalRate:4, yearsUntilFi:10, inflationRate:5 });
    expect(annual.fiToday).toBe(30000000);
    expect(monthly.fiToday).toBe(annual.fiToday);
    expect(threeFive.fiToday).toBeCloseTo(34285714.28571428, 5);
    expect(inflation.futureAnnualSpending).toBeCloseTo(1200000 * Math.pow(1.05, 10), 5);
    expect(inflation.fiFuture).toBeCloseTo(inflation.futureAnnualSpending / 0.04, 5);
    expect(inflation.spendingSensitivity.map(row => row.percentage)).toEqual([80,90,100,110,120]);
    expect(inflation.spendingSensitivity[0].fiToday).toBeCloseTo(inflation.fiToday * 0.8, 6);
    expect(inflation.spendingSensitivity[4].fiToday).toBeCloseTo(inflation.fiToday * 1.2, 6);
    expect(zero.fiToday).toBe(0);
    expect(zero.fiFuture).toBe(0);
  });

  test('[AUTO] monthly and annual UI views preserve calculation parity', async ({ page }) => {
    await gotoClean(page, PAGE);
    const monthly = await page.evaluate(() => window.CarrowmontFINumberBySpendingCore.calculate({ view:'monthly', spending:100000, withdrawalRate:4, yearsUntilFi:0, inflationRate:5 }).fiToday);
    await page.getByText('Annual', { exact: true }).click();
    await setInput(page, '#portfolioSpending', 1200000);
    const annual = await page.evaluate(() => window.CarrowmontFINumberBySpendingCore.calculate({ view:'annual', spending:Number(document.querySelector('#portfolioSpending').value), withdrawalRate:Number(document.querySelector('#withdrawalRate').value), yearsUntilFi:Number(document.querySelector('#yearsUntilFi').value), inflationRate:Number(document.querySelector('#inflationRate').value) }).fiToday);
    expect(annual).toBe(monthly);
    await expect(page.locator('#spendingHelp')).toContainText('annual amount');
  });

  test('[AUTO] selected non-standard withdrawal rate is added to comparison without replacing standard rates', async ({ page }) => {
    await gotoClean(page, PAGE);
    await setInput(page, '#withdrawalRate', 4.2);
    await expect(page.locator('#rateComparisonBody tr')).toHaveCount(5);
    const rows = await page.locator('#rateComparisonBody tr').allTextContents();
    expect(rows.join('\n')).toContain('3%');
    expect(rows.join('\n')).toContain('3.5%');
    expect(rows.join('\n')).toContain('4%');
    expect(rows.join('\n')).toContain('4.2%');
    expect(rows.join('\n')).toContain('5%');
    expect(rows.join('\n')).not.toMatch(/safe|best/i);
  });

  test('[AUTO] validation rejects out-of-range inputs and preserves zero as a valid spending value', async ({ page }) => {
    await gotoClean(page, PAGE);
    await setInput(page, '#withdrawalRate', 1.9);
    await expect(page.locator('#fiqValidation')).toContainText('between 2.0% and 8.0%');
    await expect(page.locator('#generateReportBtn')).toBeDisabled();
    await setInput(page, '#withdrawalRate', 4);
    await setInput(page, '#yearsUntilFi', 60.5);
    await expect(page.locator('#fiqValidation')).toContainText('whole number from 0 to 60');
    await setInput(page, '#yearsUntilFi', 0);
    await setInput(page, '#portfolioSpending', 0);
    await expect(page.locator('#fiqValidation')).toHaveText('');
    const result = await coreResult(page, { view:'monthly', spending:0, withdrawalRate:4, yearsUntilFi:0, inflationRate:5 });
    expect(result.fiToday).toBe(0);
  });

  test('[AUTO] sensitivity chart has permanent geometry, hardened typography and three permanent callouts', async ({ page }) => {
    await gotoClean(page, PAGE);
    await waitForRendered(page);
    await chartHasGeometry(page, '#sensitivityChart');
    await expect(page.locator('#sensitivityChart .chart-callout')).toHaveCount(3);
    await expect(page.locator('#sensitivityChart')).toContainText('80%');
    await expect(page.locator('#sensitivityChart')).toContainText('100% baseline');
    await expect(page.locator('#sensitivityChart')).toContainText('120%');
    const style = await page.locator('#sensitivityChart text').first().evaluate((element) => {
      const computed = getComputedStyle(element);
      return { fontFamily:computed.fontFamily, fontSize:computed.fontSize, fontWeight:computed.fontWeight, stroke:computed.stroke, strokeWidth:computed.strokeWidth };
    });
    expect(style.fontFamily.toLowerCase()).toContain('inter');
    expect(style.fontSize).toBe('13px');
    expect(Number(style.fontWeight)).toBeGreaterThanOrEqual(700);
    expect(style.stroke).toBe('none');
    expect(parseFloat(style.strokeWidth) || 0).toBe(0);
  });

  test('[AUTO] every sensitivity callout stays inside the plot, fits its text, avoids anchors and avoids overlap', async ({ page }) => {
    await gotoClean(page, PAGE);
    await waitForRendered(page);
    const result = await page.locator('#sensitivityChart').evaluate((svg) => {
      const plot = { left:Number(svg.dataset.plotLeft), right:Number(svg.dataset.plotRight), top:Number(svg.dataset.plotTop), bottom:Number(svg.dataset.plotBottom) };
      const rects = [...svg.querySelectorAll('.chart-label-bg')];
      const texts = [...svg.querySelectorAll('.chart-label-text')];
      const eps = 0.8;
      const inside = (box) => box.x >= plot.left - eps && box.y >= plot.top - eps && box.x + box.width <= plot.right + eps && box.y + box.height <= plot.bottom + eps;
      const noAnchorCover = rects.every(rect => {
        const b=rect.getBBox(), x=Number(rect.dataset.anchorX), y=Number(rect.dataset.anchorY);
        return !(x >= b.x-5 && x <= b.x+b.width+5 && y >= b.y-5 && y <= b.y+b.height+5);
      });
      const textFits = texts.every((text,index) => {
        const t=text.getBBox(), b=rects[index].getBBox();
        return t.x >= b.x-eps && t.x+t.width <= b.x+b.width+eps && t.y >= b.y-4 && t.y+t.height <= b.y+b.height+4;
      });
      const noOverlap = rects.every((rect,i) => {
        const a=rect.getBBox();
        return rects.slice(i+1).every(other => { const b=other.getBBox(); return a.x+a.width+2<=b.x || b.x+b.width+2<=a.x || a.y+a.height+2<=b.y || b.y+b.height+2<=a.y; });
      });
      return { count:rects.length, inside:rects.every(r=>inside(r.getBBox())) && texts.every(t=>inside(t.getBBox())), noAnchorCover, textFits, noOverlap };
    });
    expect(result.count).toBe(3);
    expect(result.inside).toBe(true);
    expect(result.noAnchorCover).toBe(true);
    expect(result.textFits).toBe(true);
    expect(result.noOverlap).toBe(true);
  });

  test('[AUTO] baseline marker is visually distinguishable by shape/stroke, not color alone', async ({ page }) => {
    await gotoClean(page, PAGE);
    const baseline = page.locator('#sensitivityChart [data-baseline="true"]');
    await expect(baseline).toHaveCount(1);
    const attrs = await baseline.evaluate((el) => ({ r:el.getAttribute('r'), fill:getComputedStyle(el).fill, stroke:getComputedStyle(el).stroke, strokeWidth:getComputedStyle(el).strokeWidth }));
    expect(Number(attrs.r)).toBeGreaterThan(5);
    expect(parseFloat(attrs.strokeWidth)).toBeGreaterThanOrEqual(3);
    await expect(page.locator('#sensitivityChart .chart-point-baseline-core')).toHaveCount(1);
  });

  test('[AUTO] locale change alters formatting only and preserves entered assumptions', async ({ page }) => {
    await gotoClean(page, PAGE);
    await setInput(page, '#portfolioSpending', 123456);
    const before = await page.locator('#portfolioSpending').inputValue();
    await page.locator('#localeMenu summary').click();
    await page.locator('#regionSelect').selectOption('US');
    await page.locator('#currencySelect').selectOption('USD');
    await page.locator('#localeDoneBtn').click();
    await expect(page.locator('#localeCountryLabel')).toHaveText('United States');
    await expect(page.locator('#localeCurrencyLabel')).toHaveText('USD');
    await expect(page.locator('#portfolioSpending')).toHaveValue(before);
    await expect(page.locator('#fiTodayValue')).toContainText('$');
  });

  test('[AUTO] Copy Summary and CSV export the current deterministic assumptions and results', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read','clipboard-write']);
    await gotoClean(page, PAGE);
    await setInput(page, '#yearsUntilFi', 10);
    await page.locator('#copySummaryBtn').click();
    await expect(page.locator('#fiqActionMessage')).toContainText('Summary copied');
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('Carrowmont Financial Independence Number by Spending');
    expect(copied).toContain('FI number today');
    expect(copied).toContain('Withdrawal-rate comparison');
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#downloadCsvBtn').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('carrowmont-fi-number-by-spending.csv');
    const csv = fs.readFileSync(await download.path(), 'utf8');
    expect(csv).toContain('Methodology version,fi-number-by-spending-v1.0');
    expect(csv).toContain('Rate comparison');
    expect(csv).toContain('Spending sensitivity');
  });

  test('[AUTO] primary CTA hands compatible values into the full FI Planner without changing its calculation engine contract', async ({ page }) => {
    await gotoClean(page, PAGE);
    await setInput(page, '#portfolioSpending', 125000);
    await setInput(page, '#withdrawalRate', 3.5);
    await setInput(page, '#inflationRate', 6);
    const href = await page.locator('#fullPlannerCta').getAttribute('href');
    expect(href).toContain('cm_handoff=fi_spending_v1');
    expect(href).toContain('spendingMonthly=125000');
    expect(href).toContain('withdrawalRate=3.5');
    expect(href).toContain('inflation=6');
    await page.locator('#fullPlannerCta').click();
    await page.waitForURL(/\/financial-independence\/\?cm_handoff=fi_spending_v1/);
    await expect(page.locator('#monthlySpending')).toHaveValue('125000');
    await expect(page.locator('#withdrawalRate')).toHaveValue('3.5');
    await expect(page.locator('#inflation')).toHaveValue('6');
    await expect(page.locator('#spendingPct')).toHaveValue('100');
    await expect(page.locator('#monthlyIncome')).toHaveValue('0');
    await expect(page.locator('#seo3bHandoffNotice')).toBeVisible();
    await expect(page.locator('#seo3bHandoffNotice')).toContainText('Inputs carried into the full planner');
  });

  test('[AUTO] 360px and 390px layouts have no page-level horizontal overflow and keep actions usable', async ({ page }) => {
    for (const width of [360,390]) {
      await page.setViewportSize({ width, height: 800 });
      await gotoClean(page, PAGE);
      await waitForRendered(page);
      await assertNoHorizontalOverflow(page, `FI Number by Spending ${width}px`);
      const actionMetrics = await page.locator('.fiq-actions').evaluate((container) => {
        const containerBox = container.getBoundingClientRect();
        const buttons = [...container.querySelectorAll('.fiq-button')].map(node => {
          const box = node.getBoundingClientRect();
          return { width:box.width, height:box.height, left:box.left, right:box.right };
        });
        return { containerWidth:containerBox.width, buttons };
      });
      expect(actionMetrics.buttons).toHaveLength(3);
      actionMetrics.buttons.forEach(button => {
        expect(button.width).toBeGreaterThanOrEqual(actionMetrics.containerWidth - 1);
        expect(button.width).toBeLessThanOrEqual(actionMetrics.containerWidth + 1);
        expect(button.height).toBeGreaterThanOrEqual(43);
        expect(button.left).toBeGreaterThanOrEqual(-0.5);
        expect(button.right).toBeLessThanOrEqual(width + 0.5);
      });
    }
  });

  test('[VISUAL] capture full-page FI Number by Spending reference screenshot', async ({ page }, testInfo) => {
    await gotoClean(page, PAGE);
    await waitForRendered(page);
    await saveReferenceScreenshot(page, testInfo.project.name, 'fi-number-by-spending', testInfo.project.name.includes('mobile') ? 'mobile' : 'desktop');
  });

  test('[AUTO] PDF is a standardized four-page report and remains available without login', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('chrome'), 'PDF downloads are retained from Chrome only.');
    await gotoClean(page, PAGE);
    await dismissAnalyticsConsent(page);
    await setInput(page, '#yearsUntilFi', 10);
    const downloadPromise = page.waitForEvent('download', { timeout:30000 });
    await page.locator('#generateReportBtn').click();
    const download = await downloadPromise;
    const info = await validatePdfDownload(download, 4);
    expect(info.pages).toBe(4);
    expect(info.suggested).toBe('carrowmont-fi-number-by-spending-report.pdf');
    savePdfArtifact(info, 'fi-number-by-spending-report.pdf');
    await expect(page.locator('#fiqActionMessage')).toContainText('Report has been downloaded.');
  });

  test('[AUTO] calculator interactions make no financial-data fetch or XHR request', async ({ page }) => {
    await gotoClean(page, PAGE);
    const requests = [];
    page.on('request', request => { if (['fetch','xhr'].includes(request.resourceType())) requests.push(request.url()); });
    await setInput(page, '#withdrawalRate', 4.4);
    await setInput(page, '#yearsUntilFi', 12);
    await page.locator('#faq details').first().click();
    await page.waitForTimeout(250);
    expect(requests).toEqual([]);
  });
});
