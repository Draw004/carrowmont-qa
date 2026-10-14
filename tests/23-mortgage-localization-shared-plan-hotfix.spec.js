import { test, expect } from '@playwright/test';
import { gotoClean, assertNoHorizontalOverflow, setInput } from '../helpers/common.js';

const PAYOFF='/mortgage-payoff-calculator/';
const HUB='/mortgage-payoff-calculator/decision-centre.html';
const PREPAY='/mortgage-payoff-calculator/prepayment-vs-investing.html';
const REFI='/mortgage-payoff-calculator/refinance-break-even.html';
const STRESS='/mortgage-payoff-calculator/rate-rise-stress-test.html';

async function setLocale(page,region,currency){
  await expect.poll(()=>page.evaluate(()=>Boolean(window.CarrowmontLocale?.setLocale))).toBe(true);
  await page.evaluate(({region,currency})=>window.CarrowmontLocale.setLocale(region,currency),{region,currency});
  await expect.poll(()=>page.evaluate(()=>window.CarrowmontLocale.getRegion())).toBe(region);
}

async function sharedValue(page,path){
  return await page.evaluate(p=>window.CarrowmontPlanState?.readValue(p) ?? null,path);
}

test.describe('Mortgage / home-loan localization and shared-plan hotfix',()=>{
  test('[AUTO] Decision Centre family wording follows India, US, UK and Australia terminology',async({page})=>{
    await gotoClean(page,HUB);
    const cases=[
      ['IN','INR','Home Loan Decision Centre','HOME LOAN DECISION CENTRE','Home Loan Guides','Home Loan decisions'],
      ['US','USD','Mortgage Decision Centre','MORTGAGE DECISION CENTRE','Mortgage Guides','Mortgage decisions'],
      ['GB','GBP','Mortgage Decision Centre','MORTGAGE DECISION CENTRE','Mortgage Guides','Mortgage decisions'],
      ['AU','AUD','Home Loan Decision Centre','HOME LOAN DECISION CENTRE','Home Loan Guides','Home Loan decisions']
    ];
    for(const [region,currency,family,eyebrow,learn,hub] of cases){
      await setLocale(page,region,currency);
      await expect(page.locator('#productLabel')).toHaveText(family);
      await expect(page.locator('[data-mortgage-copy="familyEyebrow"]')).toHaveText(eyebrow);
      await expect(page.locator('[data-mortgage-copy="learnLabel"]')).toHaveText(learn);
      await expect(page.locator('#hubIdentity')).toHaveText(hub);
    }
  });

  test('[AUTO] India payoff page uses Home Loan wording in the previously hard-coded decision and FAQ copy',async({page})=>{
    await gotoClean(page,PAYOFF); await setLocale(page,'IN','INR');
    await expect(page.locator('[data-mortgage-copy="nextDecision"]')).toHaveText('NEXT HOME LOAN DECISION');
    await expect(page.locator('[data-mortgage-copy="payoffDecisionLink"]')).toHaveText('Open Home Loan Decision Centre →');
    await expect(page.locator('[data-mortgage-copy="payoffExtraFaq"]')).toContainText('home loan payments');
    await expect(page.locator('[data-mortgage-copy="payoffFamilyLabel"]')).toHaveText('Home Loan Payoff / Prepayment');
  });

  test('[AUTO] India MDC1A, MDC1B and MDC1C localize saved-detail, privacy, footer and journey wording',async({page})=>{
    const cases=[
      [PREPAY,'[data-mortgage-copy="prepayPrivacy"]','Home loan facts','[data-mortgage-copy="clearSavedDetails"]','Clear saved home loan details'],
      [REFI,'[data-mortgage-copy="refiPrivacy"]','home loan facts','[data-mortgage-copy="clearSavedDetails"]','Clear saved home loan details'],
      [STRESS,'[data-mortgage-copy="stressPrivacy"]','Home Loan Decision Centre','[data-mortgage-copy="clearSavedDetails"]','Clear saved home loan details']
    ];
    for(const [target,privacySelector,privacyText,clearSelector,clearText] of cases){
      await gotoClean(page,target); await setLocale(page,'IN','INR');
      await expect(page.locator('[data-mortgage-copy="familyName"]').first()).toHaveText('Home Loan Decision Centre');
      await expect(page.locator(privacySelector)).toContainText(privacyText);
      await expect(page.locator(clearSelector).first()).toHaveText(clearText);
      await expect(page.locator('[data-mortgage-copy="toolsLabel"]')).toHaveText('Home Loan tools');
    }
    await gotoClean(page,PREPAY); await setLocale(page,'IN','INR');
    await expect(page.locator('[data-mortgage-copy="prepayFreedCashFaq"]')).toContainText('home loan');
    await expect(page.locator('[data-mortgage-copy="commonDetailsCopy"]')).not.toContainText('V1');
  });

  test('[AUTO] Stop sharing clears only housing-loan values, survives recalculation and can be re-enabled',async({page})=>{
    await gotoClean(page,PAYOFF); await setLocale(page,'IN','INR');
    await expect.poll(()=>sharedValue(page,'housingLoan.balance')).not.toBeNull();
    await page.evaluate(()=>window.CarrowmontPlanState.set('assumptions.inflationPct',3,{sourceTool:'qa-hotfix'}));
    expect(await sharedValue(page,'assumptions.inflationPct')).toBe(3);

    await expect(page.locator('#clearSharedBtn')).toHaveText('Stop sharing this loan with other Carrowmont tools');
    await page.locator('#clearSharedBtn').click();
    await expect(page.locator('#sharedPlanStatus')).toHaveText('Loan details are no longer available to other Carrowmont tools.');
    expect(await sharedValue(page,'housingLoan.balance')).toBeNull();
    expect(await sharedValue(page,'housingLoan.regularPayment')).toBeNull();
    expect(await sharedValue(page,'assumptions.inflationPct')).toBe(3);
    await expect(page.locator('#clearSharedBtn')).toHaveText('Share this loan with other Carrowmont tools');

    await setInput(page,'#balance',5100000);
    expect(await sharedValue(page,'housingLoan.balance')).toBeNull();
    expect(await sharedValue(page,'assumptions.inflationPct')).toBe(3);

    await page.locator('#clearSharedBtn').click();
    await expect(page.locator('#sharedPlanStatus')).toHaveText('Loan details are now available to compatible Carrowmont tools in this browser.');
    await expect(page.locator('#clearSharedBtn')).toHaveText('Stop sharing this loan with other Carrowmont tools');
    expect(await sharedValue(page,'housingLoan.balance')).toBe(5100000);
    expect(await sharedValue(page,'assumptions.inflationPct')).toBe(3);
  });

  test('[AUTO] locale wording stays responsive at 1280, 390 and 360 across the mortgage family',async({page})=>{
    for(const width of [1280,390,360]){
      await page.setViewportSize({width,height:1000});
      for(const target of [PAYOFF,HUB,PREPAY,REFI,STRESS]){
        await gotoClean(page,target); await setLocale(page,'IN','INR');
        await assertNoHorizontalOverflow(page,`${width}px India ${target}`);
      }
      for(const target of [HUB,STRESS]){
        await gotoClean(page,target); await setLocale(page,'GB','GBP');
        await assertNoHorizontalOverflow(page,`${width}px UK ${target}`);
      }
    }
  });
});
