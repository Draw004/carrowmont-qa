import { test, expect } from '@playwright/test';
import { gotoClean, assertNoHorizontalOverflow } from '../helpers/common.js';

async function installMockSupabase(page,{profile,scenarios=[]}={}){
  await page.addInitScript(({profile,scenarios})=>{
    Object.defineProperty(window,'CarrowmontSupabaseConfig',{configurable:true,get(){return window.__cmSupabaseConfig;},set(value){window.__cmSupabaseConfig={...value,enabled:true,url:'https://example.supabase.co',publishableKey:'pk_test_public'};}});
    window.__cmCloud={profile:{user_id:'u1',profile,schema_version:1,region:'US',currency:'USD',updated_at:'2026-11-15T00:00:00Z'},scenarios};
    const user={id:'u1',email:'tester@example.com'};
    function builder(table){const state={table,mode:'select',payload:null};const api={select(){return api;},eq(){return api;},order(){return Promise.resolve({data:window.__cmCloud.scenarios,error:null});},maybeSingle(){return Promise.resolve({data:window.__cmCloud.profile,error:null});},single(){if(table==='carrowmont_profiles'){window.__cmCloud.profile=state.payload;return Promise.resolve({data:state.payload,error:null});}const row={id:state.payload?.id||'s-new',...state.payload};window.__cmCloud.scenarios=[...window.__cmCloud.scenarios.filter(x=>x.id!==row.id&&x.journey!==row.journey),row];return Promise.resolve({data:row,error:null});},upsert(payload){state.mode='upsert';state.payload=payload;return api;},delete(){state.mode='delete';return api;}};api.then=resolve=>{if(state.mode==='delete'){if(table==='carrowmont_profiles')window.__cmCloud.profile=null;if(table==='carrowmont_saved_scenarios')window.__cmCloud.scenarios=[];resolve({data:null,error:null});}else resolve({data:null,error:null});};return api;}
    window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user},error:null}),signInWithOtp:async()=>({data:{},error:null}),signOut:async()=>({error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:builder})};
  },{profile,scenarios});
}

function profile(){
  const fact=(value,unit)=>({value,origin:'user',source:'QA',lastUpdated:'2026-11-15T00:00:00Z',excluded:false,unit,note:null});
  return {schemaVersion:1,version:'dashboard-store-v1.0',mode:'session',createdAt:'2026-11-15T00:00:00Z',updatedAt:'2026-11-15T00:00:00Z',locale:{region:'US',currency:'USD'},facts:{
    'cashFlow.takeHomeIncome':fact(80000,'USD'),'cashFlow.essentialExpenses':fact(20000,'USD'),'cashFlow.flexibleExpenses':fact(5000,'USD'),'debt.monthlyPayments':fact(22350,'USD'),'debt.balance':fact(1200000,'USD'),'debt.highestAprPct':fact(10.8,'pct'),'resilience.emergencySavings':fact(100000,'USD'),'resilience.targetMonths':fact(3,'months')
  },lastImport:null};
}

test.describe('FRE8J My Carrowmont visual intelligence and app experience',()=>{
  test('[AUTO] visual snapshot makes monthly money target progress and neutral debt context immediately legible',async({page})=>{
    await installMockSupabase(page,{profile:profile()});await gotoClean(page,'/my-carrowmont.html?code=qa-auth-return');
    await expect(page.locator('#mycmVisualOverview')).toBeVisible();
    await expect(page.locator('.mycm-wheel')).toContainText('32,650');
    const cards=page.locator('#mycmVisualGrid .mycm-visual-card');await expect(cards).toHaveCount(3);
    await expect(cards.nth(1)).toContainText('79%');await expect(cards.nth(1)).toContainText('of target');
    await expect(cards.nth(2)).toContainText('27.9%');await expect(cards.nth(2)).toContainText('not a good/bad score');
  });
  test('[AUTO] Add to My Carrowmont shows six compact areas first and filters journeys that are already saved',async({page})=>{
    const scenarios=[{id:'s-ret',journey:'retirement',label:'Retirement plan',created_at:'2026-11-15T00:00:00Z',updated_at:'2026-11-15T00:00:00Z',scenario:{journey:'retirement',toolPath:'/retirement-calculator/planner.html#planner'}}];
    await installMockSupabase(page,{profile:profile(),scenarios});await gotoClean(page,'/my-carrowmont.html?code=qa-auth-return');
    await expect(page.locator('#mycmAddPlanning')).toBeVisible();await expect(page.locator('.mycm-add-grid-primary .mycm-add-card')).toHaveCount(6);
    await expect(page.locator('#mycmAddPlanning .mycm-add-card[data-mycm-journey="retirement"]')).toHaveCount(0);await expect(page.locator('#mycmAddPlanning .mycm-add-card[data-mycm-journey="retirement-withdrawal"]')).toHaveCount(1);
    await expect(page.locator('#mycmSavedPlansSection')).toContainText('Retirement plan');await expect(page.locator('.mycm-add-more')).toBeVisible();
  });

  test('[AUTO] signed-in My Carrowmont keeps account help compact so the money dashboard appears early',async({page})=>{
    await installMockSupabase(page,{profile:profile()});await gotoClean(page,'/my-carrowmont.html?code=qa-auth-return');
    await expect(page.locator('body')).toHaveClass(/mycm-authenticated/);await expect(page.locator('#mycmAccountSignedIn')).not.toHaveAttribute('open','');await expect(page.locator('.mycm-plan-model')).not.toHaveAttribute('open','');
    await expect(page.locator('#mycmVisualOverview')).toBeVisible();const order=await page.evaluate(()=>{const overview=document.querySelector('#mycmVisualOverview'),help=document.querySelector('.mycm-plan-model');return Boolean(overview&&help&&(overview.compareDocumentPosition(help)&Node.DOCUMENT_POSITION_FOLLOWING));});expect(order).toBe(true);
  });
  test('[AUTO] install card stays quiet by default and appears only when this browser reports installability',async({page})=>{
    await page.setViewportSize({width:390,height:844});await gotoClean(page,'/my-carrowmont.html');const card=page.locator('[data-cm-pwa-card]');await expect(card).toBeHidden();
    await page.evaluate(()=>window.dispatchEvent(new Event('beforeinstallprompt',{cancelable:true})));await expect(card).toBeVisible();await expect(page.locator('#cmPwaInstallButton')).toBeVisible();await assertNoHorizontalOverflow(page);
  });
});
