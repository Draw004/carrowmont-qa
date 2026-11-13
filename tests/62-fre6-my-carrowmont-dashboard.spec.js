import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors, assertNoHorizontalOverflow } from '../helpers/common.js';

const PATH='/my-carrowmont.html';

async function installMockSupabase(page,{signedIn=true,profile=null}={}){
  await page.addInitScript(({signedIn,profile})=>{
    Object.defineProperty(window,'CarrowmontSupabaseConfig',{configurable:true,get(){return window.__cmSupabaseConfig;},set(value){window.__cmSupabaseConfig={...value,enabled:true,url:'https://example.supabase.co',publishableKey:'pk_test_public'};}});
    window.__cmCloud={profile:profile?{user_id:'u1',profile,schema_version:1,region:'US',currency:'USD',updated_at:'2026-11-12T00:00:00Z'}:null,scenarios:[]};
    const user=signedIn?{id:'u1',email:'tester@example.com'}:null;
    function builder(table){const state={table,mode:'select',payload:null};const api={select(){return api;},eq(){return api;},order(){return Promise.resolve({data:window.__cmCloud.scenarios,error:null});},maybeSingle(){return Promise.resolve({data:window.__cmCloud.profile,error:null});},single(){if(table==='carrowmont_profiles'){window.__cmCloud.profile=state.payload;return Promise.resolve({data:state.payload,error:null});}const row={id:'s1',...state.payload};window.__cmCloud.scenarios=[row];return Promise.resolve({data:row,error:null});},upsert(payload){state.mode='upsert';state.payload=payload;return api;},delete(){state.mode='delete';return api;}};api.then=resolve=>{if(state.mode==='delete'){if(table==='carrowmont_profiles')window.__cmCloud.profile=null;if(table==='carrowmont_saved_scenarios')window.__cmCloud.scenarios=[];resolve({data:null,error:null});}else resolve({data:null,error:null});};return api;}
    window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user},error:null}),signInWithOtp:async()=>({data:{},error:null}),signOut:async()=>({error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:builder})};
  },{signedIn,profile});
}

