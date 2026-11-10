import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors } from '../helpers/common.js';

const PATH='/my-carrowmont.html';

async function installMockSupabase(page,{signedIn=true}={}){
  await page.addInitScript(({signedIn})=>{
    Object.defineProperty(window,'CarrowmontSupabaseConfig',{
      configurable:true,
      get(){return window.__cmSupabaseConfig;},
      set(value){window.__cmSupabaseConfig={...value,enabled:true,url:'https://example.supabase.co',publishableKey:'pk_test_public'};}
    });
    window.__cmCloud={profile:null,scenarios:[],magic:null};
    const user=signedIn?{id:'00000000-0000-4000-8000-000000000007',email:'tester@example.com'}:null;
    function builder(table){
      const state={table,mode:'select',payload:null};
      const api={
        select(){return api;},
        eq(){return api;},
        order(){return Promise.resolve({data:window.__cmCloud.scenarios,error:null});},
        maybeSingle(){return Promise.resolve({data:window.__cmCloud.profile,error:null});},
        single(){
          if(state.table==='carrowmont_profiles'){window.__cmCloud.profile=state.payload;return Promise.resolve({data:state.payload,error:null});}
          const row={id:state.payload?.id||'11111111-1111-4111-8111-111111111111',...state.payload,created_at:'2026-11-11T00:00:00Z'};window.__cmCloud.scenarios=[row];return Promise.resolve({data:row,error:null});
        },
        upsert(payload){state.mode='upsert';state.payload=payload;return api;},
        delete(){state.mode='delete';return api;}
      };
      api.then=(resolve)=>{if(state.mode==='delete'){if(table==='carrowmont_profiles')window.__cmCloud.profile=null;if(table==='carrowmont_saved_scenarios')window.__cmCloud.scenarios=[];resolve({data:null,error:null});}else resolve({data:table==='carrowmont_saved_scenarios'?window.__cmCloud.scenarios:null,error:null});};
      return api;
    }
    window.supabase={createClient:()=>({
      auth:{
        getUser:async()=>({data:{user},error:null}),
        signInWithOtp:async args=>{window.__cmCloud.magic=args;return {data:{},error:null};},
        signOut:async()=>({error:null}),
        onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})
      },
      from:builder
    })};
  },{signedIn});
}

test.describe('FRE7 optional login and saved profile foundation',()=>{
  test('[AUTO] account saving stays invisible and network-free while backend configuration is disabled',async({page})=>{
    const errors=monitorPageErrors(page);
    const sdkRequests=[];
    page.on('request',req=>{if(req.url().includes('@supabase/supabase-js'))sdkRequests.push(req.url());});
    await gotoClean(page,PATH);
    await expect(page.locator('#mycmAccount')).toBeHidden();
    expect(sdkRequests).toEqual([]);
    await expect(page.getByText('No account required')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('[AUTO] configured account never uploads the guest dashboard until the user explicitly saves it',async({page})=>{
    await installMockSupabase(page,{signedIn:true});
    await page.addInitScript(()=>{
      sessionStorage.setItem('carrowmont_guest_dashboard_session_v1',JSON.stringify({schemaVersion:1,version:'dashboard-store-v1.0',mode:'session',createdAt:'2026-11-11T00:00:00Z',updatedAt:'2026-11-11T00:00:00Z',locale:{region:'US',currency:'USD'},facts:{'cashFlow.takeHomeIncome':{value:6000,origin:'user',source:'QA',lastUpdated:'2026-11-11T00:00:00Z',excluded:false,unit:'USD',note:null}},lastImport:null}));
    });
    await gotoClean(page,PATH);
    await expect(page.locator('#mycmAccount')).toBeVisible();
    await expect(page.locator('#mycmAccountCurrentEmail')).toHaveText('tester@example.com');
    expect(await page.evaluate(()=>window.__cmCloud.profile)).toBeNull();
    await page.locator('#mycmSaveCloud').click();
    await expect(page.locator('#mycmAccountStatus')).toContainText('saved to your account');
    const cloud=await page.evaluate(()=>window.__cmCloud.profile);
    expect(cloud.profile.facts['cashFlow.takeHomeIncome'].value).toBe(6000);
  });

  test('[AUTO] passwordless sign-in stages guest data only in the browser and sends no financial payload to auth',async({page})=>{
    await installMockSupabase(page,{signedIn:false});
    await page.addInitScript(()=>{
      sessionStorage.setItem('carrowmont_guest_dashboard_session_v1',JSON.stringify({schemaVersion:1,version:'dashboard-store-v1.0',mode:'session',createdAt:'2026-11-11T00:00:00Z',updatedAt:'2026-11-11T00:00:00Z',locale:{region:'NZ',currency:'NZD'},facts:{'resilience.emergencySavings':{value:15000,origin:'user',source:'QA',lastUpdated:'2026-11-11T00:00:00Z',excluded:false,unit:'NZD',note:null}},lastImport:null}));
    });
    await gotoClean(page,PATH);
    await page.locator('#mycmAccountEmail').fill('person@example.com');
    await page.locator('#mycmAccountForm button[type="submit"]').click();
    await expect(page.locator('#mycmAccountStatus')).toContainText('Check your email');
    const result=await page.evaluate(()=>({magic:window.__cmCloud.magic,pending:JSON.parse(localStorage.getItem('carrowmont_pending_cloud_profile_v1'))}));
    expect(result.magic.email).toBe('person@example.com');
    expect(JSON.stringify(result.magic)).not.toContain('15000');
    expect(result.pending.profile.facts['resilience.emergencySavings'].value).toBe(15000);
  });
});
