import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors, assertNoHorizontalOverflow } from '../helpers/common.js';

const ASK='/ask-carrowmont.html';
const GUIDE='/what-to-do-with-a-lump-sum.html';

async function setValue(page,name,value){
  const input=page.locator(`#askQuestionFields input[name="${name}"]`);
  await expect(input).toBeVisible();
  await input.fill(String(value));
}

async function submit(page){await page.locator('#askQuestionsForm button[type="submit"]').click();}

async function completeJourney(page){
  await setValue(page,'lumpSumAmount',200000);
  await setValue(page,'essentialExpenses',20000);
  await setValue(page,'emergencySavings',50000);
  await submit(page);
  await setValue(page,'emergencyTargetMonths',3);
  await setValue(page,'debtBalance',50000);
  await setValue(page,'goalTargetAmount',300000);
  await submit(page);
  await setValue(page,'debtAprPct',18);
  await setValue(page,'debtMonthlyPayment',5000);
  await setValue(page,'goalCurrentSavings',50000);
  await submit(page);
  await setValue(page,'goalYearsAway',3);
  await setValue(page,'goalMonthlyContribution',3000);
  await setValue(page,'assumedLongTermReturnPct',7);
  await submit(page);
  await setValue(page,'investmentHorizonYears',10);
  await submit(page);
}

test.describe('FRE12B-4 lump-sum vs goal trade-offs',()=>{
  test('[AUTO] guided journey compares the same lump sum across four destinations plus a priority split',async({page})=>{
    const errors=monitorPageErrors(page);
    await gotoClean(page,ASK);
    await page.locator('[data-ask-intent="lump-sum-goal-tradeoffs"]').click();
    await expect(page.locator('#askProgressText')).toContainText('Step 1');
    await expect(page.locator('#askQuestionFields input')).toHaveCount(3);
    await completeJourney(page);
    await expect(page.locator('#askResultStage')).toBeVisible();
    await expect(page.locator('#askResultSituation')).toHaveText('Use a lump sum across competing priorities');
    await expect(page.locator('#askRecommendationHeadline')).toContainText('layers');
    await expect(page.locator('#askAlternativesHeading')).toHaveText('Paths compared');
    await expect(page.locator('#askAlternatives .ask-alternative')).toHaveCount(5);
    const text=await page.locator('#askAlternatives').innerText();
    expect(text).toContain('Modeled priority split');
    expect(text).toContain('Use the lump sum for emergency savings');
    expect(text).toContain('Use the lump sum to pay down the debt');
    expect(text).toContain('Use the lump sum for the goal');
    expect(text).toContain('Invest the lump sum for the long term');
    await expect(page.locator('#askEngineTrace')).toContainText('Emergency fund runway');
    await expect(page.locator('#askEngineTrace')).toContainText('Debt payoff');
    await expect(page.locator('#askEngineTrace')).toContainText('Goal planner');
    await expect(page.locator('#askEngineTrace')).toContainText('Compound interest');
    const storage=await page.evaluate(()=>JSON.stringify({local:{...localStorage},session:{...sessionStorage}}));
    expect(storage).not.toContain('lumpSumAmount');
    expect(storage).not.toContain('200000');
    expect(errors).toEqual([]);
  });

  test('[AUTO] zero debt and zero goal skip irrelevant follow-up fields',async({page})=>{
    await gotoClean(page,ASK+'?decision=lump-sum-goal-tradeoffs');
    await setValue(page,'lumpSumAmount',25000);
    await setValue(page,'essentialExpenses',3000);
    await setValue(page,'emergencySavings',18000);
    await submit(page);
    await setValue(page,'emergencyTargetMonths',6);
    await setValue(page,'debtBalance',0);
    await setValue(page,'goalTargetAmount',0);
    await submit(page);
    await expect(page.locator('input[name="debtAprPct"]')).toHaveCount(0);
    await expect(page.locator('input[name="debtMonthlyPayment"]')).toHaveCount(0);
    await expect(page.locator('input[name="goalCurrentSavings"]')).toHaveCount(0);
    await setValue(page,'assumedLongTermReturnPct',5);
    await setValue(page,'investmentHorizonYears',10);
    await submit(page);
    await expect(page.locator('#askResultStage')).toBeVisible();
    await expect(page.locator('#askAlternatives .ask-alternative')).toHaveCount(3);
  });

  test('[AUTO] modified Learn guide deep-links into the guided decision and remains mobile safe',async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await gotoClean(page,GUIDE);
    const cta=page.getByRole('link',{name:/Compare the lump sum across your priorities/i});
    await expect(cta).toHaveAttribute('href','/ask-carrowmont.html?decision=lump-sum-goal-tradeoffs');
    await assertNoHorizontalOverflow(page);
    await Promise.all([page.waitForURL(/ask-carrowmont\.html\?decision=lump-sum-goal-tradeoffs/),cta.click()]);
    await expect(page.locator('#askQuestionsStage')).toBeVisible();
    await expect(page.locator('input[name="lumpSumAmount"]')).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });
});
