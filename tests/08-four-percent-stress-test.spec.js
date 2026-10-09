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

const PAGE = '/4-percent-rule-stress-test.html';

async function dismissAnalyticsConsent(page) {
  const banner = page.locator('#carrowmontAnalyticsConsent');
  if (!(await banner.count())) return;
  if (!(await banner.isVisible().catch(() => false))) return;
  const decline = banner.locator('[data-analytics-choice="denied"]');
  if (await decline.count()) await decline.click();
  await banner.waitFor({ state: 'detached', timeout: 3000 }).catch(() => {});
}

async function waitForRendered(page) {
  await expect(page.locator('#summaryCards [data-scenario-card="base"] strong')).not.toHaveText('—');
  await expect(page.locator('#annualTableBody tr')).toHaveCount(30);
}

function independentSmoothPath({ portfolio, withdrawal, inflation, rate, years }) {
  let balance = portfolio;
  let scheduled = withdrawal;
  const rows = [];
  for (let year = 1; year <= years; year += 1) {
    const opening = balance;
    const funded = Math.min(opening, scheduled);
    const growth = opening < scheduled ? 0 : (opening - funded) * rate;
    const closing = opening < scheduled ? 0 : Math.max(0, opening - funded + growth);
    rows.push({ year, opening, scheduled, funded, growth, closing });
    balance = closing;
    scheduled *= (1 + inflation);
  }
  return rows;
}

async function coreResult(page, inputs) {
  return await page.evaluate((values) => window.CarrowmontFourPercentCore.calculate(values), inputs);
}

function savePdfArtifact(info, name) {
  const dir = path.resolve('qa-artifacts', 'pdfs');
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(info.filePath, path.join(dir, name));
}

