import { test, expect } from '@playwright/test';
import { gotoClean, setInput, monitorPageErrors, assertNoHorizontalOverflow } from '../helpers/common.js';

const PATH='/ask-carrowmont.html';

async function installMockSupabase(page,{profile=null,scenarios=[]}={}){
  await page.addInitScript(({profile,scenarios})=>{
    localStorage.setItem('sb-qa-auth-token',JSON.stringify({access_token:'qa',refresh_token:'qa'}));
    Object.defineProperty(window,'CarrowmontSupabaseConfig',{configurable:true,get(){return window.__cmSupabaseConfig;},set(value){window.__cmSupabaseConfig={...value,enabled:true,url:'https://example.supabase.co',publishableKey:'pk_test_public'};}});
    window.__cmCloud={profile:profile?{user_id:'u1',profile,schema_version:1,region:profile?.locale?.region||'US',currency:profile?.locale?.currency||'USD',updated_at:'2026-11-16T00:00:00Z'}:null,scenarios:JSON.parse(JSON.stringify(scenarios||[])),writes:0};
    const user={id:'u1',email:'tester@example.com'};
    function builder(table){
      const state={table,mode:'select',payload:null};
      const api={
        select(){return api;},eq(){return api;},
        order(){return Promise.resolve({data:window.__cmCloud.scenarios,error:null});},
        maybeSingle(){return Promise.resolve({data:window.__cmCloud.profile,error:null});},
        single(){window.__cmCloud.writes+=1;return Promise.resolve({data:state.payload,error:null});},
        upsert(payload){state.mode='upsert';state.payload=payload;window.__cmCloud.writes+=1;return api;},
        delete(){state.mode='delete';window.__cmCloud.writes+=1;return api;}
      };
      api.then=resolve=>resolve({data:null,error:null});
      return api;
    }
    window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:builder})};
  },{profile,scenarios});
}

function fact(value,{source='My Carrowmont',lastUpdated='2026-11-16T00:00:00Z',unit='USD'}={}){
  return {value,origin:'user',source,lastUpdated,excluded:false,unit,note:null};
}

function profile(facts,currency='USD',region='US'){
  return {schemaVersion:1,version:'dashboard-store-v1.0',mode:'session',createdAt:'2026-11-01T00:00:00Z',updatedAt:'2026-11-16T00:00:00Z',locale:{region,currency},facts,lastImport:null};
}

async function setUsLocale(page){
  await expect.poll(()=>page.evaluate(()=>Boolean(window.CarrowmontLocale?.setLocale))).toBe(true);
  await page.evaluate(()=>window.CarrowmontLocale.setLocale('US','USD'));
}

async function clickIntent(page,intent){
  await page.locator(`[data-ask-intent="${intent}"]`).click();
}

