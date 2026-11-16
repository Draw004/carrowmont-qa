import { test, expect } from '@playwright/test';
import { gotoClean, assertNoHorizontalOverflow, monitorPageErrors } from '../helpers/common.js';

async function mockAccount(page,{signedIn=true,scenarios=[]}={}){
  await page.addInitScript(({signedIn,scenarios})=>{
    Object.defineProperty(window,'CarrowmontSupabaseConfig',{configurable:true,get(){return window.__cmSupabaseConfig;},set(value){window.__cmSupabaseConfig={...value,enabled:true,url:'https://example.supabase.co',publishableKey:'pk_test_public'};}});
    const user=signedIn?{id:'u1',email:'tester@example.com'}:null;
    const fact=(value,unit)=>({value,origin:'user',source:'QA saved detail',lastUpdated:'2026-11-15T00:00:00Z',excluded:false,unit,note:null});
    const profile={schemaVersion:1,version:'dashboard-store-v1.0',mode:'session',createdAt:'2026-11-15T00:00:00Z',updatedAt:'2026-11-15T00:00:00Z',locale:{region:'IN',currency:'INR'},facts:{'cashFlow.takeHomeIncome':fact(80000,'INR'),'cashFlow.essentialExpenses':fact(20000,'INR'),'cashFlow.flexibleExpenses':fact(5000,'INR'),'resilience.emergencySavings':fact(100000,'INR'),'resilience.targetMonths':fact(6,'months')},lastImport:null};
    window.__cmCloud={profile:{user_id:'u1',profile,schema_version:1,region:'IN',currency:'INR',updated_at:'2026-11-15T00:00:00Z'},scenarios};
    function builder(table){const state={payload:null};const api={select(){return api;},eq(){return api;},order(){return Promise.resolve({data:window.__cmCloud.scenarios,error:null});},maybeSingle(){return Promise.resolve({data:window.__cmCloud.profile,error:null});},single(){return Promise.resolve({data:state.payload,error:null});},upsert(payload){state.payload=payload;return api;},delete(){return api;}};api.then=resolve=>resolve({data:null,error:null});return api;}
    window.__oauthCalls=[];
    window.supabase={createClient:()=>({auth:{getUser:()=>Promise.resolve({data:{user},error:null}),signInWithOtp:async()=>({data:{},error:null}),signInWithOAuth:async args=>{window.__oauthCalls.push(args);return {data:{provider:'google'},error:null};},signOut:async()=>({error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:builder})};
  },{signedIn,scenarios});
}

const retirementScenario={id:'r1',user_id:'u1',journey:'retirement',label:'Retirement plan',created_at:'2026-05-15T00:00:00Z',updated_at:'2026-11-15T00:00:00Z',scenario:{toolPath:'/retirement-calculator/',input:{currentAge:35,retirementAge:60,currentSavings:500000,monthlyContribution:20000,annualReturn:8,inflationRate:5},summary:{fundedPct:80,gap:1000000,requiredCorpus:5000000,projectedCorpus:4000000,retirementAge:60,additionalContribution:3000},planMeta:{startedAt:'2026-05-15T00:00:00Z',lastReviewedAt:'2026-11-15T00:00:00Z',reviewEveryMonths:6,target:{kind:'funding-pct',age:60}},history:[]}};

async function setAskValue(page,name,value){const input=page.locator(`#askQuestionFields input[name="${name}"]`);await expect(input).toBeVisible();await input.fill(String(value));}

test.describe('FRE9 Trust, Explainability & Plan Transparency',()=>{
  test('[AUTO] multicolor Google G preserves the existing Google authentication action',async({page})=>{
    await mockAccount(page,{signedIn:false});await gotoClean(page,'/my-carrowmont.html');
    const button=page.locator('#mycmGoogleSignIn');await expect(button).toBeVisible();await expect(button).toContainText('Continue with Google');
    const googleMark=button.locator('.mycm-google-mark img');await expect(googleMark).toBeVisible();await expect(googleMark).toHaveAttribute('src','/assets/brand/google-g.svg');
    await button.click();const calls=await page.evaluate(()=>window.__oauthCalls);expect(calls).toHaveLength(1);expect(calls[0].provider).toBe('google');
  });

  test('[AUTO] signed-in My Carrowmont exposes the formal Trust Contract, saved-data freshness and a per-progress Trust Check',async({page})=>{
    await mockAccount(page,{scenarios:[retirementScenario]});await page.setViewportSize({width:390,height:844});await gotoClean(page,'/my-carrowmont.html?code=qa-auth-return');
    await expect(page.locator('#mycmTrustContract')).toBeVisible();await page.locator('#mycmTrustContract summary').click();
    await expect(page.locator('#mycmTrustContract')).toContainText('Which values are assumptions?');await expect(page.locator('#mycmTrustContract')).toContainText('only plans you deliberately save or update');
    await expect(page.locator('.mycm-fact-source small').first()).toContainText('Last updated');
    await expect(page.locator('.mycm-progress-card')).toHaveCount(1);await expect(page.locator('.mycm-progress-card .mycm-progress-trust')).toHaveCount(1);
    await page.locator('.mycm-progress-card .mycm-progress-trust summary').click();await expect(page.locator('.mycm-progress-card .mycm-progress-trust')).toContainText('Save boundary');
    await expect(page.locator('#mycmExportCloud')).toBeAttached();await expect(page.locator('#mycmDeleteCloud')).toBeAttached();await expect(page.locator('#mycmSignOut')).toBeAttached();
    await assertNoHorizontalOverflow(page,'Batch 9 My Carrowmont 390px');
  });

  test('[AUTO] Ask Trust Check explains an emergency-fund result without changing the answer-first flow',async({page})=>{
    const errors=monitorPageErrors(page);await gotoClean(page,'/ask-carrowmont.html');
    await page.locator('[data-ask-intent="emergency-runway"]').click();await setAskValue(page,'essentialExpenses',3000);await setAskValue(page,'emergencySavings',18000);await page.locator('#askQuestionsForm button[type="submit"]').click();
    await expect(page.locator('#askResultStage')).toBeVisible();await expect(page.locator('#askRecommendationHeadline')).toContainText('meets the target');
    const trust=page.locator('#askMethod');await expect(trust).toContainText('Carrowmont Trust Check');await trust.locator('summary').click();
    await expect(page.locator('#askTrustWhy')).not.toBeEmpty();await expect(page.locator('#askTrustValues li')).toHaveCount(2);await expect(page.locator('#askEngineTrace')).toContainText('Emergency fund runway');await expect(page.locator('#askTrustFreshness')).toContainText('Calculated from the values in this Ask session');await expect(page.locator('#askTrustBoundary')).toContainText('does not change My Carrowmont by itself');
    expect(errors).toEqual([]);
  });

  test('[AUTO] representative shared and standalone planners load the same collapsed tool Trust Check',async({page})=>{
    for(const path of ['/sip-calculator/','/emergency-fund-runway-calculator.html']){
      await page.setViewportSize({width:390,height:844});await gotoClean(page,path);const trust=page.locator('#cmTrustContractTool');await expect(trust).toBeVisible();await expect(trust).not.toHaveAttribute('open','');await trust.locator('summary').click();await expect(trust).toContainText('Why am I seeing this?');await expect(trust).toContainText('What numbers were used?');await expect(trust).toContainText('Which values are assumptions?');await expect(trust).toContainText('What gets saved?');await assertNoHorizontalOverflow(page,`tool Trust Check ${path}`);
    }
  });
});
