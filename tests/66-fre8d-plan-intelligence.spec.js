import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors } from '../helpers/common.js';

async function installMockSupabase(page,{profile=null,scenarios=[]}={}){
  await page.addInitScript(({profile,scenarios})=>{
    Object.defineProperty(window,'CarrowmontSupabaseConfig',{configurable:true,get(){return window.__cmSupabaseConfig;},set(value){window.__cmSupabaseConfig={...value,enabled:true,url:'https://example.supabase.co',publishableKey:'pk_test_public'};}});
    window.__cmCloud={profile:profile?{user_id:'u1',profile,schema_version:1,region:'US',currency:'USD',updated_at:'2026-11-13T00:00:00Z'}:null,scenarios:JSON.parse(JSON.stringify(scenarios||[]))};
    const user={id:'u1',email:'tester@example.com'};
    function builder(table){const state={table,mode:'select',payload:null};const api={select(){return api;},eq(){return api;},order(){return Promise.resolve({data:window.__cmCloud.scenarios||[],error:null});},maybeSingle(){return Promise.resolve({data:window.__cmCloud.profile,error:null});},single(){if(table==='carrowmont_profiles'){window.__cmCloud.profile=state.payload;return Promise.resolve({data:state.payload,error:null});}const id=state.payload?.id||'s'+String((window.__cmCloud.scenarios||[]).length+1);const row={id,created_at:state.payload?.created_at||new Date().toISOString(),...state.payload};const rows=(window.__cmCloud.scenarios||[]).filter(x=>x.id!==id);rows.push(row);window.__cmCloud.scenarios=rows;return Promise.resolve({data:row,error:null});},upsert(payload){state.mode='upsert';state.payload=payload;return api;},delete(){state.mode='delete';return api;}};api.then=resolve=>{if(state.mode==='delete'){if(table==='carrowmont_profiles')window.__cmCloud.profile=null;if(table==='carrowmont_saved_scenarios')window.__cmCloud.scenarios=[];}resolve({data:null,error:null});};return api;}
    window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user},error:null}),signInWithOtp:async()=>({data:{},error:null}),signOut:async()=>({error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:builder})};
  },{profile,scenarios});
}
function retirementRow(){return {id:'r1',journey:'retirement',label:'Retirement plan',created_at:'2026-01-01T00:00:00Z',updated_at:'2026-11-01T00:00:00Z',scenario:{journey:'retirement',toolPath:'/retirement-calculator/',input:{currentAge:40},summary:{retirementAge:60,fundedPct:70,gap:300000,additionalContribution:250,contributionFrequency:'monthly'},progressHistory:[{savedAt:'2026-01-01T00:00:00Z',snapshot:{journey:'retirement',fundedPct:60,gap:400000}}],planMeta:{startedAt:'2026-01-01T00:00:00Z',lastReviewedAt:'2026-11-01T00:00:00Z',reviewEveryMonths:6,target:{kind:'funding-pct',value:100,age:60}}}};}

test.describe('FRE8D plan baseline and on-track intelligence',()=>{
  test('[AUTO] My Carrowmont explicitly separates saved planning concepts',async({page})=>{
    const errors=monitorPageErrors(page);await installMockSupabase(page,{scenarios:[retirementRow()]});await gotoClean(page,'/my-carrowmont.html?code=qa-auth-return');
    await expect(page.getByText('Current details',{exact:true})).toBeVisible();await expect(page.getByText('Saved plan',{exact:true})).toBeVisible();await expect(page.getByText('What-if calculation',{exact:true})).toBeVisible();await expect(page.getByText('Progress history',{exact:true})).toBeVisible();expect(errors).toEqual([]);
  });
  test('[AUTO] improving retirement plan can still need attention against its saved target',async({page})=>{
    await installMockSupabase(page,{scenarios:[retirementRow()]});await gotoClean(page,'/my-carrowmont.html?code=qa-auth-return');const progress=page.locator('#mycmProgressSection');
    await expect(progress.getByText('Needs attention',{exact:true})).toBeVisible();await expect(progress.getByText('Improving',{exact:true})).toBeVisible();await expect(progress).toContainText('70% funded');await expect(progress).toContainText('fully fund the plan by age 60');await expect(progress).toContainText('$250');await expect(progress).toContainText('Last reviewed');
  });
  test('[AUTO] old saved information is marked Needs review instead of presented as current',async({page})=>{
    const fi={id:'fi1',journey:'financial-independence',label:'FI plan',created_at:'2025-01-01T00:00:00Z',updated_at:'2025-01-01T00:00:00Z',scenario:{journey:'financial-independence',toolPath:'/financial-independence/',input:{currentAge:35,targetAge:50},summary:{targetAge:50,modelledFIAge:49,currentAssets:100000},planMeta:{startedAt:'2025-01-01T00:00:00Z',lastReviewedAt:'2025-01-01T00:00:00Z',reviewEveryMonths:6,target:{kind:'fi-age',value:50}}}};
    await installMockSupabase(page,{scenarios:[fi]});await gotoClean(page,'/my-carrowmont.html?code=qa-auth-return');const progress=page.locator('#mycmProgressSection');await expect(progress.getByText('Needs review',{exact:true})).toBeVisible();await expect(progress).toContainText('may no longer reflect your current situation');
  });
  test('[AUTO] payoff intelligence quantifies how far the current estimate is from the saved target',async({page})=>{
    const debt={id:'d1',journey:'debt-payoff',label:'Debt payoff plan',created_at:'2026-01-01T00:00:00Z',updated_at:'2026-07-01T00:00:00Z',scenario:{journey:'debt-payoff',toolPath:'/budget-cash-flow-planner/debt-payoff-calculator.html',summary:{startingDebt:10000,avalancheMonths:20,monthlyBudget:500},progressHistory:[{savedAt:'2026-01-01T00:00:00Z',snapshot:{journey:'debt-payoff',balance:12000,payoffMonths:12,monthlyPayment:500}}],planMeta:{startedAt:'2026-01-01T00:00:00Z',lastReviewedAt:'2026-07-01T00:00:00Z',reviewEveryMonths:3,target:{kind:'payoff-date',at:'2027-01-01T00:00:00Z'}}}};
    await installMockSupabase(page,{scenarios:[debt]});await gotoClean(page,'/my-carrowmont.html?code=qa-auth-return');const progress=page.locator('#mycmProgressSection');await expect(progress.getByText('Needs attention',{exact:true})).toBeVisible();await expect(progress).toContainText('later than the saved target');await expect(progress).toContainText('move the target by about');
  });
  test('[AUTO] 8D planning model and progress cards remain mobile-safe',async({page})=>{
    await page.setViewportSize({width:390,height:844});await installMockSupabase(page,{scenarios:[retirementRow()]});await gotoClean(page,'/my-carrowmont.html?code=qa-auth-return');await expect(page.locator('.mycm-plan-model')).toBeVisible();const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);expect(overflow).toBeLessThanOrEqual(2);
  });
});