function sampleProfile(){return {schemaVersion:1,version:'dashboard-store-v1.0',mode:'session',createdAt:'2026-11-12T00:00:00Z',updatedAt:'2026-11-12T00:00:00Z',locale:{region:'US',currency:'USD'},facts:{'cashFlow.takeHomeIncome':{value:6000,origin:'user',source:'QA',lastUpdated:'2026-11-12T00:00:00Z',excluded:false,unit:'USD',note:null},'cashFlow.essentialExpenses':{value:2500,origin:'user',source:'QA',lastUpdated:'2026-11-12T00:00:00Z',excluded:false,unit:'USD',note:null},'cashFlow.flexibleExpenses':{value:0,origin:'user',source:'QA',lastUpdated:'2026-11-12T00:00:00Z',excluded:false,unit:'USD',note:null},'debt.monthlyPayments':{value:0,origin:'user',source:'QA',lastUpdated:'2026-11-12T00:00:00Z',excluded:false,unit:'USD',note:null},'resilience.emergencySavings':{value:12000,origin:'user',source:'QA',lastUpdated:'2026-11-12T00:00:00Z',excluded:false,unit:'USD',note:null}},lastImport:null};}

 test.describe('FRE8A My Carrowmont account-backed dashboard',()=>{
  test('[AUTO] signed-out visitors see sign-in but no populated dashboard',async({page})=>{
    const errors=monitorPageErrors(page);await gotoClean(page,PATH);
    await expect(page.getByRole('heading',{name:'Sign in to My Carrowmont'})).toBeVisible();
    await expect(page.getByRole('button',{name:'Continue with email'})).toBeVisible();
    await expect(page.getByText('No password required.',{exact:false})).toBeVisible();
    await expect(page.locator('#mycmDashboardShell')).toBeHidden();
    await expect(page.locator('#mycmRemember')).toHaveCount(0);
    await expect(page.getByText('Only the plans you choose to keep become part of My Carrowmont.',{exact:false})).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('[AUTO] authenticated profile populates deterministic dashboard and uses session working copy only',async({page})=>{
    await installMockSupabase(page,{signedIn:true,profile:sampleProfile()});
    await gotoClean(page,`${PATH}?code=qa-auth-return`);
    await expect(page.locator('#mycmAccountCurrentEmail')).toHaveText('tester@example.com');
    await expect(page.locator('#mycmDashboardShell')).toBeVisible();
    await expect(page.locator('#mycmCashFlowCard')).toContainText('3,500');
    await expect(page.locator('#mycmEmergencyCard')).toContainText('4.8 months');
    const storage=await page.evaluate(()=>({session:sessionStorage.getItem('carrowmont_guest_dashboard_session_v1'),local:localStorage.getItem('carrowmont_guest_dashboard_local_v1')}));
    expect(storage.session).toContain('cashFlow.takeHomeIncome');expect(storage.local).toBeNull();
  });

  test('[AUTO] signed-in edits update the account-backed profile',async({page})=>{
    await installMockSupabase(page,{signedIn:true,profile:sampleProfile()});await gotoClean(page,`${PATH}?code=qa-auth-return`);
    await page.locator('#mycmCashFlowCard [data-mycm-edit="monthly"]').click();
    const input=page.locator('[data-mycm-path="cashFlow.takeHomeIncome"]');await input.fill('7000');
    await page.locator('#mycmEditForm button[type="submit"]').click();
    await expect(page.locator('#mycmBanner')).toContainText('saved to My Carrowmont');
    await page.waitForTimeout(400);
    const value=await page.evaluate(()=>window.__cmCloud.profile.profile.facts['cashFlow.takeHomeIncome'].value);
    expect(value).toBe(7000);
  });


  test('[AUTO] an explicitly removed saved value stays removed instead of returning as the old value',async({page})=>{
    const profile=sampleProfile();profile.facts['cashFlow.flexibleExpenses'].value=500;
    await installMockSupabase(page,{signedIn:true,profile});await gotoClean(page,`${PATH}?code=qa-auth-return`);
    await page.locator('#mycmCashFlowCard [data-mycm-edit="monthly"]').click();
    page.once('dialog',dialog=>dialog.accept());
    await page.locator('[data-mycm-remove="cashFlow.flexibleExpenses"]').click();
    await page.waitForTimeout(400);
    const stored=await page.evaluate(()=>window.__cmCloud.profile.profile.facts['cashFlow.flexibleExpenses']);
    expect(stored).toBeUndefined();
    await expect(page.locator('[data-mycm-path="cashFlow.flexibleExpenses"]')).toHaveValue('');
    await page.locator('#mycmEditClose').click();
    await page.locator('#mycmCashFlowCard [data-mycm-edit="monthly"]').click();
    await expect(page.locator('[data-mycm-path="cashFlow.flexibleExpenses"]')).toHaveValue('');
  });

  test('[AUTO] dashboard keeps debt and mortgage context in one simple Debt & loans card',async({page})=>{
    const profile=sampleProfile();profile.facts['cashFlow.takeHomeIncome'].value=60000;profile.facts['debt.balance']={value:1200000,origin:'user',source:'QA',lastUpdated:'2026-11-12T00:00:00Z',excluded:false,unit:'USD',note:null};profile.facts['debt.monthlyPayments'].value=22350;profile.facts['debt.highestAprPct']={value:10.8,origin:'user',source:'QA',lastUpdated:'2026-11-12T00:00:00Z',excluded:false,unit:'pct',note:null};
    await installMockSupabase(page,{signedIn:true,profile});await gotoClean(page,`${PATH}?code=qa-auth-return`);
    await expect(page.locator('#mycmDebtCard')).toContainText('Debt & loans');
    await expect(page.locator('#mycmDebtCard')).toContainText('37.3% of your monthly income goes toward debt payments');
    await expect(page.getByText('Mortgage & loan burden')).toHaveCount(0);
  });

  test('[AUTO] account-backed dashboard remains mobile-safe',async({page})=>{
    await installMockSupabase(page,{signedIn:true,profile:sampleProfile()});await page.setViewportSize({width:390,height:844});await gotoClean(page,`${PATH}?code=qa-auth-return`);
    await assertNoHorizontalOverflow(page);await expect(page.locator('#mycmDashboardShell')).toBeVisible();await expect(page.locator('[data-mobile1-bottom-nav]')).toBeVisible();
  });
});
