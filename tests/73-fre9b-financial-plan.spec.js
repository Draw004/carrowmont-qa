import { test, expect } from '@playwright/test';
import { gotoClean, assertNoHorizontalOverflow, monitorPageErrors } from '../helpers/common.js';

async function mockAccount(page,{profile,scenarios=[]}={}){
  await page.addInitScript(({profile,scenarios})=>{
    Object.defineProperty(window,'CarrowmontSupabaseConfig',{configurable:true,get(){return window.__cmSupabaseConfig;},set(value){window.__cmSupabaseConfig={...value,enabled:true,url:'https://example.supabase.co',publishableKey:'pk_test_public'};}});
    const user={id:'u1',email:'tester@example.com'};window.__cmCloud={profile:{user_id:'u1',profile,schema_version:1,region:'IN',currency:'INR',updated_at:'2026-11-16T00:00:00Z'},scenarios};
    function builder(table){const state={payload:null};const api={select(){return api;},eq(){return api;},order(){return Promise.resolve({data:window.__cmCloud.scenarios,error:null});},maybeSingle(){return Promise.resolve({data:window.__cmCloud.profile,error:null});},single(){return Promise.resolve({data:state.payload,error:null});},upsert(payload){state.payload=payload;return api;},delete(){return api;}};api.then=resolve=>resolve({data:null,error:null});return api;}
    window.supabase={createClient:()=>({auth:{getUser:()=>Promise.resolve({data:{user},error:null}),signInWithOtp:async()=>({data:{},error:null}),signOut:async()=>({error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:builder})};
  },{profile,scenarios});
}
function savedProfile(){const fact=(value,unit,source='QA saved detail')=>({value,origin:'user',source,lastUpdated:'2026-11-16T00:00:00Z',excluded:false,unit,note:null});return {schemaVersion:1,version:'dashboard-store-v1.0',mode:'session',createdAt:'2026-11-16T00:00:00Z',updatedAt:'2026-11-16T00:00:00Z',locale:{region:'IN',currency:'INR'},facts:{'cashFlow.takeHomeIncome':fact(80000,'INR'),'cashFlow.essentialExpenses':fact(30000,'INR'),'cashFlow.flexibleExpenses':fact(12000,'INR'),'debt.monthlyPayments':fact(10000,'INR'),'debt.balance':fact(500000,'INR'),'debt.highestAprPct':fact(14,'pct'),'resilience.emergencySavings':fact(150000,'INR'),'resilience.targetMonths':fact(6,'months'),'assumptions.longTermReturnPct':fact(8,'pct'),'retirement.currentSavings':fact(500000,'INR'),'retirement.monthlyContribution':fact(20000,'INR'),'goal.targetAmount':fact(1000000,'INR'),'goal.currentSavings':fact(250000,'INR'),'goal.yearsAway':fact(5,'years'),'goal.monthlyContribution':fact(10000,'INR')},lastImport:null};}
const retirementScenario={id:'r1',user_id:'u1',journey:'retirement',label:'Retirement plan',created_at:'2026-05-16T00:00:00Z',updated_at:'2026-11-16T00:00:00Z',scenario:{toolPath:'/retirement-calculator/planner.html#planner',input:{currentAge:35,retirementAge:60,currentSavings:500000,monthlyContribution:20000,annualReturn:8,inflationRate:5},summary:{fundedPct:80,gap:1000000,requiredCorpus:5000000,projectedCorpus:4000000,retirementAge:60,additionalContribution:3000,contributionFrequency:'monthly'},planMeta:{startedAt:'2026-05-16T00:00:00Z',lastReviewedAt:'2026-11-16T00:00:00Z',reviewEveryMonths:6,target:{kind:'funding-pct',age:60}}}};
const goalScenario={id:'g1',user_id:'u1',journey:'goal',label:'Home deposit goal',created_at:'2026-06-16T00:00:00Z',updated_at:'2026-11-16T00:00:00Z',scenario:{toolPath:'/goal-planner/',input:{today:1000000,years:5,existing:250000,monthly:10000,ret:8},summary:{funding:1.04,gap:0,futureCost:1000000,projected:1040000,additionalContribution:0,contributionFrequency:'monthly'},planMeta:{startedAt:'2026-06-16T00:00:00Z',lastReviewedAt:'2026-11-16T00:00:00Z',reviewEveryMonths:6,target:{kind:'funding-pct',value:100,at:'2031-06-16T00:00:00Z'}}}};

test.describe('FRE9B Your Financial Plan View & Report',()=>{
  test('[AUTO] six planning areas reconcile saved facts and saved plans into one traceable view',async({page})=>{
    const errors=monitorPageErrors(page);await mockAccount(page,{profile:savedProfile(),scenarios:[retirementScenario,goalScenario]});await page.setViewportSize({width:390,height:844});await gotoClean(page,'/my-carrowmont.html?code=qa-auth-return');
    const plan=page.locator('#mycmFinancialPlan');await expect(plan).toBeVisible();await expect(plan).toContainText('Your saved plans, brought together in one view.');
    await expect(plan.locator('.mycm-plan-area')).toHaveCount(6);await expect(plan).toContainText('Retirement');await expect(plan).toContainText('Needs attention');await expect(plan).toContainText('Goals & investing');
    await expect(plan).toContainText('Your next three moves');await expect(plan.locator('.mycm-plan-moves li')).toHaveCount(3);await expect(plan).toContainText('Important assumptions');await expect(plan).toContainText('Long-term return assumption');
    const source=plan.locator('.mycm-plan-area').filter({hasText:'Cash flow'}).locator('details.mycm-plan-source');await expect(source.locator('summary')).toHaveText('Where this came from');await source.locator('summary').click();await expect(source).toContainText('Monthly income');await expect(source).toContainText('QA saved detail');
    await assertNoHorizontalOverflow(page,'Batch 9B My Carrowmont 390px');expect(errors).toEqual([]);
  });
  test('[AUTO] report button receives the exact consolidated model already rendered on screen',async({page})=>{
    await mockAccount(page,{profile:savedProfile(),scenarios:[retirementScenario,goalScenario]});await gotoClean(page,'/my-carrowmont.html?code=qa-auth-return');
    await page.evaluate(()=>{window.__batch9bReportModel=null;const real=window.CarrowmontPlanReport;window.CarrowmontPlanReport={...real,generate:async model=>{window.__batch9bReportModel=JSON.parse(JSON.stringify(model));}};});
    await page.locator('#mycmGeneratePlanReport').click();const model=await page.evaluate(()=>window.__batch9bReportModel);expect(model).toBeTruthy();expect(model.version).toBe('carrowmont-financial-plan-v1.0');expect(model.areas).toHaveLength(6);expect(model.moves.length).toBeGreaterThan(0);expect(model.assumptions.length).toBeGreaterThan(0);
    await expect(page.locator('#mycmBanner')).toContainText('My Carrowmont Plan Report downloaded.');
  });
});
