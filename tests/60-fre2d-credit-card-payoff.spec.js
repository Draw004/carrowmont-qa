import { test, expect } from '@playwright/test';

test.describe('FRE Batch 2D credit-card payoff comparison', () => {
  test('[AUTO] deterministic comparison and target solve are exposed', async ({ page }) => {
    await page.goto('/budget-cash-flow-planner/credit-card-payoff-calculator.html');
    await expect(page.locator('h1')).toContainText('higher monthly card payment');
    await page.locator('#balance').fill('5000');
    await page.locator('#apr').fill('24');
    await page.locator('#minimum').fill('150');
    await page.locator('#planned').fill('300');
    await page.locator('#targetMonths').fill('24');
    await page.locator('#calculateBtn').click();
    await expect(page.locator('#minimumInterest')).not.toHaveText('—');
    await expect(page.locator('#plannedInterest')).not.toHaveText('—');
    await expect(page.locator('#targetPayment')).not.toHaveText('—');
    await expect(page.locator('#reportBtn')).toBeEnabled();
  });
  test('[AUTO] Tools Hub and discovery include credit-card payoff', async ({ page }) => {
    await page.goto('/tools.html');
    await expect(page.locator('[data-secondary-tool="credit-card-payoff-comparison"]')).toHaveCount(1);
    await expect(page.locator('.directory-tool-card')).toHaveCount(23);
    await expect(page.locator('#planning-stress-tests .directory-tool-card')).toHaveCount(9);
  });
});
