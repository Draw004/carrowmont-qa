import { test, expect } from '@playwright/test';
import { gotoClean, setInput, assertNoHorizontalOverflow, monitorPageErrors } from '../helpers/common.js';

const HUB='/mortgage-payoff-calculator/decision-centre.html';
const PAYOFF='/mortgage-payoff-calculator/';
const GUIDE='/mortgage-refinance-break-even.html';

async function setLocale(page,region,currency){
  const summary=page.locator('#localeSummary, #localeMenu > summary, summary.locale-summary').first();
  const details=summary.locator('xpath=ancestor::details[1]');
  if(await details.count() && !(await details.getAttribute('open'))) await summary.click();
  await expect(page.locator('#regionSelect')).toBeVisible();
  await page.locator('#regionSelect').selectOption(region);
  if(currency) await page.locator('#currencySelect').selectOption(currency);
  await expect(page.locator('#localeCurrent')).toContainText(currency||region);
  const done=page.locator('#localeDone, #localeDoneBtn').first();
  if(await done.count()) await done.click();
  await page.waitForTimeout(100);
}
async function enterUsFixture(page){
  await setLocale(page,'US','USD');
  await setInput(page,'#threePathBalance',300000);
  await setInput(page,'#threePathCurrentRate',7);
  await setInput(page,'#threePathRemainingYears',25);
  await setInput(page,'#threePathRemainingMonths',0);
  await setInput(page,'#threePathLumpSum',30000);
  await setInput(page,'#threePathPrepayCharge',0);
  await setInput(page,'#threePathNewRate',6);
  await setInput(page,'#threePathProposedYears',20);
  await setInput(page,'#threePathProposedMonths',0);
  await setInput(page,'#threePathSwitchingFees',5000);
  await setInput(page,'#threePathExitCharge',0);
  await setInput(page,'#threePathCashback',1000);
  await page.locator('#threePathFeeMode').selectOption('upfront');
}

test.describe('FRE12B-3 Mortgage recast vs refinance / prepayment',()=>{
  test('[AUTO] keeps four Decision Centre cards and adds one anchored three-path comparison',async({page})=>{
    const errors=monitorPageErrors(page); await gotoClean(page,HUB);
    await expect(page.locator('.decision-card')).toHaveCount(4);
    await expect(page.locator('#prepay-recast-refinance')).toBeVisible();
    await expect(page.getByRole('heading',{name:'Prepay, lower the payment or refinance?'})).toBeVisible();
    await expect(page.locator('#threePathRecastSummary')).toContainText('not lender recast availability');
    expect(errors).toEqual([]);
  });

  test('[AUTO] same lump sum creates earlier-payoff, lower-payment and refinance paths without a recommendation',async({page})=>{
    await gotoClean(page,HUB); await setLocale(page,'IN','INR');
    await expect(page.locator('#threePathPrepayHero')).toHaveText('2 years 8 months');
    await expect(page.locator('#threePathRecastHero')).toContainText('44,300');
    await expect(page.locator('#threePathRefiHero')).toHaveText('No durable break-even');
    await expect(page.locator('#threePathRefiSummary')).toContainText('lower payment is paired with higher modeled lifetime borrowing cost');
    await expect(page.locator('#threePathInterpretation')).toContainText('That is a cost comparison, not a recommendation');
  });

  test('[AUTO] refinance-friendly fixture reaches durable break-even while preserving the same shared lump sum',async({page})=>{
    await gotoClean(page,HUB); await enterUsFixture(page);
    await expect(page.locator('#threePathRefiHero')).toHaveText('19 months');
    await expect(page.locator('#threePathRefiSummary')).toContainText('durable break-even about 19 months');
    await expect(page.locator('#threePathInterpretation')).toContainText('Refinance after prepayment has the lowest modeled interest plus entered charges');
  });

  test('[AUTO] full-settlement-sized lump sums are rejected and routed back to payoff purpose',async({page})=>{
    await gotoClean(page,HUB); await setInput(page,'#threePathLumpSum',5000000);
    await expect(page.locator('#threePathValidation')).toBeVisible();
    await expect(page.locator('#threePathValidation')).toContainText('Use the payoff calculator for a full settlement');
  });

  test('[AUTO] saved mortgage facts are never applied until the user explicitly chooses Use in 3-path comparison',async({page})=>{
    const profile={schemaVersion:1,savedAt:'2026-11-21T00:00:00.000Z',country:'US',currency:'USD',balance:654321,annualRatePct:7.25,remainingYears:17,remainingMonths:6,paymentFrequency:'monthly',useCurrentPayment:false,currentPayment:null};
    await page.addInitScript(p=>localStorage.setItem('carrowmontMortgageDecisionV1',JSON.stringify(p)),profile);
    const response=await page.goto(HUB,{waitUntil:'domcontentloaded'}); expect(response.status()).toBeLessThan(400); await page.waitForLoadState('networkidle').catch(()=>{});
    await expect(page.locator('#profileBanner')).toBeVisible();
    await expect(page.locator('#threePathBalance')).toHaveValue('5000000');
    await page.locator('#useProfileComparisonBtn').click();
    await expect(page.locator('#threePathBalance')).toHaveValue('654321');
    await expect(page.locator('#threePathCurrentRate')).toHaveValue('7.25');
    await expect(page.locator('#threePathRemainingYears')).toHaveValue('17');
  });

  test('[AUTO] payoff and Learn pages both route into the anchored comparison',async({page})=>{
    await gotoClean(page,PAYOFF);
    await page.locator('.mode-btn[data-mode="lump"]').click();
    await expect(page.locator('a[href="decision-centre.html#prepay-recast-refinance"]')).toBeVisible();
    await gotoClean(page,GUIDE);
    await expect(page.locator('a[href="/mortgage-payoff-calculator/decision-centre.html#prepay-recast-refinance"]')).toBeVisible();
    await expect(page.getByText('Updated 21 Nov 2026',{exact:true})).toBeVisible();
  });

  test('[AUTO] representative country wording changes without changing the shared calculation route',async({page})=>{
    await gotoClean(page,HUB);
    const cases=[['IN','INR','Lower EMI illustration'],['US','USD','Recast / lower-payment illustration'],['GB','GBP','Lower-repayment illustration'],['AU','AUD','Lower-repayment illustration']];
    for(const [region,currency,label] of cases){await setLocale(page,region,currency);await expect(page.locator('#threePathRecastTitle')).toHaveText(label);}
  });

  test('[AUTO] desktop and mobile layouts avoid horizontal overflow on hub, payoff and Learn guide',async({page})=>{
    for(const width of [1280,390,360]){await page.setViewportSize({width,height:900});for(const target of [HUB,PAYOFF,GUIDE]){await gotoClean(page,target);await assertNoHorizontalOverflow(page,`${width}px ${target}`);}}
  });
});
