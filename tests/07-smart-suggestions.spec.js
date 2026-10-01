import { test, expect } from '@playwright/test';
import { gotoClean, parseMoney, assertNoHorizontalOverflow } from '../helpers/common.js';

function monthFixture(month, flexibleAmount, options = {}) {
  return {
    month,
    monthExceptional: !!options.monthExceptional,
    flexible: [{
      id: `hist-dining-${month}`,
      name: 'Dining & entertainment',
      amount: flexibleAmount,
      frequency: 'monthly',
      protected: false,
      exceptional: !!options.rowExceptional,
      dueDate: ''
    }],
    essential: [{
      id: `hist-rent-${month}`,
      name: 'Rent / mortgage',
      amount: 30000,
      frequency: 'monthly',
      protected: true,
      exceptional: false,
      dueDate: ''
    }],
    savings: [{ id: `hist-saving-${month}`, name: 'Recurring investment', amount: 10000, frequency: 'monthly' }],
    incomes: [{ id: `hist-income-${month}`, name: 'Salary / wages', amount: 120000, frequency: 'monthly' }],
    summary: {
      income: 120000,
      essential: 30000,
      flexible: flexibleAmount,
      saving: 10000,
      reserves: 0,
      remaining: 80000 - flexibleAmount,
      savingsRate: 10000 / 120000 * 100,
      coverage: 6
    }
  };
}

async function seedHistory(page, months) {
  await page.evaluate(async records => {
    for (const record of records) await window.CarrowmontBudgetStorage.saveMonth(record);
  }, months);
  await page.locator('#refreshHistoryBtn').click();
  await expect(page.locator('#historyTableBody tr')).toHaveCount(months.length);
}