test.describe('4% Rule Stress Test', () => {
  test('[AUTO] page loads cleanly, uses one H1 and renders the complete default result', async ({ page }) => {
    const errors = monitorPageErrors(page);
    await gotoClean(page, PAGE);
    await waitForRendered(page);
    expect(errors).toEqual([]);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('#summaryCards [data-scenario-card]')).toHaveCount(3);
    await expect(page.locator('#rateComparisonBody tr')).toHaveCount(4);
    await expect(page.locator('#returnStrip span')).toHaveCount(10);
    await expect(page.locator('#generateReportBtn')).toBeEnabled();
    await expect(page.locator('body')).toContainText('No login');
    await expect(page.locator('body')).toContainText('Local calculations');
  });

  test('[AUTO] smooth base path matches an independent withdrawal-before-return calculation', async ({ page }) => {
    await gotoClean(page, PAGE);
    const inputs = { startAge: 60, planUntilAge: 65, startingPortfolio: 1000000, withdrawalMode: 'amount', firstYearWithdrawal: 40000, inflationRate: 3, nominalReturn: 6 };
    const result = await coreResult(page, inputs);
    const expected = independentSmoothPath({ portfolio: 1000000, withdrawal: 40000, inflation: 0.03, rate: 0.06, years: 10 });
    expect(result.assumptions.horizonYears).toBe(10);
    result.base.annualRows.forEach((row, i) => {
      expect(row.openingBalance).toBeCloseTo(expected[i].opening, 6);
      expect(row.withdrawal).toBeCloseTo(expected[i].funded, 6);
      expect(row.investmentGrowth).toBeCloseTo(expected[i].growth, 6);
      expect(row.closingBalance).toBeCloseTo(expected[i].closing, 6);
    });
  });

  test('[AUTO] zero-withdrawal path compounds and withdrawal amount/rate modes reconcile', async ({ page }) => {
    await gotoClean(page, PAGE);
    const zero = await coreResult(page, { startAge:60, planUntilAge:70, startingPortfolio:1000000, withdrawalMode:'amount', firstYearWithdrawal:0, inflationRate:0, nominalReturn:5 });
    expect(zero.base.endingBalanceNominal).toBeCloseTo(1000000 * Math.pow(1.05, 10), 4);
    const rate = await coreResult(page, { startAge:60, planUntilAge:90, startingPortfolio:10000000, withdrawalMode:'rate', startingWithdrawalRate:4, inflationRate:4, nominalReturn:6 });
    const amount = await coreResult(page, { startAge:60, planUntilAge:90, startingPortfolio:10000000, withdrawalMode:'amount', firstYearWithdrawal:400000, inflationRate:4, nominalReturn:6 });
    expect(rate.assumptions.firstYearWithdrawal).toBe(400000);
    expect(amount.assumptions.startingWithdrawalRate).toBeCloseTo(0.04, 10);
    expect(amount.base.endingBalanceNominal).toBeCloseTo(rate.base.endingBalanceNominal, 6);
  });

  test('[AUTO] cautious assumptions, real balance and inflation mechanics are explicit', async ({ page }) => {
    await gotoClean(page, PAGE);
    const result = await coreResult(page, { startAge:60, planUntilAge:90, startingPortfolio:10000000, withdrawalMode:'rate', startingWithdrawalRate:4, inflationRate:4, nominalReturn:6 });
    expect(result.cautious.annualRows[0].returnRate).toBeCloseTo(0.045, 10);
    expect(result.cautious.annualRows[0].inflationRate).toBeCloseTo(0.05, 10);
    expect(result.base.annualRows[1].scheduledWithdrawal).toBeCloseTo(416000, 6);
    expect(result.base.endingBalanceReal).toBeCloseTo(result.base.endingBalanceNominal / Math.pow(1.04, 30), 5);
  });

  test('[AUTO] depletion convention never displays a negative balance and records the exact year/age', async ({ page }) => {
    await gotoClean(page, PAGE);
    const result = await coreResult(page, { startAge:60, planUntilAge:75, startingPortfolio:100000, withdrawalMode:'amount', firstYearWithdrawal:60000, inflationRate:0, nominalReturn:0 });
    expect(result.base.depletionYear).toBe(2);
    expect(result.base.depletionAge).toBe(61);
    expect(result.base.annualRows[1].withdrawal).toBe(40000);
    expect(result.base.annualRows[1].closingBalance).toBe(0);
    expect(result.base.annualRows.every(row => row.closingBalance >= 0)).toBe(true);
    expect(result.base.annualRows.slice(2).every(row => row.closingBalance === 0)).toBe(true);
  });

  test('[AUTO] normalized return sequence matches selected geometric return and reverses exactly', async ({ page }) => {
    await gotoClean(page, PAGE);
    const result = await coreResult(page, { startAge:60, planUntilAge:90, startingPortfolio:10000000, withdrawalMode:'rate', startingWithdrawalRate:4, inflationRate:4, nominalReturn:6 });
    const sequence = result.sequenceComparison.normalizedReturns;
    const geometric = Math.pow(sequence.reduce((product, value) => product * (1 + value), 1), 1 / sequence.length) - 1;
    expect(geometric).toBeCloseTo(0.06, 10);
    const weak = result.sequenceComparison.weakFirst.annualRows.slice(0,10).map(row => row.returnRate);
    const strong = result.sequenceComparison.strongFirst.annualRows.slice(0,10).map(row => row.returnRate);
    expect(strong).toEqual([...weak].reverse());
  });

  test('[AUTO] return order has no effect without withdrawals and weak-first is lower with withdrawals', async ({ page }) => {
    await gotoClean(page, PAGE);
    const noWithdrawal = await coreResult(page, { startAge:60, planUntilAge:80, startingPortfolio:10000000, withdrawalMode:'amount', firstYearWithdrawal:0, inflationRate:0, nominalReturn:6 });
    expect(noWithdrawal.sequenceComparison.weakFirst.endingBalanceNominal).toBeCloseTo(noWithdrawal.sequenceComparison.strongFirst.endingBalanceNominal, 5);
    const withWithdrawal = await coreResult(page, { startAge:60, planUntilAge:90, startingPortfolio:10000000, withdrawalMode:'rate', startingWithdrawalRate:4, inflationRate:4, nominalReturn:6 });
    expect(withWithdrawal.sequenceComparison.weakFirst.endingBalanceNominal).toBeLessThan(withWithdrawal.sequenceComparison.strongFirst.endingBalanceNominal);
  });

  test('[AUTO] rate comparison uses the same adverse assumptions and four standard rates', async ({ page }) => {
    await gotoClean(page, PAGE);
    const result = await coreResult(page, { startAge:60, planUntilAge:90, startingPortfolio:10000000, withdrawalMode:'rate', startingWithdrawalRate:4, inflationRate:4, nominalReturn:6 });
    expect(result.rateComparison.map(row => row.rate)).toEqual([0.03,0.035,0.04,0.05]);
    const expectedWithdrawals = [300000,350000,400000,500000];
    result.rateComparison.forEach((row, index) => {
      // Currency calculations can retain harmless IEEE-754 residue (for example
      // 350000.00000000006). Assert financial equality within sub-cent precision
      // instead of requiring bit-for-bit floating-point identity.
      expect(row.firstYearWithdrawal).toBeCloseTo(expectedWithdrawals[index], 6);
    });
    expect(result.rateComparison[0].endingBalanceReal).toBeGreaterThanOrEqual(result.rateComparison[3].endingBalanceReal);
  });

  test('[AUTO] input modes synchronize and invalid inputs show accessible plain-language validation', async ({ page }) => {
    await gotoClean(page, PAGE);
    await page.getByText('Annual amount', { exact: true }).click();
    await setInput(page, '#firstYearWithdrawal', 500000);
    await expect(page.locator('#startingWithdrawalRate')).toHaveValue('5');
    await page.getByText('Rate', { exact: true }).click();
    await setInput(page, '#startingWithdrawalRate', 3.5);
    await expect(page.locator('#firstYearWithdrawal')).toHaveValue('350000');
    await setInput(page, '#planUntilAge', 65);
    await expect(page.locator('#stressValidation')).toContainText('at least 10 years after retirement');
    await expect(page.locator('#stressValidation')).toHaveAttribute('role', 'status');
    await setInput(page, '#planUntilAge', 90);
    await expect(page.locator('#stressValidation')).toHaveText('');
  });

  test('[AUTO] charts contain permanent geometry, axis text and value callouts', async ({ page }) => {
    await gotoClean(page, PAGE);
    await chartHasGeometry(page, '#portfolioChart');
    await chartHasGeometry(page, '#sequenceChart');
    await expect(page.locator('#portfolioChart .chart-label-text')).toHaveCount(5);
    await expect(page.locator('#sequenceChart .chart-label-text')).toHaveCount(2);
    await expect(page.locator('#portfolioChart')).toContainText('Age 60');
    await expect(page.locator('#sequenceChart')).toContainText('Weak-first');
  });


  test('[AUTO] chart typography matches the established Carrowmont chart standard and has no SVG text outline', async ({ page }) => {
    await gotoClean(page, PAGE);
    await waitForRendered(page);
    const stressStyle = await page.locator('#portfolioChart text').first().evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        fill: style.fill,
        stroke: style.stroke,
        strokeWidth: style.strokeWidth
      };
    });
    expect(stressStyle.stroke).toBe('none');
    expect(parseFloat(stressStyle.strokeWidth) || 0).toBe(0);

    await gotoClean(page, '/sip-calculator/');
    await expect(page.locator('#chart1 .axis').first()).toBeVisible();
    const canonicalStyle = await page.locator('#chart1 .axis').first().evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        fill: style.fill
      };
    });
    expect(stressStyle.fontFamily).toBe(canonicalStyle.fontFamily);
    expect(stressStyle.fontSize).toBe(canonicalStyle.fontSize);
    expect(stressStyle.fontWeight).toBe(canonicalStyle.fontWeight);
    expect(stressStyle.fill).toBe(canonicalStyle.fill);
  });


  test('[AUTO] every chart callout stays inside the plot, fits its text and does not cover its anchor marker', async ({ page }) => {
    await gotoClean(page, PAGE);
    await waitForRendered(page);
    for (const selector of ['#portfolioChart', '#sequenceChart']) {
      const result = await page.locator(selector).evaluate((svg) => {
        const plot = {
          left: Number(svg.dataset.plotLeft), right: Number(svg.dataset.plotRight),
          top: Number(svg.dataset.plotTop), bottom: Number(svg.dataset.plotBottom)
        };
        const rects = [...svg.querySelectorAll('.chart-label-bg')];
        const texts = [...svg.querySelectorAll('.chart-label-text')];
        const eps = 0.75;
        const inside = (box) => box.x >= plot.left - eps && box.y >= plot.top - eps && box.x + box.width <= plot.right + eps && box.y + box.height <= plot.bottom + eps;
        const noAnchorCover = rects.every((rect) => {
          const box = rect.getBBox();
          const x = Number(rect.dataset.anchorX), y = Number(rect.dataset.anchorY);
          return !(x >= box.x - 5 && x <= box.x + box.width + 5 && y >= box.y - 5 && y <= box.y + box.height + 5);
        });
        const textFits = texts.every((text, index) => {
          const textBox = text.getBBox(), rectBox = rects[index].getBBox();
          return textBox.x >= rectBox.x - eps && textBox.x + textBox.width <= rectBox.x + rectBox.width + eps && textBox.y >= rectBox.y - 3 && textBox.y + textBox.height <= rectBox.y + rectBox.height + 3;
        });
        const noOverlap = rects.every((rect, i) => {
          const a = rect.getBBox();
          return rects.slice(i + 1).every((other) => {
            const b = other.getBBox();
            return a.x + a.width + 2 <= b.x || b.x + b.width + 2 <= a.x || a.y + a.height + 2 <= b.y || b.y + b.height + 2 <= a.y;
          });
        });
        return { inside: rects.every((rect) => inside(rect.getBBox())) && texts.every((text) => inside(text.getBBox())), noAnchorCover, textFits, noOverlap, count: rects.length };
      });
      expect(result.count).toBeGreaterThan(0);
      expect(result.inside).toBe(true);
      expect(result.noAnchorCover).toBe(true);
      expect(result.textFits).toBe(true);
      expect(result.noOverlap).toBe(true);
    }
  });

  test('[AUTO] annual values use the standard collapsed disclosure pattern and preserve all rows', async ({ page }) => {
    await gotoClean(page, PAGE);
    await waitForRendered(page);
    const details = page.locator('#annualValuesDetails');
    await expect(details).not.toHaveAttribute('open', '');
    await expect(page.locator('#annualValuesSummary')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#annualDisclosureLabel')).toHaveText('Show annual values');
    await expect(page.locator('#annualDisclosureMeta')).toContainText('Base · 30 years');
    await expect(page.locator('#annualTableBody tr')).toHaveCount(30);
    await page.locator('#annualValuesSummary').click();
    await expect(details).toHaveAttribute('open', '');
    await expect(page.locator('#annualValuesSummary')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#annualDisclosureLabel')).toHaveText('Hide annual values');
    await page.locator('#annualScenarioSelect').selectOption('strongFirst');
    await expect(page.locator('#annualDisclosureMeta')).toContainText('Strong-first · 30 years');
    await expect(page.locator('#annualTableBody tr')).toHaveCount(30);
  });

  test('[AUTO] Copy Summary and CSV use the displayed deterministic result', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read','clipboard-write']);
    await gotoClean(page, PAGE);
    await page.locator('#copySummaryBtn').click();
    await expect(page.locator('#stressActionMessage')).toContainText('Summary copied');
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('Carrowmont 4% Rule Stress Test');
    expect(copied).toContain('Sequence comparison');
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#downloadCsvBtn').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('carrowmont-4-percent-rule-stress-test.csv');
    const csv = fs.readFileSync(await download.path(), 'utf8');
    expect(csv).toContain('Scenario,Year,Age,Opening balance');
    expect(csv).toContain('Base,1,60');
    expect(csv).toContain('Strong-first,30,89');
  });

  test('[AUTO] country/currency changes formatting only and preserves assumptions', async ({ page }) => {
    await gotoClean(page, PAGE);
    const before = await page.locator('#startingPortfolio').inputValue();
    await page.locator('#localeMenu summary').click();
    await page.locator('#regionSelect').selectOption('US');
    await page.locator('#currencySelect').selectOption('USD');
    await page.locator('#localeDoneBtn').click();
    await expect(page.locator('#localeCountryLabel')).toHaveText('United States');
    await expect(page.locator('#localeCurrencyLabel')).toHaveText('USD');
    await expect(page.locator('#startingPortfolio')).toHaveValue(before);
    await expect(page.locator('#summaryCards')).toContainText('$');
  });

  test('[AUTO] desktop and mobile layouts have no page-level horizontal overflow', async ({ page }, testInfo) => {
    await gotoClean(page, PAGE);
    await assertNoHorizontalOverflow(page, `4% Rule Stress Test ${testInfo.project.name}`);
  });

  test('[VISUAL] capture full-page 4% Rule Stress Test reference screenshot', async ({ page }, testInfo) => {
    await gotoClean(page, PAGE);
    await saveReferenceScreenshot(page, testInfo.project.name, 'four-percent-rule-stress-test', testInfo.project.name.includes('mobile') ? 'mobile' : 'desktop');
  });

  test('[AUTO] PDF summary meaning card is content-sized instead of using the old oversized fixed height', async ({ page }) => {
    await gotoClean(page, PAGE);
    const source = await page.evaluate(async () => (await fetch('/4-percent-rule-stress-test-pdf.js')).text());
    expect(source).toContain('const meaningCardH = Math.max(72, 31 + meaningLineCount * 15)');
    expect(source).not.toContain('card(ctx, M, y, CW, 118, C.light');
    expect(source).toContain('y += meaningCardH + 21');
  });

  test('[AUTO] PDF downloads, uses standardized final pages and includes the same result concepts', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('chrome'), 'PDF downloads are retained from Chrome only.');
    await gotoClean(page, PAGE);
    await dismissAnalyticsConsent(page);
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    await page.locator('#generateReportBtn').click();
    const download = await downloadPromise;
    const info = await validatePdfDownload(download, 7);
    savePdfArtifact(info, 'four-percent-rule-stress-test.pdf');
    await expect(page.locator('#stressActionMessage')).toContainText('Report has been downloaded.');
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toContain('Base');
    expect(text).toContain('Adverse early sequence');
  });

  test('[AUTO] stress-test interactions make no financial-data fetch or XHR request', async ({ page }) => {
    await gotoClean(page, PAGE);
    const requests = [];
    page.on('request', request => {
      if (['fetch','xhr'].includes(request.resourceType())) requests.push(request.url());
    });
    await setInput(page, '#startingWithdrawalRate', 4.5);
    await page.locator('#annualValuesSummary').click();
    await expect(page.locator('#annualScenarioSelect')).toBeVisible();
    await page.locator('#annualScenarioSelect').selectOption('adverse');
    await page.locator('#faq details').first().click();
    await page.waitForTimeout(250);
    expect(requests).toEqual([]);
  });
});
