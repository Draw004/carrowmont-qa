import { test, expect } from '@playwright/test';
import { gotoClean, monitorPageErrors } from '../helpers/common.js';

async function installMockSupabase(page,{profile=null,scenarios=[]}={}){
  await page.addInitScript(({profile,scenarios})=>{
    Object.defineProperty(window,'CarrowmontSupabaseConfig',{configurable:true,get(){return window.__cmSupabaseConfig;},set(value){window.__cmSupabaseConfig={...value,enabled:true,url:'https://example.supabase.co',publishableKey:'pk_test_public'};}});
    window.__cmCloud={profile:profile?{user_id:'u1',profile,schema_version:1,region:'US',currency:'USD',updated_at:'2026-11-12T00:00:00Z'}:null,scenarios:JSON.parse(JSON.stringify(scenarios||[]))};
    const user={id:'u1',email:'tester@example.com'};
    function builder(table){
      const state={table,mode:'select',payload:null,filters:[]};
      const api={
        select(){return api;},
        eq(field,value){state.filters.push([field,value]);return api;},
        order(){return Promise.resolve({data:window.__cmCloud.scenarios||[],error:null});},
        maybeSingle(){return Promise.resolve({data:window.__cmCloud.profile,error:null});},
        single(){
          if(table==='carrowmont_profiles'){window.__cmCloud.profile=state.payload;return Promise.resolve({data:state.payload,error:null});}
          const id=state.payload?.id||'s'+String((window.__cmCloud.scenarios||[]).length+1);
          const row={id,created_at:state.payload?.created_at||new Date().toISOString(),...state.payload};
          const rows=(window.__cmCloud.scenarios||[]).filter(x=>x.id!==id);rows.push(row);window.__cmCloud.scenarios=rows;
          return Promise.resolve({data:row,error:null});
        },
        upsert(payload){state.mode='upsert';state.payload=payload;return api;},
        delete(){state.mode='delete';return api;}
      };
      api.then=resolve=>{if(state.mode==='delete'){if(table==='carrowmont_profiles')window.__cmCloud.profile=null;if(table==='carrowmont_saved_scenarios')window.__cmCloud.scenarios=[];}resolve({data:null,error:null});};
      return api;
    }
    window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user},error:null}),signInWithOtp:async()=>({data:{},error:null}),signOut:async()=>({error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:builder})};
  },{profile,scenarios});
}

function retirementRow({fundedPct=60,gap=400000,updated='2026-01-01T00:00:00Z'}={}){
  return {id:'s-ret',journey:'retirement',label:'Retirement plan',updated_at:updated,created_at:updated,scenario:{journey:'retirement',label:'Retirement plan',toolPath:'/retirement-calculator/',input:{mode:'quick',currentSavings:'100000'},summary:{fundedPct,gap,retirementAge:60}}};
}

test.describe('FRE8C saved-plan progress tracking',()=>{
  test('[AUTO] first saved plan is a starting point, not a manufactured trend',async({page})=>{
    const errors=monitorPageErrors(page);await installMockSupabase(page,{scenarios:[retirementRow()]});
    await gotoClean(page,'/my-carrowmont.html?code=qa-auth-return');
    const progress=page.locator('#mycmProgressSection');await expect(progress).toBeVisible();
    await expect(progress.getByText('Ready to track', { exact: true })).toBeVisible();
    await expect(progress.getByText('This saved plan is your starting point.')).toBeVisible();
    await expect(progress).toContainText('Update it later and My Carrowmont will show what changed.');
    expect(errors).toEqual([]);
  });

  test('[AUTO] explicit saved retirement update records prior version and shows plain-language progress',async({page})=>{
    await installMockSupabase(page,{scenarios:[retirementRow()]});
    await page.addInitScript(()=>{
      localStorage.setItem('carrowmont_pending_saved_plan_v1',JSON.stringify({explicit:true,stagedAt:new Date().toISOString(),plan:{journey:'retirement',label:'Retirement plan',toolPath:'/retirement-calculator/',scenario:{input:{mode:'quick',currentSavings:'150000'},summary:{fundedPct:70,gap:300000,retirementAge:60}},profileFacts:{'retirement.currentSavings':{value:150000,unit:'USD',source:'Retirement Planner'}}}}));
    });
    await gotoClean(page,'/my-carrowmont.html?code=qa-auth-return&savePlan=retirement');
    await expect(page.locator('#mycmAccountStatus')).toContainText('updated in My Carrowmont');
    const progress=page.locator('#mycmProgressSection');await expect(progress).toBeVisible();
    await expect(progress.getByText('Improving', { exact: true })).toBeVisible();
    await expect(progress).toContainText('Funding improved by 10 percentage points.');
    const scenario=await page.evaluate(()=>window.__cmCloud.scenarios.find(x=>x.journey==='retirement')?.scenario);
    expect(scenario?.progressHistory).toHaveLength(1);expect(scenario?.progressHistory?.[0]?.snapshot?.fundedPct).toBe(60);
  });

  test('[AUTO] worsening saved emergency runway is explicit and points back to the planner',async({page})=>{
    const scenario={journey:'emergency-runway',label:'Emergency fund & runway plan',toolPath:'/emergency-fund-runway-calculator.html',summary:{runwayMonths:2.5,targetMonths:6,reserve:7500},progressHistory:[{savedAt:'2026-01-01T00:00:00Z',snapshot:{journey:'emergency-runway',runwayMonths:4,targetMonths:6,reserve:12000}}]};
    await installMockSupabase(page,{scenarios:[{id:'s-em',journey:'emergency-runway',label:'Emergency fund & runway plan',scenario,updated_at:'2026-11-12T00:00:00Z'}]});
    await gotoClean(page,'/my-carrowmont.html?code=qa-auth-return');
    const progress=page.locator('#mycmProgressSection');await expect(progress.getByText('Needs attention', { exact: true })).toBeVisible();
    await expect(progress).toContainText('Emergency runway fell by 1.5 months.');
    await expect(progress).toContainText('Open Emergency Fund & Runway and calculate the amount needed for the saved target.');
  });

  test('[AUTO] Car Affordability remains a saved decision scenario outside ongoing progress',async({page})=>{
    await installMockSupabase(page,{scenarios:[{id:'s-car',journey:'car-affordability',label:'Car affordability plan',scenario:{journey:'car-affordability',toolPath:'/car-affordability-auto-decision-calculator.html',summary:{vehiclePrice:30000}},updated_at:'2026-11-12T00:00:00Z'}]});
    await gotoClean(page,'/my-carrowmont.html?code=qa-auth-return');
    await expect(page.locator('#mycmSavedPlansSection')).toBeVisible();
    await expect(page.locator('#mycmSavedPlansSection')).toContainText('Car affordability plan');
    await expect(page.locator('#mycmProgressSection')).toBeHidden();
  });

  test('[AUTO] progress cards remain usable at mobile width without horizontal overflow',async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await installMockSupabase(page,{scenarios:[retirementRow()]});
    await gotoClean(page,'/my-carrowmont.html?code=qa-auth-return');
    await expect(page.locator('#mycmProgressSection')).toBeVisible();
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(2);
  });
});
