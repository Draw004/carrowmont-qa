import { test, expect } from '@playwright/test';
import { tools } from '../qa.config.js';
import { gotoClean, chartHasGeometry, svgText } from '../helpers/common.js';
import { prepareToolForQa } from '../helpers/fixtures.js';

test.describe('Chart population and print-readability contracts', () => {
  for (const tool of tools) {
    for (const selector of tool.charts) {
      test(`[AUTO] ${tool.name}: ${selector} renders non-blank chart geometry`, async ({ page }) => {
        await gotoClean(page, tool.path);
        await prepareToolForQa(page, tool.key);
        const data = await chartHasGeometry(page, selector);
        expect(data.paths).toBeGreaterThan(2);
      });
    }
  }

  test('[AUTO] Financial Independence: X-axis age labels are visible inside both SVGs', async ({ page }) => {
    await gotoClean(page, '/financial-independence/');
    await prepareToolForQa(page, 'financial-independence');
    for (const selector of ['#pathChart', '#growthChart']) {
      const labels = await page.locator(`${selector} text`).allTextContents();
      const ageLabels = labels.filter(x => /^Age\s+\d+/i.test(x.trim()));
      expect(ageLabels.length, `${selector} should have at least three visible age labels`).toBeGreaterThanOrEqual(3);
      const viewBox = await page.locator(selector).getAttribute('viewBox');
      expect(viewBox, `${selector} should have a viewBox`).toBeTruthy();
      const parts = viewBox.split(/\s+/).map(Number);
      const h = parts[3];
      const positions = await page.locator(`${selector} text`).evaluateAll(nodes => nodes.filter(n => /^Age\s+\d+/i.test((n.textContent || '').trim())).map(n => Number(n.getAttribute('y'))));
      expect(Math.max(...positions), `${selector} age labels must be inside viewBox height ${h}`).toBeLessThan(h);
    }
  });

  test('[AUTO] Financial Independence: charts contain permanent value callouts, not hover-only information', async ({ page }) => {
    await gotoClean(page, '/financial-independence/');
    await prepareToolForQa(page, 'financial-independence');
    for (const selector of ['#pathChart', '#growthChart']) {
      const count = await page.locator(`${selector} .fi-static-value`).count();
      expect(count, `${selector} should show permanent callouts`).toBeGreaterThanOrEqual(3);
    }
  });

  test('[AUTO] Inflation: chart contains permanent lower/base/higher values and X-axis labels', async ({ page }) => {
    await gotoClean(page, '/inflation-calculator/');
    await prepareToolForQa(page, 'inflation-calculator');
    const text = await svgText(page, '#inflationChart');
    expect(text).toMatch(/Lower/i);
    expect(text).toMatch(/Your assumption/i);
    expect(text).toMatch(/Higher/i);
    expect(text).toMatch(/Today/i);
    expect(text).toMatch(/Year\s+\d+/i);
    expect(await page.locator('#inflationChart .chart-static-value').count()).toBeGreaterThanOrEqual(3);
  });

  test('[AUTO] Goal Planner: both charts expose static year labels and values', async ({ page }) => {
    await gotoClean(page, '/goal-planner/');
    await prepareToolForQa(page, 'goal-planner');
    for (const selector of ['#costChart', '#savingsChart']) {
      const text = await svgText(page, selector);
      expect(text).toMatch(/Today|Year\s+\d+/i);
      expect(text.replace(/\s/g, '').length).toBeGreaterThan(20);
    }
  });

  test('[AUTO] Retirement: both charts expose age labels and permanent currency values', async ({ page }) => {
    await gotoClean(page, '/retirement-calculator/planner.html');
    await prepareToolForQa(page, 'retirement-planner');
    for (const selector of ['#expenseChart', '#portfolioChart']) {
      const text = await svgText(page, selector);
      expect(text).toMatch(/Age\s+\d+/i);
      expect(text).toMatch(/₹|Rs|INR|L|Cr/i);
    }
  });

  test('[AUTO] SIP: both charts expose year labels and static values', async ({ page }) => {
    await gotoClean(page, '/sip-calculator/');
    await prepareToolForQa(page, 'sip-calculator');
    for (const selector of ['#chart1', '#chart2']) {
      const text = await svgText(page, selector);
      expect(text).toMatch(/Year\s+\d+|Today/i);
      expect(text.replace(/\s/g, '').length).toBeGreaterThan(20);
    }
  });
});