test.describe('FRE10B Account-Aware Ask Carrowmont',()=>{
  test('[AUTO] signed-out Ask remains guest-first and does not load the Supabase SDK',async({page})=>{
    const errors=monitorPageErrors(page);const sdk=[];page.on('request',r=>{if(r.url().includes('@supabase/supabase-js'))sdk.push(r.url());});
    await gotoClean(page,PATH);
    await clickIntent(page,'emergency-runway');
    await expect(page.locator('#askQuestionFields input')).toHaveCount(2);
    await expect(page.locator('#askAccountContext')).toBeHidden();
    expect(sdk).toEqual([]);expect(errors).toEqual([]);
  });

  test('[AUTO] fresh signed-in My Carrowmont facts can resolve a journey without repeated questions',async({page})=>{
    await installMockSupabase(page,{profile:profile({
      'cashFlow.essentialExpenses':fact(3000,{source:'Budget & Cash Flow'}),
      'resilience.emergencySavings':fact(18000,{source:'Emergency fund & runway plan'})
    })});
    await gotoClean(page,PATH);await setUsLocale(page);await clickIntent(page,'emergency-runway');
    await expect(page.locator('#askResultStage')).toBeVisible();
    await expect(page.locator('#askQuestionsStage')).toBeHidden();
    await expect(page.locator('#askAccountContext')).toBeVisible();
    await expect(page.locator('#askAccountContextSummary')).toContainText('2 current saved details');
    await expect(page.locator('#askTrustValues')).toContainText('My Carrowmont saved value');
    expect(await page.evaluate(()=>window.__cmCloud.writes)).toBe(0);
  });

  test('[AUTO] Ask only requests the missing field when current saved context already covers the others',async({page})=>{
    await installMockSupabase(page,{profile:profile({
      'cashFlow.takeHomeIncome':fact(6500,{source:'Budget & Cash Flow'}),
      'cashFlow.essentialExpenses':fact(2800,{source:'Budget & Cash Flow'})
    })});
    await gotoClean(page,PATH);await setUsLocale(page);await clickIntent(page,'cash-flow-shortfall');
    await expect(page.locator('#askQuestionFields input')).toHaveCount(1);
    await expect(page.locator('input[name="flexibleExpenses"]')).toBeVisible();
    await expect(page.locator('#askQuestionsIntro')).toContainText('2 current My Carrowmont details');
  });

  test('[AUTO] older saved facts are prefilled but require explicit confirmation before use',async({page})=>{
    await installMockSupabase(page,{profile:profile({
      'cashFlow.essentialExpenses':fact(3000,{source:'Budget & Cash Flow'}),
      'resilience.emergencySavings':fact(12000,{source:'Emergency fund & runway plan',lastUpdated:'2026-01-01T00:00:00Z'})
    })});
    await gotoClean(page,PATH);await setUsLocale(page);await clickIntent(page,'emergency-runway');
    await expect(page.locator('#askQuestionFields input')).toHaveCount(1);
    await expect(page.locator('input[name="emergencySavings"]')).toHaveValue('12000');
    await expect(page.locator('.ask-saved-note.is-stale')).toContainText('Please confirm or replace it');
    await page.locator('#askQuestionsForm button[type="submit"]').click();
    await expect(page.locator('#askResultStage')).toBeVisible();
    await expect(page.locator('#askTrustFreshness')).toContainText('older saved detail');
    expect(await page.evaluate(()=>window.__cmCloud.writes)).toBe(0);
  });

  test('[AUTO] a saved value can be temporarily overridden for one Ask scenario without changing My Carrowmont',async({page})=>{
    await installMockSupabase(page,{profile:profile({
      'cashFlow.essentialExpenses':fact(3000,{source:'Budget & Cash Flow'}),
      'resilience.emergencySavings':fact(18000,{source:'Emergency fund & runway plan'})
    })});
    await gotoClean(page,PATH);await setUsLocale(page);await clickIntent(page,'emergency-runway');
    const savedDetails=page.locator('#askAccountContextDetails');await expect(savedDetails).toBeVisible();await savedDetails.locator('summary').click();await expect(savedDetails).toHaveJSProperty('open',true);
    const edit=page.locator('[data-ask-context-edit="essentialExpenses"]');await expect(edit).toBeVisible();await edit.click();
    await expect(page.locator('input[name="essentialExpenses"]')).toHaveValue('3000');
    await setInput(page,'input[name="essentialExpenses"]',3500);
    await expect(page.locator('.ask-saved-note.is-override')).toContainText('Temporary what-if override');
    await page.locator('#askQuestionsForm button[type="submit"]').click();
    await expect(page.locator('#askResultStage')).toBeVisible();
    await expect(page.locator('#askTrustValues')).toContainText('temporary what-if override for this Ask only');
    const cloud=await page.evaluate(()=>({writes:window.__cmCloud.writes,value:window.__cmCloud.profile.profile.facts['cashFlow.essentialExpenses'].value}));
    expect(cloud).toEqual({writes:0,value:3000});
  });

  test('[AUTO] user can ignore all saved context for a single question without deleting account data',async({page})=>{
    await installMockSupabase(page,{profile:profile({
      'cashFlow.essentialExpenses':fact(3000),
      'resilience.emergencySavings':fact(18000)
    })});
    await gotoClean(page,PATH);await setUsLocale(page);await clickIntent(page,'emergency-runway');
    await expect(page.locator('#askResultStage')).toBeVisible();
    await page.locator('#askContextIgnoreBtn').click();
    await expect(page.locator('#askQuestionsStage')).toBeVisible();
    await expect(page.locator('#askQuestionFields input')).toHaveCount(2);
    await expect(page.locator('input[name="essentialExpenses"]')).toHaveValue('');
    await expect(page.locator('#askAccountContextTitle')).toHaveText('Saved details ignored for this question');
    expect(await page.evaluate(()=>window.__cmCloud.writes)).toBe(0);
  });

  test('[AUTO] currency mismatch blocks saved monetary context instead of silently converting it',async({page})=>{
    await installMockSupabase(page,{profile:profile({
      'cashFlow.essentialExpenses':fact(3000),
      'resilience.emergencySavings':fact(18000)
    },'USD','US')});
    await gotoClean(page,PATH);
    await expect.poll(()=>page.evaluate(()=>Boolean(window.CarrowmontLocale?.setLocale))).toBe(true);
    await page.evaluate(()=>window.CarrowmontLocale.setLocale('NZ','NZD'));
    await clickIntent(page,'emergency-runway');
    await expect(page.locator('#askQuestionFields input')).toHaveCount(2);
    await expect(page.locator('#askAccountContextTitle')).toHaveText('Saved amounts were not reused');
    await expect(page.locator('#askAccountContextSummary')).toContainText('does not automatically convert');
    await expect(page.locator('input[name="essentialExpenses"]')).toHaveValue('');
  });

  test('[AUTO] saved mortgage plan can supply remaining term while Ask requests only the new extra amount',async({page})=>{
    const p=profile({
      'debt.mortgageBalance':fact(250000,{source:'Mortgage Payoff'}),
      'debt.mortgageRatePct':fact(5.5,{source:'Mortgage Payoff',unit:'pct'}),
      'assumptions.longTermReturnPct':fact(6,{source:'Goal Planner',unit:'pct'})
    });
    const scenarios=[{id:'m1',journey:'mortgage-payoff',label:'Mortgage Payoff plan',updated_at:'2026-11-16T00:00:00Z',scenario:{input:{currency:'USD',remainingYears:18,remainingMonths:0}}}];
    await installMockSupabase(page,{profile:p,scenarios});
    await gotoClean(page,PATH);await setUsLocale(page);await clickIntent(page,'mortgage-prepay-vs-invest');
    await expect(page.locator('#askQuestionFields input')).toHaveCount(1);
    await expect(page.locator('input[name="extraAmount"]')).toBeVisible();
    await expect(page.locator('#askAccountContextDetailsSummary')).toContainText('(4)');
  });

  test('[AUTO] Account-Aware Ask context remains responsive on a narrow phone viewport',async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await installMockSupabase(page,{profile:profile({
      'cashFlow.takeHomeIncome':fact(6500),
      'cashFlow.essentialExpenses':fact(2800)
    })});
    await gotoClean(page,PATH);await setUsLocale(page);await clickIntent(page,'cash-flow-shortfall');
    await expect(page.locator('#askAccountContext')).toBeVisible();
    await assertNoHorizontalOverflow(page,'Batch 10B Ask context 390px');
  });
});
