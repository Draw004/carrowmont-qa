import { test, expect } from '@playwright/test';
import { gotoClean, assertNoHorizontalOverflow } from '../helpers/common.js';

const ASK='/ask-carrowmont.html';

async function fillVisibleQuestions(page, values){
  const inputs=page.locator('#askQuestionFields input');
  const count=await inputs.count();
  expect(count).toBeGreaterThan(0);
  expect(count).toBeLessThanOrEqual(3);
  for(let i=0;i<count;i+=1){
    const input=inputs.nth(i); const name=await input.getAttribute('name');
    expect(Object.prototype.hasOwnProperty.call(values,name)).toBe(true);
    await input.fill(String(values[name]));
  }
  await page.locator('#askQuestionsForm button[type="submit"]').click();
}

async function completeJourney(page,intent,values){
  await page.locator(`[data-ask-intent="${intent}"]`).click();
  for(let step=0;step<8;step+=1){
    if(await page.locator('#askResultStage').isVisible())return;
    await fillVisibleQuestions(page,values);
  }
  throw new Error(`Ask journey ${intent} did not resolve`);
}

async function startTyped(page,query){
  await page.locator('#askQuestion').fill(query);
  await expect.poll(async()=>page.locator('#askStartBtn').textContent()).not.toBe('');
  await page.locator('#askStartBtn').click();
}

