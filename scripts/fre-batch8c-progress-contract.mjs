import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

export function runFreBatch8cProgressContract(sourceRoot){
  const checks=[];const add=(name,ok,detail='')=>checks.push({name,ok,detail});
  const read=rel=>{const p=path.join(sourceRoot,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const main='draw004.github.io';
  const progressSrc=read(`${main}/assets/account/carrowmont-progress.js`);
  const accountUi=read(`${main}/assets/account/my-carrowmont-account.js`);
  const mycm=read(`${main}/my-carrowmont.html`);
  const css=read(`${main}/assets/dashboard/my-carrowmont.css`);
  const privacy=read(`${main}/privacy.html`);
  const terms=read(`${main}/terms.html`);
  const continuity=read(`${main}/docs/CARROWMONT_FRE_BATCH8_CONTINUITY_AMENDMENT.md`);
  const impl=read(`${main}/docs/CARROWMONT_FRE_BATCH8C_PLANS_PROGRESS_TRACKING.md`);
  const ledger=read(`${main}/docs/CARROWMONT_FRE_BATCH8C_ACCEPTANCE_LEDGER.md`);
  const registryText=read(`${main}/docs/CARROWMONT_FRE_ENGINE_REGISTRY_V16.json`);
  let registry={};try{registry=JSON.parse(registryText);}catch(_){registry={};}

  add('progress engine is a separate non-calculator account module',/const VERSION='carrowmont-progress-v[12]\.0'/.test(progressSrc)&&progressSrc.includes('function snapshot(journey,scenario)')&&progressSrc.includes('function scenarioWithHistory(existing,nextScenario)')&&progressSrc.includes('function analyze(rows,currency)'));
  add('progress history is bounded to twelve prior explicitly saved versions',progressSrc.includes('const MAX_HISTORY=12')&&progressSrc.includes('history=history.slice(-MAX_HISTORY)'));
  add('My Carrowmont stores prior saved-version snapshot only during explicit staged-plan update',accountUi.includes('Progress?.scenarioWithHistory?Progress.scenarioWithHistory(existing,nextScenario):nextScenario')&&accountUi.includes('readStagedPlan()')&&accountUi.includes('entry.explicit!==true'));
  add('My Carrowmont renders progress from account scenarios and keeps Car Affordability out of core progress feed',accountUi.includes('function renderProgress(rows)')&&(accountUi.includes('Progress.analyze(rows,currency)')||accountUi.includes('Progress.evaluateAll?Progress.evaluateAll(rows,currency):Progress.analyze(rows,currency)'))&&progressSrc.includes("filter(row=>clean(row?.journey)!=='car-affordability')"));
  add('first saved version uses Ready to track instead of inventing a trend',progressSrc.includes("status:'Ready to track'")&&progressSrc.includes('This saved plan is your starting point.')&&progressSrc.includes('Update it later and My Carrowmont will show what changed.'));
  add('progress UI uses simple statuses and clear next-step language',(mycm.includes('See what changed since you last saved.')||mycm.includes('See whether your saved plans are on track.'))&&(accountUi.includes('What you can do next')||accountUi.includes('What could help'))&&['On track','Improving','Needs attention','Needs review','Steady','Ready to track'].every(x=>progressSrc.includes(x))&&!/variance|deviation threshold|inference score/i.test(mycm+accountUi));
  add('progress UI is authenticated-dashboard content and appears before Saved plans',mycm.indexOf('id="mycmProgressSection"')>0&&mycm.indexOf('id="mycmProgressSection"')<mycm.indexOf('id="mycmSavedPlansSection"')&&(mycm.includes('Your saved plan changes only when you choose to update it.')||mycm.includes('What-if calculation')));
  add('progress cards are responsive without changing shared calculator layouts',css.includes('FRE Batch 8C - saved-plan progress and simple next steps')&&css.includes('grid-template-columns:repeat(2,minmax(0,1fr))')&&css.includes('@media(max-width:760px)')&&css.includes('.mycm-progress-list{grid-template-columns:1fr}'));
  add('Privacy discloses limited saved-version history and excludes unsaved calculations',privacy.includes('limited recent history of the versions you chose to save')&&privacy.includes('Calculations you do not choose to save are not added to that plan history'));
  add('Terms disclose saved-version history without implying background monitoring',terms.includes('limited recent history of the versions you chose to save')&&terms.includes('unsaved calculations are not added to that history'));
  add('Batch 8C documentation keeps formulas authoritative and rejects live account monitoring',impl.includes('No new financial formulas')&&impl.includes('No live-account inference')&&impl.includes('no new database table is required')&&ledger.includes('No deterministic calculator formula changes'));
  add('Batch 8 continuity marks 8C as current and saved-version progress as explicit-save only',(continuity.includes('**8C — THIS RELEASE:**')||continuity.includes('**8C — COMPLETE:**'))&&continuity.includes('Progress compares only plan versions the user explicitly chose to save/update')&&(continuity.includes('Batch 8 is now complete at the foundation level')||continuity.includes('Batch 8C completed the saved-version comparison foundation')));
  add('Engine Registry V16 records bounded history, eleven progress journeys and no bank monitoring',registry.schema_version===16&&registry.registry_id==='carrowmont-fre-engine-registry-v16'&&registry.fre_batch8c?.history_limit===12&&registry.fre_batch8c?.progress_journeys?.length===11&&registry.fre_batch8c?.bank_or_transaction_monitoring===false&&registry.fre_batch8c?.formula_change==='none');
  add('Batch 8C implementation and acceptance ledger exist',Boolean(impl)&&Boolean(ledger));

  let api=null;
  try{
    const sandbox={console,Intl,Date,JSON,Math,Number,String,Object,Array,Set,Map};sandbox.globalThis=sandbox;
    vm.runInNewContext(progressSrc,sandbox,{filename:'carrowmont-progress.js'});api=sandbox.CarrowmontProgress;
  }catch(_){api=null;}
  add('progress engine loads as a deterministic pure comparison module',Boolean(api?.snapshot&&api?.scenarioWithHistory&&api?.compare));
  if(api){
    const oldRow={journey:'retirement',updated_at:'2026-01-01T00:00:00Z',scenario:{summary:{fundedPct:60,gap:400000},input:{currentSavings:100000}}};
    const next=api.scenarioWithHistory(oldRow,{summary:{fundedPct:70,gap:300000},input:{currentSavings:150000}});
    const result=api.compare({journey:'retirement',label:'Retirement plan',scenario:next},'USD');
    add('retirement progress compares saved versions without recalculating the retirement engine',next.progressHistory?.length===1&&next.progressHistory[0]?.snapshot?.fundedPct===60&&result.status==='Improving'&&/10 percentage points/.test(result.headline));
    const first=api.compare({journey:'goal',label:'Goal',scenario:{summary:{funding:.5,gap:1000}}},'USD');
    add('first-save comparison stays neutral until a later explicit update exists',first.status==='Ready to track'&&first.tone==='neutral');
    const car=api.analyze([{journey:'car-affordability',label:'Car',scenario:{summary:{vehiclePrice:20000}}}], 'USD');
    add('Car Affordability remains a saved decision scenario rather than ongoing progress',Array.isArray(car)&&car.length===0);
  }
  return checks;
}
