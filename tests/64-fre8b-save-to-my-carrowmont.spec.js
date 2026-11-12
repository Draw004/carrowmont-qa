import { test, expect } from '@playwright/test';
import { gotoClean, setInput, monitorPageErrors } from '../helpers/common.js';

async function installMockSupabase(page,{signedIn=true,profile=null,scenarios=[]}={}){
  await page.addInitScript(({signedIn,profile,scenarios})=>{
    Object.defineProperty(window,'CarrowmontSupabaseConfig',{configurable:true,get(){return window.__cmSupabaseConfig;},set(value){window.__cmSupabaseConfig={...value,enabled:true,url:'https://example.supabase.co',publishableKey:'pk_test_public'};}});
    window.__cmCloud={profile:profile?{user_id:'u1',profile,schema_version:1,region:'US',currency:'USD',updated_at:'2026-11-12T00:00:00Z'}:null,scenarios:JSON.parse(JSON.stringify(scenarios||[])),magic:null};
    const user=signedIn?{id:'u1',email:'tester@example.com'}:null;
    function builder(table){
      const state={table,mode:'select',payload:null,filters:[]};
      const api={
        select(){return api;},
        eq(field,value){state.filters.push([field,value]);return api;},
        order(){let rows=window.__cmCloud.scenarios||[];for(const [f,v] of state.filters)if(f==='user_id')rows=rows;return Promise.resolve({data:rows,error:null});},
        maybeSingle(){return Promise.resolve({data:window.__cmCloud.profile,error:null});},
        single(){
          if(table==='carrowmont_profiles'){window.__cmCloud.profile=state.payload;return Promise.resolve({data:state.payload,error:null});}
          const id=state.payload?.id||'s'+String((window.__cmCloud.scenarios||[]).length+1);
          const row={id,...state.payload};
          const rows=(window.__cmCloud.scenarios||[]).filter(x=>x.id!==id);
          rows.push(row);window.__cmCloud.scenarios=rows;
          return Promise.resolve({data:row,error:null});
        },
        upsert(payload){state.mode='upsert';state.payload=payload;return api;},
        delete(){state.mode='delete';return api;}
      };
      api.then=resolve=>{
        if(state.mode==='delete'){
          if(table==='carrowmont_profiles')window.__cmCloud.profile=null;
          if(table==='carrowmont_saved_scenarios')window.__cmCloud.scenarios=[];
          resolve({data:null,error:null});
        }else resolve({data:null,error:null});
      };
      return api;
    }
    window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user},error:null}),signInWithOtp:async args=>{window.__cmCloud.magic=args;return {data:{},error:null};},signOut:async()=>({error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:builder})};
  },{signedIn,profile,scenarios});
}

function retirementScenario(currentSavings=900000){
  return {id:'s-ret',journey:'retirement',label:'Retirement plan',scenario:{journey:'retirement',label:'Retirement plan',toolPath:'/retirement-calculator/',input:{mode:'quick',currentSavings:String(currentSavings)},summary:{}}};
}

async function enterMeaningfulRetirementPlan(page,currentSavings=1250000){
  await setInput(page,'#currentSavings',String(currentSavings));
  await setInput(page,'#quickMonthlyExpense','90000');
}

