import { test, expect } from '@playwright/test';
import { gotoClean, assertNoHorizontalOverflow } from '../helpers/common.js';

// These hashes already appear on Carrowmont Home and evergreen Learn guides.
// The modern Learn Hub is JavaScript-enhanced: a missing static DOM id is normal,
// but the hash must activate the correct topic rather than silently resetting to All.
const cases = [
  { hash: 'assets-investing', topic: 'assets', heading: /Assets|Investing/i },
  { hash: 'financial-goals', topic: 'goals', heading: /Financial Goals/i },
  { hash: 'retirement-expenses', topic: 'retirement', heading: /Retirement/i },
  { hash: 'compounding', topic: 'foundation', heading: /Foundation/i },
  { hash: 'inflation', topic: 'inflation', heading: /Inflation/i },
  { hash: 'home-loans', topic: 'home', heading: /Home Loan|Mortgage/i }
];
for (const c of cases) {
  test(`[AUTO] legacy Learn URL #${c.hash} selects the intended visible topic`, async ({page}) => {
    await gotoClean(page, `/learn.html#${c.hash}`);
    await expect(page.locator('body')).toHaveClass(/learn-hub2-ready/);
    await expect(page.locator(`[data-learn-topic="${c.topic}"]`)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#learn2ResultsTitle')).toContainText(c.heading);
    await expect(page.locator('#learn2Results [data-learn-result]').first()).toBeVisible();
  });
}
test('[AUTO] legacy Learn URL topic switch responds to hashchange and works on a narrow screen', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await gotoClean(page, '/learn.html#financial-goals');
  await expect(page.locator('body')).toHaveClass(/learn-hub2-ready/);
  await expect(page.locator('[data-learn-topic="goals"]')).toHaveAttribute('aria-pressed','true');
  await page.evaluate(() => { window.location.hash = 'assets-investing'; });
  await expect(page.locator('[data-learn-topic="assets"]')).toHaveAttribute('aria-pressed','true');
  await assertNoHorizontalOverflow(page);
});
