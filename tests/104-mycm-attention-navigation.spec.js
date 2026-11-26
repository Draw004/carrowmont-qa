import {test, expect} from '@playwright/test';
import {gotoClean, assertNoHorizontalOverflow, monitorPageErrors} from '../helpers/common.js';

// Account-isolated fixtures. These are synthetic and never touch production Supabase.
async function mockAccount(page, {profile,scenarios}) {
  await page.addInitScript(({profile,scenarios})=>{
    Object.defineProperty(window,'CarrowmontSupabaseConfig', {configurable:true,get(){return window.__qaSupabaseConfig;},set(value){window.__qaSupabaseConfig={...value,enabled:true,url:'https://example.supabase.co',publishableKey:'pk_qa_only'};}});
    const user={id:'mock-user',email:'qa@example.invalid'};
    window.__qaCloud={profile:{user_id:'mock-user',profile,region:'IN',currency:'INR',updated_at:'2026-11-26T00:00:00Z'},scenarios};
    function builder(){const api={select(){return api;},eq(){return api;},order(){return Promise.resolve({data:window.__qaCloud.scenarios,error:null});},maybeSingle(){return Promise.resolve({data:window.__qaCloud.profile,error:null});},upsert(){return api;},delete(){return api;},single(){return Promise.resolve({data:null,error:null});}};api.then=resolve=>resolve({data:null,error:null});return api;}
    window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user},error:null}),signInWithOtp:async()=>({error:null}),signOut:async()=>({error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:builder})};
  },{profile,scenarios});
}
function fact(value,unit='INR'){return {value,origin:'user',source:'QA saved details',lastUpdated:'2026-11-22T00:00:00Z',excluded:false,unit};}
const profile={schemaVersion:1,version:'dashboard-store-v1.0',mode:'session',createdAt:'2026-11-22T00:00:00Z',updatedAt:'2026-11-22T00:00:00Z',locale:{region:'IN',currency:'INR'},facts:{
  'cashFlow.takeHomeIncome':fact(45000),'cashFlow.essentialExpenses':fact(30000),'cashFlow.flexibleExpenses':fact(12000),'debt.monthlyPayments':fact(10000),
  'resilience.emergencySavings':fact(5000),'resilience.targetMonths':fact(6,'months')
}};
const scenarios=[
  {id:'r1',journey:'retirement',label:'Retirement target',created_at:'2026-08-01T00:00:00Z',updated_at:'2026-11-22T00:00:00Z',scenario:{toolPath:'/retirement-calculator/planner.html#planner',summary:{fundedPct:70,retirementAge:60},planMeta:{lastReviewedAt:'2026-11-22T00:00:00Z',reviewEveryMonths:6,target:{kind:'funding-pct',value:100,age:60}}}},
  {id:'w1',journey:'retirement-withdrawal',label:'Retirement withdrawal',created_at:'2026-08-01T00:00:00Z',updated_at:'2026-11-22T00:00:00Z',scenario:{toolPath:'/retirement-calculator/withdrawal-calculator.html',summary:{runwayMonths:34,targetMonths:60},planMeta:{lastReviewedAt:'2026-11-22T00:00:00Z',reviewEveryMonths:3,target:{kind:'runway-months',value:60}}}},
  {id:'f1',journey:'financial-independence',label:'Financial independence',created_at:'2024-01-01T00:00:00Z',updated_at:'2024-01-01T00:00:00Z',scenario:{toolPath:'/financial-independence/',input:{currentAge:35,targetAge:50},summary:{modelledFIAge:49,targetAge:50},planMeta:{lastReviewedAt:'2024-01-01T00:00:00Z',reviewEveryMonths:6,target:{kind:'fi-age',value:50}}}}
];

test.describe('My Carrowmont: attention goes to the specific saved-plan card',()=>{
  test('[AUTO] overview shows both urgency levels and selects the exact retirement withdrawal card',async({page})=>{
    const errors=monitorPageErrors(page);await mockAccount(page,{profile,scenarios});
    await gotoClean(page,'/my-carrowmont.html?code=qa-auth-return');
    const plan=page.locator('#mycmFinancialPlan');await expect(plan).toBeVisible();
    const progress=page.locator('#mycmProgressSection');
    // New jump labels must not duplicate exact legacy status badges inside this section.
    await expect(progress.getByText('Needs attention',{exact:true})).toHaveCount(2);
    await expect(progress.getByText('Needs review',{exact:true})).toHaveCount(1);

    await expect(plan.locator('.mycm-plan-overview-links')).toHaveCount(2);
    const attention=plan.locator('.mycm-plan-overview-links[aria-label="Planning areas needing attention"]');
    await expect(attention.locator('[data-mycm-progress-jump="retirement"]')).toBeVisible();
    await expect(attention.locator('[data-mycm-progress-jump="retirement-withdrawal"]')).toBeVisible();
    await expect(plan.locator('.mycm-plan-overview-links[aria-label="Planning areas to review"]').locator('[data-mycm-progress-jump="financial-independence"]')).toBeVisible();
    const cloudBefore=await page.evaluate(()=>JSON.stringify(window.__qaCloud));
    await attention.locator('[data-mycm-progress-jump="retirement-withdrawal"]').click();
    const detail=page.locator('#mycm-progress-retirement-withdrawal');
    await expect(detail).toBeFocused();await expect(detail).toHaveClass(/mycm-progress-card-focus/);
    await expect(detail).toContainText('The saved withdrawal plan is about');
    expect(await page.evaluate(()=>JSON.stringify(window.__qaCloud))).toBe(cloudBefore);
    expect(errors).toEqual([]);
  });

  test('[AUTO] overview facts and saved progress counts jump to exact sections via keyboard and click',async({page})=>{
    await mockAccount(page,{profile,scenarios});
    await gotoClean(page,'/my-carrowmont.html?code=qa-auth-return');
    const plan=page.locator('#mycmFinancialPlan');
    const cash=plan.locator('[data-mycm-plan-jump="cash-flow"]');await expect(cash).toBeVisible();
    await cash.focus();await page.keyboard.press('Enter');
    await expect(page.locator('#mycm-plan-area-cash-flow')).toBeFocused();
    const summary=page.locator('#mycmProgressSummary');await expect(summary).toContainText('need');
    const targets=page.locator('#mycmProgressTargets');
    await expect(targets).toBeVisible();
    await expect(targets.locator('.mycm-progress-target')).toHaveCount(3);
    await targets.getByRole('button',{name:'Review Financial independence: Needs review'}).click();
    await expect(page.locator('#mycm-progress-financial-independence')).toBeFocused();
    await expect(page.locator('#mycm-progress-financial-independence')).toHaveClass(/mycm-progress-card-focus/);
  });

  test('[AUTO] mobile dashboard stays inside viewport with multiple attention links',async({page})=>{
    const errors=monitorPageErrors(page);await page.setViewportSize({width:390,height:844});
    await mockAccount(page,{profile,scenarios});await gotoClean(page,'/my-carrowmont.html?code=qa-auth-return');
    await expect(page.locator('#mycmFinancialPlan .mycm-plan-overview-links')).toHaveCount(2);
    await assertNoHorizontalOverflow(page,'My Carrowmont attention navigation at 390px');
    await page.locator('#mycmProgressTargets .mycm-progress-target').first().click();
    await expect(page.locator('#mycm-progress-retirement')).toBeFocused();
    await assertNoHorizontalOverflow(page,'My Carrowmont after jump');expect(errors).toEqual([]);
  });
});
