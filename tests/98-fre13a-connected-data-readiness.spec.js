import { test, expect } from '@playwright/test';
import { gotoClean, assertNoHorizontalOverflow, monitorPageErrors } from '../helpers/common.js';

function fact(value,unit){return {value,origin:'user',source:'QA saved detail',lastUpdated:'2026-11-23T00:00:00Z',excluded:false,unit,note:null};}
function profile(){return {schemaVersion:1,version:'dashboard-store-v1.0',mode:'session',createdAt:'2026-11-23T00:00:00Z',updatedAt:'2026-11-23T00:00:00Z',locale:{region:'IN',currency:'INR'},facts:{'cashFlow.takeHomeIncome':fact(80000,'INR'),'cashFlow.essentialExpenses':fact(30000,'INR'),'cashFlow.flexibleExpenses':fact(12000,'INR'),'resilience.emergencySavings':fact(20000,'INR'),'debt.mortgageBalance':fact(3000000,'INR')},lastImport:null};}

async function mockAccount(page,{profile:initialProfile}={}){
  await page.addInitScript(({initialProfile})=>{
    Object.defineProperty(window,'CarrowmontSupabaseConfig',{configurable:true,get(){return window.__cmSupabaseConfig;},set(value){window.__cmSupabaseConfig={...value,enabled:true,url:'https://example.supabase.co',publishableKey:'pk_test_public'};}});
    const user={id:'u13a',email:'connected-qa@example.com'};
    window.__cmCloud={profile:{user_id:user.id,profile:initialProfile,schema_version:1,region:'IN',currency:'INR',updated_at:'2026-11-23T00:00:00Z'},scenarios:[]};
    function builder(table){
      const state={payload:null,table};
      const api={
        select(){return api;},eq(){return api;},order(){return Promise.resolve({data:window.__cmCloud.scenarios,error:null});},
        maybeSingle(){try{const cached=JSON.parse(sessionStorage.getItem('carrowmont_guest_dashboard_session_v1')||'null');if(cached&&cached.facts)window.__cmCloud.profile={...window.__cmCloud.profile,profile:cached};}catch(_){}return Promise.resolve({data:window.__cmCloud.profile,error:null});},
        single(){
          if(state.table==='carrowmont_profiles'&&state.payload){window.__cmCloud.profile={...window.__cmCloud.profile,...state.payload,profile:state.payload.profile||window.__cmCloud.profile.profile};return Promise.resolve({data:window.__cmCloud.profile,error:null});}
          return Promise.resolve({data:state.payload,error:null});
        },
        upsert(payload){state.payload=payload;return api;},delete(){return api;}
      };
      api.then=resolve=>resolve({data:null,error:null});return api;
    }
    window.supabase={createClient:()=>({auth:{getUser:()=>Promise.resolve({data:{user},error:null}),signInWithOtp:async()=>({data:{},error:null}),signOut:async()=>({error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:builder})};
  },{initialProfile});
}

test.describe('FRE13A connected financial data readiness',()=>{
  test('[AUTO] production My Carrowmont keeps connected-data preview hidden by default',async({page})=>{
    await mockAccount(page,{profile:profile()});await gotoClean(page,'/my-carrowmont.html?code=qa-auth-return');
    await expect(page.locator('#mycmConnectedData')).toBeHidden();
    await expect(page.locator('body')).toContainText('does not connect to banks or monitor spending');
  });

  test('[AUTO] sandbox consent, explicit review/apply and disconnect are privacy-first on mobile',async({page})=>{
    const errors=monitorPageErrors(page);await mockAccount(page,{profile:profile()});await page.setViewportSize({width:390,height:844});
    await gotoClean(page,'/my-carrowmont.html?code=qa-auth-return&connected-data-preview=sandbox');
    const panel=page.locator('#mycmConnectedData');await expect(panel).toBeVisible();await expect(panel).toContainText('sandbox preview only');await expect(panel).toContainText('never contacts a bank');
    await expect(panel.locator('input[type="password"]')).toHaveCount(0);await expect(panel.getByText('Balance summary',{exact:true})).toBeVisible();await expect(panel.getByText('Monthly cash-flow summary',{exact:true})).toBeVisible();
    await panel.locator('input[value="cashFlowSummary"]').check();await panel.getByRole('button',{name:'Review sandbox consent'}).click();
    await expect(panel).toContainText('Requested scopes');await expect(panel).toContainText(/summary totals only/i);await expect(panel).toContainText(/no raw transactions are retained/i);
    await expect(panel.getByRole('button',{name:'Connect sandbox'})).toBeDisabled();await panel.locator('#cmConnectedConsentConfirm').check();await expect(panel.getByRole('button',{name:'Connect sandbox'})).toBeEnabled();await panel.getByRole('button',{name:'Connect sandbox'}).click();
    await expect(panel).toContainText('Carrowmont Sandbox Bank');await expect(panel).toContainText('Current My Carrowmont');await expect(panel).toContainText('Sandbox value');
    const emergency=panel.locator('[data-review-id="balance:sandbox-emergency"]');await expect(emergency).toContainText('₹20,000');await expect(emergency).toContainText('₹3,42,000');await expect(emergency).not.toContainText('Currency mismatch');
    await emergency.getByRole('button',{name:'Use this value'}).click();
    const saved=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('carrowmont_guest_dashboard_session_v1')||'null'));
    expect(saved?.facts?.['resilience.emergencySavings']?.value).toBe(342000);expect(saved?.facts?.['resilience.emergencySavings']?.origin).toBe('connected-reviewed');expect(saved?.facts?.['resilience.emergencySavings']?.source).toContain('Sandbox Bank (reviewed)');
    expect(await page.evaluate(()=>Boolean(sessionStorage.getItem('carrowmont_connected_data_sandbox_session_v1')))).toBe(true);
    await page.reload();await expect(panel).toContainText('Sandbox connected');await expect(panel.locator('[data-review-id="balance:sandbox-emergency"]')).toContainText('Matches saved value');
    await panel.getByRole('button',{name:'Disconnect & delete sandbox copy'}).click();expect(await page.evaluate(()=>sessionStorage.getItem('carrowmont_connected_data_sandbox_session_v1'))).toBeNull();
    const retained=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('carrowmont_guest_dashboard_session_v1')||'null'));
    expect(retained?.facts?.['resilience.emergencySavings']?.value).toBe(342000);await expect(panel).toContainText('Nothing below is connected yet');
    await assertNoHorizontalOverflow(page,'Batch 13A connected-data sandbox 390px');expect(errors).toEqual([]);
  });
});
