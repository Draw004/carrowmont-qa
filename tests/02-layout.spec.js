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

  test('[AUTO] Shared locale pill geometry is identical across all six tools', async ({ page }, testInfo) => {
    const metric = async path => {
      await gotoClean(page, path);
      return page.evaluate(() => {
        const header = document.querySelector('.site-header .container');
        const summary = document.querySelector('#localeSummary');
        const popover = document.querySelector('.locale-popover');
        const brand = document.querySelector('.site-header .brand');
        const r = header.getBoundingClientRect();
        const sr = summary.getBoundingClientRect();
        const ss = getComputedStyle(summary);
        const bs = getComputedStyle(brand);
        const ps = getComputedStyle(popover);
        return {
          left:r.left,right:r.right,width:r.width,
          summaryHeight:sr.height,summaryRadius:ss.borderRadius,summaryBoxSizing:ss.boxSizing,
          brandSize:bs.fontSize,brandColor:bs.color,
          popoverWidth:parseFloat(ps.width),popoverPadding:ps.padding,popoverRadius:ps.borderRadius
        };
      });
    };
    const paths = {
      SIP:'/sip-calculator/', Goal:'/goal-planner/', FI:'/financial-independence/', Inflation:'/inflation-calculator/',
      Retirement:'/retirement-calculator/planner.html', Budget:'/budget-cash-flow-planner/'
    };
    const values = {};
    for (const [name,path] of Object.entries(paths)) values[name] = await metric(path);
    const expectedHeight = testInfo.project.name.includes('mobile') ? 38 : 44;
    for (const [name,current] of Object.entries(values)) {
      expect(Math.abs(current.summaryHeight - expectedHeight), `${name} locale pill height (${current.summaryHeight}px; expected ${expectedHeight}px)`).toBeLessThan(1);
      expect(current.summaryRadius, `${name} locale control should be a pill`).toBe('999px');
      expect(current.summaryBoxSizing, `${name} locale pill should use border-box sizing`).toBe('border-box');
    }
    const sip = values.SIP, budget = values.Budget;
    expect(Math.abs(budget.left - sip.left), 'Budget header left edge').toBeLessThan(2);
    expect(Math.abs(budget.right - sip.right), 'Budget header right edge').toBeLessThan(2);
    expect(Math.abs(budget.width - sip.width), 'Budget header width').toBeLessThan(2);
    expect(budget.brandSize, 'Budget shared wordmark size').toBe(sip.brandSize);
    expect(budget.brandColor, 'Budget shared wordmark color').toBe(sip.brandColor);
    if (testInfo.project.name.includes('desktop')) {
      expect(Math.abs(budget.popoverWidth - sip.popoverWidth), 'Budget locale popover width').toBeLessThan(2);
      expect(budget.popoverPadding, 'Budget locale popover padding').toBe(sip.popoverPadding);
      expect(budget.popoverRadius, 'Budget locale popover radius').toBe(sip.popoverRadius);
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