test.describe('Ask Intent Alignment & Coverage Wave 2',()=>{
  test('[AUTO] start screen exposes seventeen unique guided journeys across five decision groups',async({page})=>{
    await gotoClean(page,ASK);
    await expect(page.locator('[data-ask-intent]')).toHaveCount(17);
    await expect(page.locator('.ask-decision-group')).toHaveCount(5);
    await expect(page.locator('.ask-decision-group h3')).toHaveText(['Everyday stability','Debt decisions','Big goals','Growth & retirement','Trade-offs']);
    const intents=await page.locator('[data-ask-intent]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-ask-intent')));
    expect(new Set(intents).size).toBe(17);
  });

  test('[AUTO] retirement longevity suggestion and Work through this agree on Drawdown/SWP',async({page})=>{
    await gotoClean(page,ASK);
    const query='calculate how long will my retirement fund would last';
    await page.locator('#askQuestion').fill(query);
    const firstSuggestion=page.locator('#askPredictive .ask-predictive-option').first();
    await expect(firstSuggestion).toContainText(/SWP|Withdrawal|Drawdown/i);
    await expect(page.locator('#askStartBtn')).toContainText('Work through this');
    await page.locator('#askStartBtn').click();
    await expect(page.locator('#askQuestionsTitle')).toHaveText(/Retirement withdrawal(?: \/ SWP \(Systematic Withdrawal Plan\))? and drawdown/i);
    await expect(page.locator('#askQuestionsTitle')).not.toHaveText('Retirement readiness');
  });

  test('[AUTO] explanation wording opens education rather than a calculator questionnaire',async({page})=>{
    await gotoClean(page,ASK);
    await page.locator('#askQuestion').fill('How does credit card interest work?');
    await expect(page.locator('#askStartBtn')).toContainText('Find an explanation');
    await page.locator('#askStartBtn').click();
    await expect(page.locator('#askUnsupported')).toBeVisible();
    await expect(page.locator('#askUnsupported')).toContainText(/How Credit-?Card Interest Works/i);
    await expect(page.locator('#askQuestionStage')).toBeHidden();
    const link=page.locator('#askUnsupported [data-ask-route-result-link][href="/how-credit-card-interest-works.html"]').first();
    await expect(link).toBeVisible();
    await Promise.all([page.waitForURL(url=>url.pathname==='/how-credit-card-interest-works.html'),link.click()]);
    await expect(page.locator('h1')).toContainText(/credit[- ]card interest/i);
  });

  test('[AUTO] four Wave 2 journeys resolve through existing deterministic engines and real final tools',async({page})=>{
    const cases=[
      ['retirement-withdrawal',{retirementWithdrawalBalance:10000000,retirementWithdrawalMonthly:50000,retirementWithdrawalReturnPct:5,retirementWithdrawalGrowthPct:4,retirementWithdrawalStartAge:60},/Withdrawal|drawdown/i,'/retirement-calculator/withdrawal-calculator.html'],
      ['loan-cost',{loanPrincipal:1000000,loanRatePct:9,loanTermMonths:60},/Loan/i,'/loan-calculator/'],
      ['inflation-impact',{inflationAmount:5000000,inflationYears:20,inflationRatePct:6},/Inflation/i,'/inflation-calculator/'],
      ['recurring-investment',{recurringCurrentSavings:100000,recurringContribution:10000,recurringYears:10,recurringReturnPct:10},/SIP|Recurring/i,'/sip-calculator/']
    ];
    for(const [intent,values,trace,href] of cases){
      await gotoClean(page,ASK);
      await completeJourney(page,intent,values);
      await expect(page.locator('#askResultStage')).toBeVisible();
      await expect(page.locator('#askEngineTrace')).toContainText(trace);
      const link=page.locator('#askDetailLinkWrap [data-ask-detail-link="1"]');
      await expect(link).toHaveAttribute('href',href);
      const before=page.url();
      await Promise.all([page.waitForURL(url=>url.pathname===href),link.click()]);
      expect(page.url()).not.toBe(before);
    }
  });

  test('[AUTO] Retirement Readiness offers Drawdown handoff and staged values reach the actual withdrawal calculator',async({page})=>{
    await gotoClean(page,ASK);
    await completeJourney(page,'retirement-readiness',{
      retirementCurrentAge:35,retirementTargetAge:60,retirementPlanningAge:90,retirementCurrentSavings:80000,
      retirementMonthlyContribution:800,retirementMonthlyExpense:4000,retirementSpendingPct:80,
      retirementInflationPct:3,retirementPreReturnPct:6,retirementPostReturnPct:4,retirementBufferPct:10
    });
    const links=page.locator('#askDetailLinkWrap [data-ask-detail-link]');
    await expect(links).toHaveCount(2);
    await expect(links.nth(0)).toHaveAttribute('href','/retirement-calculator/');
    const drawdown=links.nth(1);
    await expect(drawdown).toContainText('Test how long this retirement balance may last');
    await expect(drawdown).toHaveAttribute('href','/retirement-calculator/withdrawal-calculator.html');
    await drawdown.click();
    await page.waitForURL(url=>url.pathname==='/retirement-calculator/withdrawal-calculator.html');
    await expect(page.locator('#retirementImportPanel')).toBeVisible();
    await expect(page.locator('#retirementImportCopy')).toContainText(/Review|retirement/i);
    const payload=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('carrowmont_retirement_withdrawal_handoff_v1')||'null'));
    expect(payload).toBeNull(); // consumer reads and clears the one-time handoff
    await expect(page.locator('#useProjectedImport')).toBeVisible();
    await expect(page.locator('#useTargetImport')).toBeVisible();
  });

  test('[AUTO] debt-versus-invest result CTA follows the modeled winner and never uses the broken debt-payoff fragment',async({page})=>{
    const common={debtBalance:10000,debtMinimumPayment:300,monthlySurplus:500,emergencySavings:10000,essentialExpenses:3000};
    await gotoClean(page,ASK);
    await completeJourney(page,'debt-vs-savings',{...common,debtAprPct:3,assumedSavingsReturnPct:9});
    await expect(page.locator('#askRecommendationHeadline')).toContainText(/invest/i);
    await expect(page.locator('#askDetailLinkWrap [data-ask-detail-link="1"]')).toHaveAttribute('href','/sip-calculator/');

    await gotoClean(page,ASK);
    await completeJourney(page,'debt-vs-savings',{...common,debtAprPct:20,assumedSavingsReturnPct:5});
    await expect(page.locator('#askRecommendationHeadline')).toContainText(/debt/i);
    const debtLink=page.locator('#askDetailLinkWrap [data-ask-detail-link="1"]');
    await expect(debtLink).toHaveAttribute('href','/budget-cash-flow-planner/debt-payoff-calculator.html');
    expect((await debtLink.getAttribute('href'))||'').not.toContain('#debt-payoff');
  });

  test('[AUTO] representative natural wording starts the same specific journey that Search owns',async({page})=>{
    const cases=[
      ['should i prepay my mortgage or invest?','Mortgage prepay or invest'],
      ['my salary finishes before month end','Monthly cash-flow shortfall'],
      ['how much will this loan cost me?','Loan / EMI (Equated Monthly Instalment) cost'],
      ['how much will 10000 sip grow in 10 years?','Recurring investment / SIP (Systematic Investment Plan) growth']
    ];
    for(const [query,title] of cases){
      await gotoClean(page,ASK);
      await startTyped(page,query);
      await expect(page.locator('#askQuestionsTitle')).toHaveText(title);
    }
  });

  test('[AUTO] Search exact retirement query clicks through to the same Drawdown owner',async({page})=>{
    await gotoClean(page,'/search.html');
    await page.locator('#carrowmontSearchInput').fill('calculate how long will my retirement fund would last');
    await page.locator('[data-cm-search-submit]').click();
    const first=page.locator('[data-search-result-link]').first();
    await expect(first).toHaveAttribute('href','/retirement-calculator/withdrawal-calculator.html');
    await expect(first.locator('.cm-search-result-best-match')).toContainText('Best match');
    await Promise.all([page.waitForURL(url=>url.pathname==='/retirement-calculator/withdrawal-calculator.html'),first.click()]);
    await expect(page.locator('h1')).toContainText(/withdrawals|SWP|last/i);
  });

  test('[AUTO] first-use financial abbreviations are expanded in Ask copy and results',async({page})=>{
    await gotoClean(page,ASK);
    await page.locator('[data-ask-intent="borrowing-health"]').click();
    await expect(page.locator('body')).toContainText('DTI (Debt-to-Income ratio)');
    await gotoClean(page,ASK);
    await page.locator('[data-ask-intent="loan-cost"]').click();
    await expect(page.locator('#askQuestionsTitle')).toContainText('EMI');
    await expect(page.locator('body')).toContainText('EMI (Equated Monthly Instalment)');
    await gotoClean(page,ASK);
    await page.locator('[data-ask-intent="recurring-investment"]').click();
    await expect(page.locator('body')).toContainText('SIP (Systematic Investment Plan)');
    await gotoClean(page,ASK);
    await page.locator('[data-ask-intent="retirement-withdrawal"]').click();
    await expect(page.locator('body')).toContainText('SWP (Systematic Withdrawal Plan)');
  });

  test('[AUTO] Wave 2 remains mobile overflow-safe and does not put financial values in the URL',async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await gotoClean(page,ASK);
    await startTyped(page,'how much will this loan cost me?');
    await assertNoHorizontalOverflow(page);
    expect(new URL(page.url()).search).toBe('');
  });
});
