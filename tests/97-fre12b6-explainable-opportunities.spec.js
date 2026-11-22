import { test, expect } from '@playwright/test';
import { gotoClean, assertNoHorizontalOverflow, monitorPageErrors } from '../helpers/common.js';

async function mockAccount(page,{profile,scenarios=[]}={}){
  await page.addInitScript(({profile,scenarios})=>{
    Object.defineProperty(window,'CarrowmontSupabaseConfig',{configurable:true,get(){return window.__cmSupabaseConfig;},set(value){window.__cmSupabaseConfig={...value,enabled:true,url:'https://example.supabase.co',publishableKey:'pk_test_public'};}});
    const user={id:'u1',email:'tester@example.com'};window.__cmCloud={profile:{user_id:'u1',profile,schema_version:1,region:'IN',currency:'INR',updated_at:'2026-11-22T00:00:00Z'},scenarios};
    function builder(){const state={payload:null};const api={select(){return api;},eq(){return api;},order(){return Promise.resolve({data:window.__cmCloud.scenarios,error:null});},maybeSingle(){return Promise.resolve({data:window.__cmCloud.profile,error:null});},single(){return Promise.resolve({data:state.payload,error:null});},upsert(payload){state.payload=payload;return api;},delete(){return api;}};api.then=resolve=>resolve({data:null,error:null});return api;}
    window.supabase={createClient:()=>({auth:{getUser:()=>Promise.resolve({data:{user},error:null}),signInWithOtp:async()=>({data:{},error:null}),signOut:async()=>({error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:builder})};
  },{profile,scenarios});
}
function fact(value,unit){return {value,origin:'user',source:'QA saved detail',lastUpdated:'2026-11-22T00:00:00Z',excluded:false,unit,note:null};}
function profile({emergency=20000,flexible=12000}={}){return {schemaVersion:1,version:'dashboard-store-v1.0',mode:'session',createdAt:'2026-11-22T00:00:00Z',updatedAt:'2026-11-22T00:00:00Z',locale:{region:'IN',currency:'INR'},facts:{'cashFlow.takeHomeIncome':fact(80000,'INR'),'cashFlow.essentialExpenses':fact(30000,'INR'),'cashFlow.flexibleExpenses':fact(flexible,'INR'),'debt.monthlyPayments':fact(10000,'INR'),'debt.balance':fact(500000,'INR'),'debt.highestAprPct':fact(14,'pct'),'resilience.emergencySavings':fact(emergency,'INR'),'resilience.targetMonths':fact(6,'months'),'assumptions.longTermReturnPct':fact(8,'pct'),'retirement.currentSavings':fact(500000,'INR'),'retirement.monthlyContribution':fact(20000,'INR'),'goal.targetAmount':fact(1000000,'INR'),'goal.currentSavings':fact(250000,'INR'),'goal.yearsAway':fact(5,'years'),'goal.monthlyContribution':fact(10000,'INR')},lastImport:null};}

test.describe('FRE12B-6 explainable opportunities / decision prompts',()=>{
  test('[AUTO] prompt explains why, numbers, change factors and Tool/Learn routes without mutating the plan',async({page})=>{
    const errors=monitorPageErrors(page);await mockAccount(page,{profile:profile()});await page.setViewportSize({width:390,height:844});await gotoClean(page,'/my-carrowmont.html?code=qa-auth-return');
    const plan=page.locator('#mycmFinancialPlan');await expect(plan).toBeVisible();await expect(plan).toContainText('Explainable opportunities');await expect(plan.locator('.mycm-opportunity')).toHaveCount(3);
    const first=plan.locator('.mycm-opportunity').first();await expect(first.locator('.mycm-opportunity-kind')).toContainText(/Needs attention|Worth reviewing|Opportunity|On track/);await first.locator("summary").click();await expect(first).toContainText("Why you're seeing this");await expect(first.locator('.mycm-opportunity-evidence')).toBeVisible();await expect(first).toContainText('What could change this:');await expect(first.getByRole('link',{name:'Explore this'})).toHaveAttribute('href',/.+/);await expect(first.getByRole('link',{name:'Learn why'})).toHaveAttribute('href',/.+/);
    const cloudBefore=await page.evaluate(()=>JSON.stringify(window.__cmCloud.profile));await first.getByRole('button',{name:'Not now'}).click();const cloudAfter=await page.evaluate(()=>JSON.stringify(window.__cmCloud.profile));expect(cloudAfter).toBe(cloudBefore);await expect(plan.locator('.mycm-prompt-hidden')).toContainText('set aside on this device');await assertNoHorizontalOverflow(page,'12B-6 explainable opportunities 390px');expect(errors).toEqual([]);
  });

  test('[AUTO] Not now survives reload, restore works, unrelated saved inputs stay snoozed, and relevant saved inputs make the prompt eligible again',async({page})=>{
    await mockAccount(page,{profile:profile()});await gotoClean(page,'/my-carrowmont.html?code=qa-auth-return');const plan=page.locator('#mycmFinancialPlan');const first=plan.locator('.mycm-opportunity').first();const key=await first.getAttribute('data-prompt-key');await first.getByRole('button',{name:'Not now'}).click();await page.reload();await expect(plan.locator(`[data-prompt-key="${key}"]`)).toHaveCount(0);await expect(plan.getByRole('button',{name:'Show it again'})).toBeVisible();await plan.getByRole('button',{name:'Show it again'}).click();await expect(plan.locator(`[data-prompt-key="${key}"]`)).toBeVisible();
    await plan.locator(`[data-prompt-key="${key}"]`).getByRole('button',{name:'Not now'}).click();
    await mockAccount(page,{profile:profile({emergency:90000})});await page.reload();await expect(plan.locator(`[data-prompt-key="${key}"]`)).toHaveCount(0);
    await mockAccount(page,{profile:profile({emergency:90000,flexible:11000})});await page.reload();await expect(plan.locator(`[data-prompt-key="${key}"]`)).toBeVisible({timeout:10000});
  });
});
