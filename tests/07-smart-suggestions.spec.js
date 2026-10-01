import { test, expect } from '@playwright/test';
import { gotoClean, parseMoney, assertNoHorizontalOverflow } from '../helpers/common.js';

function monthFixture(month, flexibleAmount, options = {}) {
  const flexible = options.fullFlexible ? [
    { id: `hist-groceries-${month}`, name: 'Groceries', amount: 15000, frequency: 'monthly', protected: true, exceptional: false, dueDate: '' },
    { id: `hist-dining-${month}`, name: 'Dining & entertainment', amount: flexibleAmount, frequency: 'monthly', protected: false, exceptional: !!options.rowExceptional, dueDate: '' },
    { id: `hist-shopping-${month}`, name: 'Shopping / personal care', amount: 5000, frequency: 'monthly', protected: false, exceptional: false, dueDate: '' }
  ] : [{
    id: `hist-dining-${month}`,
    name: 'Dining & entertainment',
    amount: flexibleAmount,
    frequency: 'monthly',
    protected: false,
    exceptional: !!options.rowExceptional,
    dueDate: ''
  }];
  const flexibleTotal = flexible.reduce((sum, row) => sum + row.amount, 0);
  return {
    month,
    monthExceptional: !!options.monthExceptional,
    flexible,
    essential: [
      { id: `hist-rent-${month}`, name: 'Rent / mortgage', amount: 30000, frequency: 'monthly', protected: true, exceptional: false, dueDate: '' },
      { id: `hist-utilities-${month}`, name: 'Utilities', amount: 6000, frequency: 'monthly', protected: true, exceptional: false, dueDate: '' },
      { id: `hist-insurance-${month}`, name: 'Insurance', amount: 36000, frequency: 'annual', protected: true, exceptional: false, dueDate: '' },
      { id: `hist-transport-${month}`, name: 'Transport commitment', amount: 6500, frequency: 'monthly', protected: false, exceptional: false, dueDate: '' }
    ],
    savings: [
      { id: `hist-invest-${month}`, name: 'Recurring investment', amount: 10000, frequency: 'monthly' },
      { id: `hist-emergency-${month}`, name: 'Emergency savings', amount: 5000, frequency: 'monthly' }
    ],
    incomes: [{ id: `hist-income-${month}`, name: 'Salary / wages', amount: 120000, frequency: 'monthly' }],
    summary: {
      income: 120000,
      essential: 45500,
      flexible: flexibleTotal,
      saving: 15000,
      reserves: 3000,
      remaining: 120000 - 45500 - flexibleTotal - 15000,
      savingsRate: 15000 / 120000 * 100,
      coverage: 180000 / 45500
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

test.describe('Budget Smart Suggestions SS2', () => {
  test('[AUTO] SS2 current-only state uses factual evidence and does not invent a history trend', async ({ page }) => {
    await gotoClean(page, '/budget-cash-flow-planner/');
    await page.locator('#loadDefaultsBtn').click();
    await expect(page.locator('#smartContext')).toContainText('current month only');
    await expect(page.locator('#insightGrid [data-smart-kind="persistent_flexible_trend"]')).toHaveCount(0);
    await expect(page.locator('#insightGrid [data-smart-kind="flexible_category_change"]')).toHaveCount(0);
    await expect(page.locator('#insightGrid .smart-evidence-badge')).toHaveText(/Current/i);
    await expect(page.locator('#smartScenarioPanel')).toHaveClass(/hidden/);
    await expect(page.locator('#smartAllocationPanel')).toBeVisible();
    expect(parseMoney(await page.locator('#smartAllocationAmount').innerText())).toBe(31000);
    await expect(page.locator('#smartProtectedNote')).toContainText('quarterly, annual or irregular');
    await assertNoHorizontalOverflow(page, 'Budget SS2 current-only view');
  });

  test('[AUTO] SS2 three normal months show Emerging evidence, transparent scenario breakdown and priority linkage', async ({ page }) => {
    await gotoClean(page, '/budget-cash-flow-planner/');
    await page.locator('#loadDefaultsBtn').click();
    await seedHistory(page, [
      monthFixture('2026-07', 5000, { fullFlexible: true }),
      monthFixture('2026-08', 5000, { fullFlexible: true }),
      monthFixture('2026-09', 5000, { fullFlexible: true })
    ]);

    const card = page.locator('#insightGrid [data-smart-kind="flexible_category_change"]').filter({ hasText: 'Dining & entertainment' });
    await expect(card).toBeVisible();
    await expect(card.locator('.smart-evidence-badge')).toHaveText(/Emerging/i);
    await expect(card.locator('.smart-evidence-line')).toContainText('recent 3-month baseline');
    await card.locator('.smart-why summary').click();
    await expect(card.locator('.smart-why p')).toContainText('not labelled Established');

    await expect(page.locator('#smartScenarioPanel')).toBeVisible();
    expect(parseMoney(await page.locator('#smartScenarioAmount').innerText())).toBeCloseTo(1700, 0);
    await page.locator('#smartScenarioBreakdown summary').click();
    await expect(page.locator('#smartScenarioBreakdownBody .smart-breakdown-row')).toHaveCount(1);
    await expect(page.locator('#smartScenarioBreakdownBody')).toContainText('Baseline');
    await expect(page.locator('#smartScenarioBreakdownBody')).toContainText('Evidenced excess');

    await page.locator('[data-smart-scenario="low"]').click();
    expect(parseMoney(await page.locator('#smartScenarioAmount').innerText())).toBeCloseTo(850, 0);
    await page.locator('#priority').selectOption('goal');
    await expect(page.locator('#smartPriorityConnection a[href="/goal-planner/"]')).toBeVisible();
    await expect(page.locator('#smartPriorityConnection')).toContainText(/over\s+12\s+months/i);
    await assertNoHorizontalOverflow(page, 'Budget SS2 scenario view');
  });

  test('[AUTO] SS2 stable data can show a no-strong-trend state instead of filler cards', async ({ page }) => {
    await gotoClean(page, '/budget-cash-flow-planner/');
    await page.locator('#loadDefaultsBtn').click();
    await page.locator('#emergencyTargetMonths').fill('0');
    await page.locator('#emergencyTargetMonths').dispatchEvent('input');
    await page.locator('#priority').selectOption('buffer');
    await seedHistory(page, [
      monthFixture('2026-07', 8500, { fullFlexible: true }),
      monthFixture('2026-08', 8500, { fullFlexible: true }),
      monthFixture('2026-09', 8500, { fullFlexible: true })
    ]);
    await expect(page.locator('#insightGrid .smart-empty-state')).toBeVisible();
    await expect(page.locator('#insightGrid')).toContainText('No strong adjustable trend stands out');
    await expect(page.locator('#smartScenarioPanel')).toHaveClass(/hidden/);
  });

  test('[AUTO] SS2 persistence requires materiality plus repeated consistency at 6 and 12 months', async ({ page }) => {
    await gotoClean(page, '/budget-cash-flow-planner/');
    const result = await page.evaluate(() => {
      const S = window.CarrowmontSmartSuggestions;
      const row = (id, name, amount, extra = {}) => ({ id, name, amount, frequency: 'monthly', protected: false, exceptional: false, ...extra });
      const makeMonth = (month, flex) => ({ month, monthExceptional: false, flexible: [row('dining', 'Dining', flex)], essential: [], savings: [], summary: { income: 120000, flexible: flex, essential: 0, saving: 0, remaining: 120000 - flex } });
      const state = amount => ({ month: '2027-01', priority: 'buffer', smartScenario: 'balanced', emergencyTargetMonths: 0, flexible: [row('dining', 'Dining', amount)], essential: [], savings: [] });
      const summary = flex => ({ income: 120000, essential: 0, flexible: flex, saving: 0, reserves: 0, remaining: 120000 - flex, coverage: 0, emergencyGap: 0 });
      const sixEstablished = [5000,5000,5000,6000,6000,6000].map((v,i) => makeMonth(`2026-${String(i+1).padStart(2,'0')}`,v));
      const sixSpike = [5000,5000,5000,5000,5000,9000].map((v,i) => makeMonth(`2026-${String(i+1).padStart(2,'0')}`,v));
      const twelveEstablished = [5000,5000,5000,5000,5000,5000,6000,6000,6000,6000,6000,6000].map((v,i) => makeMonth(`2025-${String(i+1).padStart(2,'0')}`,v));
      const twelveSpike = [5000,5000,5000,5000,5000,5000,5000,5000,5000,5000,5000,12000].map((v,i) => makeMonth(`2025-${String(i+1).padStart(2,'0')}`,v));
      const analyze = (history, flex) => S.analyze({ state: state(flex), history, summary: summary(flex) });
      return {
        version: S.VERSION,
        sixEstablished: analyze(sixEstablished,6000).signals.find(x => x.kind === 'persistent_flexible_trend'),
        sixSpike: analyze(sixSpike,9000).signals.find(x => x.kind === 'persistent_flexible_trend'),
        twelveEstablished: analyze(twelveEstablished,6000).signals.find(x => x.kind === 'persistent_flexible_trend'),
        twelveSpike: analyze(twelveSpike,12000).signals.find(x => x.kind === 'persistent_flexible_trend')
      };
    });
    expect(result.version).toBe('2.0.0');
    expect(result.sixEstablished?.confidenceLabel).toBe('Established');
    expect(result.sixEstablished?.consistencyCount).toBeGreaterThanOrEqual(2);
    expect(result.sixSpike).toBeUndefined();
    expect(result.twelveEstablished?.confidenceLabel).toBe('Established');
    expect(result.twelveEstablished?.consistencyCount).toBeGreaterThanOrEqual(4);
    expect(result.twelveSpike).toBeUndefined();
  });

  test('[AUTO] SS2 recurring step-up, reserve-style and protected rules stay deterministic', async ({ page }) => {
    await gotoClean(page, '/budget-cash-flow-planner/');
    const result = await page.evaluate(() => {
      const S = window.CarrowmontSmartSuggestions;
      const row = (id, name, amount, extra = {}) => ({ id, name, amount, frequency: 'monthly', protected: false, exceptional: false, ...extra });
      const month = (m, amount) => ({ month:m, monthExceptional:false, flexible:[row('d','Dining',amount)], essential:[], savings:[], summary:{income:120000,flexible:amount,essential:0,saving:0,remaining:120000-amount} });
      const history = [5000,5000,5000,6500,6500].map((v,i)=>month(`2026-${String(i+1).padStart(2,'0')}`,v));
      const summary = flex => ({income:120000,essential:0,flexible:flex,saving:0,reserves:0,remaining:120000-flex,coverage:0,emergencyGap:0});
      const state = extra => ({month:'2026-06',priority:'buffer',smartScenario:'balanced',emergencyTargetMonths:0,flexible:[row('d','Dining',7000,extra)],essential:[],savings:[]});
      const recurring = S.analyze({state:state({}),history,summary:summary(7000)});
      const protectedResult = S.analyze({state:state({protected:true}),history,summary:summary(7000)});
      const annualHistory = ['2026-01','2026-02','2026-03'].map(m=>({month:m,monthExceptional:false,flexible:[row('annual','Annual travel reserve',12000,{frequency:'annual'})],essential:[],savings:[],summary:{income:120000,flexible:1000,essential:0,saving:0,remaining:119000}}));
      const annual = S.analyze({state:{month:'2026-04',priority:'buffer',smartScenario:'balanced',emergencyTargetMonths:0,flexible:[row('annual','Annual travel reserve',24000,{frequency:'annual'})],essential:[],savings:[]},history:annualHistory,summary:summary(2000)});
      return {
        recurring: recurring.signals.find(x=>x.kind==='recurring_cost_step_up'),
        genericSuppressed: recurring.signals.find(x=>x.kind==='flexible_category_change')?.suppressedBy || null,
        protectedCandidates: protectedResult.reductionCandidates.length,
        annualSignal: annual.signals.find(x=>x.kind==='reserve_style_change'),
        annualCandidates: annual.reductionCandidates.length
      };
    });
    expect(result.recurring).toBeTruthy();
    expect(result.genericSuppressed).toBe(result.recurring.id);
    expect(result.protectedCandidates).toBe(0);
    expect(result.annualSignal?.frequencyClass).toBe('reserve-style');
    expect(result.annualSignal?.scenarioEligible).toBe(false);
    expect(result.annualCandidates).toBe(0);
  });

  test('[AUTO] SS2 ranking, deduplication and scenario breakdown reproduce deterministically', async ({ page }) => {
    await gotoClean(page, '/budget-cash-flow-planner/');
    const result = await page.evaluate(() => {
      const S = window.CarrowmontSmartSuggestions;
      const row = (id,name,amount,extra={}) => ({id,name,amount,frequency:'monthly',protected:false,exceptional:false,...extra});
      const hist = ['2026-07','2026-08','2026-09'].map(month => ({month,monthExceptional:false,flexible:[row('d','Dining',5000),row('s','Shopping',3000)],essential:[],savings:[],summary:{income:120000,flexible:8000,essential:0,saving:0,remaining:112000}}));
      const state = {month:'2026-10',priority:'goal',smartScenario:'balanced',emergencyTargetMonths:0,flexible:[row('d','Dining',8500),row('s','Shopping',5000)],essential:[],savings:[]};
      const summary = {income:120000,essential:0,flexible:13500,saving:0,reserves:0,remaining:106500,coverage:0,emergencyGap:0};
      const a = S.analyze({state,history:hist,summary});
      const b = S.analyze({state:structuredClone(state),history:structuredClone(hist),summary:structuredClone(summary)});
      const total = a.signals.find(x=>x.kind==='flexible_total_change');
      const sum = a.scenarios.breakdown.balanced.reduce((n,x)=>n+x.adjustmentValue,0);
      return {same:JSON.stringify(a)===JSON.stringify(b),primary:a.primary.map(x=>({kind:x.kind,score:x.score,id:x.id})),suppressedBy:total?.suppressedBy||null,total:a.scenarios.totals.balanced,sum,breakdown:a.scenarios.breakdown.balanced};
    });
    expect(result.same).toBe(true);
    expect(result.primary.length).toBeLessThanOrEqual(3);
    expect(result.primary.every((x,i,arr)=>i===0 || arr[i-1].score >= x.score)).toBe(true);
    expect(result.suppressedBy).toBeTruthy();
    expect(result.sum).toBeCloseTo(result.total, 8);
    expect(result.breakdown.every(x=>x.adjustmentValue <= x.excessValue)).toBe(true);
  });

  test('[AUTO] SS2 Smart Suggestions interactions create no budget-data fetch or XHR request', async ({ page }) => {
    await gotoClean(page, '/budget-cash-flow-planner/');
    await page.locator('#loadDefaultsBtn').click();
    await seedHistory(page, [
      monthFixture('2026-07', 5000, { fullFlexible: true }),
      monthFixture('2026-08', 5000, { fullFlexible: true }),
      monthFixture('2026-09', 5000, { fullFlexible: true })
    ]);
    const requests = [];
    page.on('request', request => {
      if (['fetch', 'xhr'].includes(request.resourceType())) requests.push(request.url());
    });
    await page.locator('[data-smart-scenario="aggressive"]').click();
    await page.locator('#smartScenarioBreakdown summary').click();
    await page.locator('#priority').selectOption('retirement');
    await page.locator('#insightGrid .smart-why summary').first().click();
    await page.waitForTimeout(250);
    expect(requests).toEqual([]);
  });
});