test.describe('FRE8B selective Save/Update to My Carrowmont',()=>{
  test('[AUTO] My Carrowmont hero explains connected plans analytics and explicit choice',async({page})=>{
    const errors=monitorPageErrors(page);await gotoClean(page,'/my-carrowmont.html');
    await expect(page.getByRole('heading',{name:'Keep your financial plans connected.'})).toBeVisible();
    await expect(page.getByText(/Save your retirement, goals, debt, loans and other financial plans/)).toBeVisible();
    await expect(page.getByText('Only the plans you choose to keep become part of My Carrowmont.').first()).toBeVisible();
    await expect(page.locator('.mycm-privacy-badges')).toContainText('See deeper insights');
    await expect(page.locator('.mycm-privacy-badges')).not.toContainText('No bank connection');
    expect(errors).toEqual([]);
  });

  test('[AUTO] Retirement only offers account saving after meaningful user activity',async({page})=>{
    await gotoClean(page,'/retirement-calculator/planner.html');
    const card=page.locator('#cmMycmSave-retirement');await expect(card).toBeHidden();
    await enterMeaningfulRetirementPlan(page);await expect(card).toBeVisible();
    await expect(card.getByRole('button',{name:'Save this plan to My Carrowmont'})).toBeVisible();
  });

  test('[AUTO] explicit Save stages the selected retirement plan and routes to My Carrowmont',async({page})=>{
    await gotoClean(page,'/retirement-calculator/planner.html');await enterMeaningfulRetirementPlan(page);
    await page.locator('#cmMycmSave-retirement').getByRole('button',{name:'Save this plan to My Carrowmont'}).click();
    await page.waitForURL(/\/my-carrowmont\.html\?savePlan=retirement/);
    const staged=await page.evaluate(()=>JSON.parse(localStorage.getItem('carrowmont_pending_saved_plan_v1')||'null'));
    expect(staged?.explicit).toBe(true);expect(staged?.plan?.journey).toBe('retirement');expect(staged?.plan?.scenario?.input).toBeTruthy();
  });

  test('[AUTO] logged-in existing plan offers Update or Keep existing plan and Keep does not stage changes',async({page})=>{
    await installMockSupabase(page,{signedIn:true,scenarios:[retirementScenario()]});
    await gotoClean(page,'/retirement-calculator/planner.html');
    await page.evaluate(()=>localStorage.setItem('sb-test-auth-token','qa-auth'));
    await enterMeaningfulRetirementPlan(page);
    const card=page.locator('#cmMycmSave-retirement');
    await expect(card.getByRole('button',{name:'Update My Carrowmont with these changes'})).toBeVisible();
    await expect(card.getByRole('button',{name:'Keep existing plan'})).toBeVisible();
    await card.getByRole('button',{name:'Keep existing plan'}).click();
    expect(await page.evaluate(()=>localStorage.getItem('carrowmont_pending_saved_plan_v1'))).toBeNull();
  });

  test('[AUTO] authenticated staged update replaces the existing journey scenario instead of creating a duplicate',async({page})=>{
    const existing=retirementScenario(900000);
    await installMockSupabase(page,{signedIn:true,scenarios:[existing]});
    await page.addInitScript(()=>{
      localStorage.setItem('carrowmont_pending_saved_plan_v1',JSON.stringify({explicit:true,stagedAt:new Date().toISOString(),plan:{journey:'retirement',label:'Retirement plan',toolPath:'/retirement-calculator/',scenario:{input:{mode:'quick',currentSavings:'1250000'},summary:{}},profileFacts:{'retirement.currentSavings':{value:1250000,unit:'USD',source:'Retirement Planner'}}}}));
    });
    await gotoClean(page,'/my-carrowmont.html?code=qa-auth-return&savePlan=retirement');
    await expect(page.locator('#mycmAccountStatus')).toContainText('updated in My Carrowmont');
    const scenarios=await page.evaluate(()=>window.__cmCloud.scenarios);
    expect(scenarios).toHaveLength(1);expect(scenarios[0].id).toBe('s-ret');expect(scenarios[0].scenario.input.currentSavings).toBe('1250000');
  });

  test('[AUTO] car starter values do not create prompt fatigue but edited assumptions can be kept',async({page})=>{
    await gotoClean(page,'/car-affordability-auto-decision-calculator.html');const card=page.locator('#cmMycmSave-car-affordability');
    await expect(card).toBeHidden();await page.getByRole('button',{name:'Check this car purchase'}).click();await expect(card).toBeHidden();
    await setInput(page,'#vehiclePrice','1500000');await expect(card).toBeVisible();
  });

  test('[AUTO] quick utility surfaces remain free of generic save-account prompting',async({page})=>{
    for(const path of ['/inflation-calculator/','/compound-interest-calculator/']){
      await gotoClean(page,path);expect(await page.evaluate(()=>Boolean(window.CarrowmontPlanSave))).toBe(false);await expect(page.locator('[id^="cmMycmSave-"]')).toHaveCount(0);
    }
  });
});
