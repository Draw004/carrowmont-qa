import { test, expect } from '@playwright/test';
import { gotoClean, assertNoHorizontalOverflow } from '../helpers/common.js';

const rounded = box => box ? { x:Math.round(box.x), y:Math.round(box.y), width:Math.round(box.width), height:Math.round(box.height) } : null;

test.describe('FRE8H planner navigation and form polish', () => {
  test('[AUTO] Compound contribution controls align and advanced assumptions start open but opt-in', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await gotoClean(page, '/compound-interest-calculator/');
    const advanced=page.locator('#advancedAssumptions');
    await expect(advanced).toHaveAttribute('open','');
    await expect(page.locator('#inflationEnabled')).not.toBeChecked();
    await expect(page.locator('#contributionEnabled')).not.toBeChecked();
    for(const selector of ['#contributionAmount','#contributionFrequency','#contributionTiming']) await expect(page.locator(selector)).toBeDisabled();
    const controls=await Promise.all([
      page.locator('#contributionAmount').locator('..').boundingBox(),
      page.locator('#contributionFrequency').boundingBox(),
      page.locator('#contributionTiming').boundingBox()
    ]);
    const boxes=controls.map(rounded);
    expect(new Set(boxes.map(b=>b.height))).toEqual(new Set([48]));
    expect(Math.max(...boxes.map(b=>b.y))-Math.min(...boxes.map(b=>b.y))).toBeLessThanOrEqual(1);
    await assertNoHorizontalOverflow(page,'FRE8H compound desktop');
  });

  test('[AUTO] Budget setup controls align in monthly and pay-cycle views', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await gotoClean(page, '/budget-cash-flow-planner/');
    const month=rounded(await page.locator('#budgetMonth').boundingBox());
    const frequency=rounded(await page.locator('#primaryPayFrequency').boundingBox());
    expect(month.height).toBe(42); expect(frequency.height).toBe(42);
    expect(Math.abs(month.y-frequency.y)).toBeLessThanOrEqual(1);
    await page.getByRole('button',{name:'Pay Cycle View'}).click();
    const payday=rounded(await page.locator('#nextPayday').boundingBox());
    const cash=rounded(await page.locator('#availableCash').locator('..').boundingBox());
    expect(payday.height).toBe(42); expect(cash.height).toBe(42);
    expect(Math.abs(payday.y-cash.y)).toBeLessThanOrEqual(1);
    await assertNoHorizontalOverflow(page,'FRE8H budget desktop');
  });

  test('[AUTO] Retirement landing planner actions skip the extra hero click and land at the assumptions section', async ({ page }) => {
    await gotoClean(page, '/retirement-calculator/');
    const cta=page.getByRole('link',{name:'Build my retirement plan',exact:true});
    await expect(cta).toHaveAttribute('href','planner.html#planner');
    await cta.click();
    await expect(page).toHaveURL(/\/retirement-calculator\/planner\.html#planner$/);
    await expect(page.locator('#planner')).toBeVisible();
    await expect(page.getByRole('heading',{name:'Build the assumptions',exact:true})).toBeVisible();
  });
});
