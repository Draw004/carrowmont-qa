import { test, expect } from '@playwright/test';
import { gotoClean, assertNoHorizontalOverflow } from '../helpers/common.js';

const viewports=[
  {width:360,height:800},{width:390,height:844},{width:768,height:900},{width:1024,height:900},{width:1440,height:1000}
];

async function mockSignedIn(page,{profile,scenarios=[],deferUser=false,signedIn=true}={}){
  await page.addInitScript(({profile,scenarios,deferUser,signedIn})=>{
    Object.defineProperty(window,'CarrowmontSupabaseConfig',{configurable:true,get(){return window.__cmSupabaseConfig;},set(value){window.__cmSupabaseConfig={...value,enabled:true,url:'https://example.supabase.co',publishableKey:'pk_test_public'};}});
    const user=signedIn?{id:'u1',email:'tester@example.com'}:null;
    window.__cmCloud={profile:{user_id:'u1',profile,schema_version:1,region:'IN',currency:'INR',updated_at:'2026-11-15T00:00:00Z'},scenarios};
    let releaseUser;window.__cmUserGate=new Promise(resolve=>{releaseUser=resolve;});window.__resolveCmUser=()=>releaseUser({data:{user},error:null});
    function builder(table){const state={table,mode:'select',payload:null};const api={select(){return api;},eq(){return api;},order(){return Promise.resolve({data:window.__cmCloud.scenarios,error:null});},maybeSingle(){return Promise.resolve({data:window.__cmCloud.profile,error:null});},single(){if(table==='carrowmont_profiles'){window.__cmCloud.profile=state.payload;return Promise.resolve({data:state.payload,error:null});}const row={id:state.payload?.id||'s-new',...state.payload};return Promise.resolve({data:row,error:null});},upsert(payload){state.payload=payload;return api;},delete(){state.mode='delete';return api;}};api.then=resolve=>resolve({data:null,error:null});return api;}
    window.__oauthCalls=[];
    window.supabase={createClient:()=>({auth:{getUser:()=>deferUser?window.__cmUserGate:Promise.resolve({data:{user},error:null}),signInWithOtp:async()=>({data:{},error:null}),signInWithOAuth:async args=>{window.__oauthCalls.push(args);return {data:{provider:'google'},error:null};},signOut:async()=>({error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:builder})};
  },{profile,scenarios,deferUser,signedIn});
}
function profile(){
  const fact=(value,unit)=>({value,origin:'user',source:'QA',lastUpdated:'2026-11-15T00:00:00Z',excluded:false,unit,note:null});
  return {schemaVersion:1,version:'dashboard-store-v1.0',mode:'session',createdAt:'2026-11-15T00:00:00Z',updatedAt:'2026-11-15T00:00:00Z',locale:{region:'IN',currency:'INR'},facts:{
    'cashFlow.takeHomeIncome':fact(80000,'INR'),'cashFlow.essentialExpenses':fact(20000,'INR'),'cashFlow.flexibleExpenses':fact(5000,'INR'),'debt.monthlyPayments':fact(22350,'INR'),'debt.balance':fact(1200000,'INR'),'debt.highestAprPct':fact(10.8,'pct'),'resilience.emergencySavings':fact(100000,'INR'),'resilience.targetMonths':fact(3,'months')
  },lastImport:null};
}
async function equalHeight(page,plain,composite){
  const values=await page.evaluate(([a,b])=>{const x=document.querySelector(a),y=document.querySelector(b);if(!x||!y)return null;return [x.getBoundingClientRect().height,y.getBoundingClientRect().height];},[plain,composite]);
  expect(values,`${plain} / ${composite} should exist`).not.toBeNull();expect(Math.abs(values[0]-values[1])).toBeLessThanOrEqual(1);
}

test.describe('FRE8K sitewide polish, dashboard performance and account access',()=>{
  test('[AUTO] representative composite controls stay aligned from mobile through desktop and never add horizontal overflow',async({page})=>{
    const routes=[
      ['/mortgage-payoff-calculator/','.money-input',42,390],
      ['/loan-calculator/','.money-input',48,1024],
      ['/4-percent-rule-stress-test.html','.stress-input-suffix',46,360],
      ['/home-affordability-calculator.html','.home1-suffix',47,1440],
      ['/us-debt-interest-cost-calculator.html','.usdc-input-suffix',44,768],
      ['/mortgage-payoff-calculator/rent-vs-buy-calculator.html','.rent1-money',42,390],
      ['/financial-independence-number-by-spending.html','.fiq-input-suffix',46,1024]
    ];
    for(const [route,selector,height,width] of routes){
      await page.setViewportSize({width,height:900});await gotoClean(page,route);
      const actual=await page.locator(selector).first().evaluate(el=>parseFloat(getComputedStyle(el).height));expect(Math.abs(actual-height)).toBeLessThanOrEqual(1);await assertNoHorizontalOverflow(page);
    }
  });

  test('[AUTO] My Carrowmont warm dashboard renders cached values before delayed cloud auth then becomes interactive after sync',async({page})=>{
    await mockSignedIn(page,{profile:profile(),deferUser:true});
    await gotoClean(page,'/my-carrowmont.html');
    await page.evaluate(profile=>{localStorage.setItem('sb-example-auth-token',JSON.stringify({user:{id:'u1',email:'tester@example.com'}}));sessionStorage.setItem('carrowmont_guest_dashboard_session_v1',JSON.stringify(profile));},profile());
    await page.reload({waitUntil:'domcontentloaded'});
    await expect(page.locator('#mycmDashboardShell')).toBeVisible();await expect(page.locator('#mycmCashFlowCard')).toContainText('80,000');
    await expect(page.locator('#mycmDashboardShell')).toHaveAttribute('aria-busy','true');
    await page.evaluate(()=>window.__resolveCmUser());
    await expect(page.locator('#mycmDashboardShell')).not.toHaveAttribute('aria-busy','true');await expect(page.locator('#mycmDashboardShell')).not.toHaveAttribute('inert','');
  });

  test('[AUTO] Continue with Google uses Supabase OAuth only for authentication while email magic link remains available',async({page})=>{
    await mockSignedIn(page,{profile:profile(),signedIn:false});await gotoClean(page,'/my-carrowmont.html');
    await expect(page.locator('#mycmGoogleSignIn')).toBeVisible();await page.locator('#mycmGoogleSignIn').click();
    const calls=await page.evaluate(()=>window.__oauthCalls);expect(calls).toHaveLength(1);expect(calls[0].provider).toBe('google');expect(calls[0].options.redirectTo).toMatch(/\/my-carrowmont\.html$/);
    await expect(page.locator('#mycmAccountEmail')).toBeVisible();await expect(page.getByRole('button',{name:'Continue with email'})).toBeVisible();
  });

  test('[AUTO] planning discovery uses country-aware housing, investing and loan wording without changing journey identity',async({page})=>{
    await mockSignedIn(page,{profile:profile()});await gotoClean(page,'/my-carrowmont.html?code=qa-auth-return');
    await page.evaluate(()=>{window.CarrowmontLocale?.setRegion?.('IN');window.CarrowmontLocale?.setCurrency?.('INR');});
    await expect(page.locator('[data-mycm-journey="mortgage-payoff"]')).toContainText(/Home loan prepayment/i);await expect(page.locator('[data-mycm-journey="recurring-investment"]')).toContainText('SIP / investing');await expect(page.locator('[data-mycm-journey="loan-emi"]')).toContainText('Loan / EMI');
    await page.evaluate(()=>{window.CarrowmontLocale?.setRegion?.('US');window.CarrowmontLocale?.setCurrency?.('USD');});
    await expect(page.locator('[data-mycm-journey="mortgage-payoff"]')).toContainText(/Mortgage prepayment/i);await expect(page.locator('[data-mycm-journey="recurring-investment"]')).toContainText('Recurring investing');await expect(page.locator('[data-mycm-journey="loan-emi"]')).toContainText('Loan repayment');
  });

  test('[AUTO] My Carrowmont stays responsive at mobile tablet laptop and desktop widths',async({page})=>{
    await mockSignedIn(page,{profile:profile()});
    for(const vp of viewports){
      await page.setViewportSize(vp);await gotoClean(page,'/my-carrowmont.html?code=qa-auth-return');
      await expect(page.locator('body')).toHaveClass(/mycm-authenticated/);
      await expect(page.locator('#mycmDashboardShell')).not.toHaveAttribute('aria-busy','true');
      await expect(page.locator('#mycmVisualOverview')).toBeVisible();
      await expect(page.locator('#mycmAddPlanningGrid .mycm-add-card:visible')).toHaveCount(6);
      if(vp.width===1024){
        await expect(page.locator('.desktop-nav')).toBeHidden();
        await expect(page.locator('.mobile-nav')).toBeVisible();
      }
      await assertNoHorizontalOverflow(page,`My Carrowmont ${vp.width}px`);
    }
  });
});