test.describe('Budget Smart Suggestions V1A', () => {
  test('[AUTO] Budget Smart Suggestions: zero history stays factual and does not invent a reduction scenario', async ({ page }) => {
    await gotoClean(page, '/budget-cash-flow-planner/');
    await page.locator('#loadDefaultsBtn').click();
    await expect(page.locator('#smartContext')).toContainText('current month only');
    await expect(page.locator('#insightGrid .insight-card')).toHaveCount(3);
    await expect(page.locator('#smartScenarioPanel')).toHaveClass(/hidden/);
    await expect(page.locator('#smartAllocationPanel')).toBeVisible();
    expect(parseMoney(await page.locator('#smartAllocationAmount').innerText())).toBe(31000);
    await page.locator('#priority').selectOption('goal');
    await expect(page.locator('#smartAllocationText a[href="/goal-planner/"]')).toBeVisible();
    await expect(page.locator('#smartProtectedNote')).toContainText('Protected categories are never used');
    await assertNoHorizontalOverflow(page, 'Budget Smart Suggestions zero-history view');
  });

  test('[AUTO] Budget Smart Suggestions: three normal months unlock evidence-based scenarios and priority linkage', async ({ page }) => {
    await gotoClean(page, '/budget-cash-flow-planner/');
    await page.locator('#loadDefaultsBtn').click();
    await seedHistory(page, [
      monthFixture('2026-07', 5000),
      monthFixture('2026-08', 5000),
      monthFixture('2026-09', 5000)
    ]);

    await expect(page.locator('#smartContext')).toContainText('3 normal saved months');
    await expect(page.locator('#smartScenarioPanel')).toBeVisible();
    expect(parseMoney(await page.locator('#smartScenarioAmount').innerText())).toBeCloseTo(1700, 0);
    await expect(page.locator('#insightGrid [data-smart-kind="flexible_category_change"]')).toBeVisible();

    await page.locator('[data-smart-scenario="low"]').click();
    expect(parseMoney(await page.locator('#smartScenarioAmount').innerText())).toBeCloseTo(850, 0);

    await page.locator('#priority').selectOption('goal');
    await expect(page.locator('#smartPriorityConnection a[href="/goal-planner/"]')).toBeVisible();
    await expect(page.locator('#smartPriorityConnection')).toContainText('monthly contribution input in Goal Planner');

    const diningRow = page.locator('#flexibleRows .entry-row').filter({ has: page.locator('input[data-field="name"][value="Dining & entertainment"]') });
    await expect(diningRow).toHaveCount(1);
    await diningRow.locator('input[data-field="protected"]').check();
    await expect(page.locator('#smartScenarioPanel')).toHaveClass(/hidden/);
  });

  test('[AUTO] Budget Smart Suggestions: exceptional months do not create unsupported trend claims', async ({ page }) => {
    await gotoClean(page, '/budget-cash-flow-planner/');
    await page.locator('#loadDefaultsBtn').click();
    await seedHistory(page, [
      monthFixture('2026-07', 5000),
      monthFixture('2026-08', 5000),
      monthFixture('2026-09', 15000, { monthExceptional: true })
    ]);
    await expect(page.locator('#smartContext')).toContainText('2 normal saved months');
    await expect(page.locator('#smartScenarioPanel')).toHaveClass(/hidden/);
    await expect(page.locator('#insightGrid [data-smart-kind="persistent_flexible_trend"]')).toHaveCount(0);
    await expect(page.locator('#insightGrid [data-smart-kind="flexible_category_change"]')).toHaveCount(0);
  });

  test('[AUTO] Budget Smart Suggestions: engine covers six- and twelve-month persistence without changing essential-category guardrails', async ({ page }) => {
    await gotoClean(page, '/budget-cash-flow-planner/');
    const result = await page.evaluate(() => {
      const S = window.CarrowmontSmartSuggestions;
      const row = (id, name, amount, extra = {}) => ({ id, name, amount, frequency: 'monthly', protected: false, exceptional: false, ...extra });
      const makeMonth = (month, flex) => ({
        month,
        monthExceptional: false,
        flexible: [row('dining', 'Dining', flex)],
        essential: [row('rent', 'Rent', 30000, { protected: true })],
        savings: [],
        summary: { income: 120000, flexible: flex, essential: 30000, saving: 0, remaining: 90000 - flex }
      });
      const state = amount => ({ month: '2027-01', priority: 'buffer', smartScenario: 'balanced', emergencyTargetMonths: 0, flexible: [row('dining', 'Dining', amount)], essential: [row('rent', 'Rent', 36000)], savings: [] });
      const six = [5000,5000,5000,6000,6000,6000].map((v,i) => makeMonth(`2026-${String(i+1).padStart(2,'0')}`, v));
      const twelve = [5000,5000,5000,5000,5000,5000,6000,6000,6000,6000,6000,6000].map((v,i) => makeMonth(`2025-${String(i+1).padStart(2,'0')}`, v));
      const summary = flex => ({ income: 120000, essential: 36000, flexible: flex, saving: 0, reserves: 0, remaining: 84000 - flex, coverage: 0, emergencyGap: 0 });
      const sixResult = S.analyze({ state: state(6000), history: six, summary: summary(6000) });
      const twelveResult = S.analyze({ state: state(6000), history: twelve, summary: summary(6000) });
      return {
        sixMonths: sixResult.signals.find(x => x.kind === 'persistent_flexible_trend')?.historyMonthsUsed || 0,
        twelveMonths: twelveResult.signals.find(x => x.kind === 'persistent_flexible_trend')?.historyMonthsUsed || 0,
        essentialReducible: twelveResult.signals.some(x => x.kind === 'essential_cost_change' && x.eligibleForReduction),
        version: S.VERSION
      };
    });
    expect(result.version).toBe('1.0.0');
    expect(result.sixMonths).toBe(6);
    expect(result.twelveMonths).toBe(12);
    expect(result.essentialReducible).toBe(false);
  });

  test('[AUTO] Budget Smart Suggestions: scenario interaction makes no new fetch or XHR request', async ({ page }) => {
    await gotoClean(page, '/budget-cash-flow-planner/');
    await page.locator('#loadDefaultsBtn').click();
    await seedHistory(page, [monthFixture('2026-07', 5000), monthFixture('2026-08', 5000), monthFixture('2026-09', 5000)]);
    const requests = [];
    page.on('request', request => {
      if (['fetch', 'xhr'].includes(request.resourceType())) requests.push(request.url());
    });
    await page.locator('[data-smart-scenario="aggressive"]').click();
    await page.locator('#priority').selectOption('retirement');
    await page.waitForTimeout(250);
    expect(requests).toEqual([]);
  });
});
