import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

export function runFreBatch8dPlanIntelligenceContract(sourceRoot){
  const checks=[];const add=(name,ok,detail='')=>checks.push({name,ok,detail});
  const read=rel=>{const p=path.join(sourceRoot,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const main='draw004.github.io';
  const progressSrc=read(`${main}/assets/account/carrowmont-progress.js`);
  const accountUi=read(`${main}/assets/account/my-carrowmont-account.js`);
  const mycm=read(`${main}/my-carrowmont.html`);
  const css=read(`${main}/assets/dashboard/my-carrowmont.css`);
  const privacy=read(`${main}/privacy.html`),terms=read(`${main}/terms.html`);
  const continuity=read(`${main}/docs/CARROWMONT_FRE_BATCH8_CONTINUITY_AMENDMENT.md`);
  const impl=read(`${main}/docs/CARROWMONT_FRE_BATCH8D_PLAN_BASELINE_ON_TRACK_INTELLIGENCE.md`);
  const ledger=read(`${main}/docs/CARROWMONT_FRE_BATCH8D_ACCEPTANCE_LEDGER.md`);
  let registry={};try{registry=JSON.parse(read(`${main}/docs/CARROWMONT_FRE_ENGINE_REGISTRY_V17.json`));}catch(_){registry={};}

  add('8D explicitly separates current details saved plan what-if calculation and progress history',
    ['Current details','Saved plan','What-if calculation','Progress history'].every(x=>mycm.includes(x))&&mycm.includes('Know what is saved — and what is only a what-if.'));
  add('8D progress engine preserves 8C trend comparison and adds separate target intelligence',progressSrc.includes("const VERSION='carrowmont-progress-v2.0'")&&progressSrc.includes('function compare(row,currency)')&&progressSrc.includes('function evaluate(row,currency,now)')&&progressSrc.includes('function evaluateAll(rows,currency,now)'));
  add('8D plan metadata carries baseline start last-reviewed review cadence and target without a new database table',progressSrc.includes('function planMeta(existing,nextScenario,savedAt)')&&progressSrc.includes('startedAt')&&progressSrc.includes('lastReviewedAt')&&progressSrc.includes('reviewEveryMonths')&&progressSrc.includes('baseline,target')&&impl.includes('No new database table'));
  add('8D UI treats target status as primary and saved-version trend as Since last save',accountUi.includes('Progress.evaluateAll?Progress.evaluateAll(rows,currency):Progress.analyze(rows,currency)')&&accountUi.includes('Since last save')&&accountUi.includes('mycm-progress-trend')&&progressSrc.includes('Last reviewed'));
  add('8D uses simple user-facing statuses and avoids technical jargon', ['On track','Ahead','Needs attention','Needs review','Ready to track'].every(x=>progressSrc.includes(x))&&!/variance threshold|inference score|confidence coefficient/i.test(mycm+accountUi));
  add('8D keeps explicit correction review rather than automatic plan changes',accountUi.includes('What could help')&&impl.includes('Carrowmont never applies a correction automatically')&&ledger.includes('Corrective scenarios never update a saved plan automatically'));
  add('retirement goal FI and recurring investment save deterministic correction fields already calculated by their engines',
    read('retirement-calculator/app.js').includes('additionalContribution:r.extraMonthlyNeeded')&&
    read('goal-planner/app.js').includes('additionalContribution:c.additional')&&
    read('financial-independence/app.js').includes('additionalContribution:r.additionalContribution')&&
    read('sip-calculator/app.js').includes('additionalContribution:r.additionalContribution'));
  add('withdrawal plan saves its selected target horizon for on-track evaluation',read('retirement-calculator/withdrawal-calculator.js').includes('targetMonths:s.targetMonths||inputs().targetMonths||null'));
  add('plan freshness is visible and uses journey-specific review cadence without monitoring live accounts',progressSrc.includes('const REVIEW_MONTHS=Object.freeze')&&progressSrc.includes('function freshness(row,now)')&&progressSrc.includes("set('Needs review','warn'")&&impl.includes('No live transaction monitoring'));
  add('Car Affordability remains outside ongoing target intelligence',progressSrc.includes("filter(row=>clean(row?.journey)!=='car-affordability')")&&registry.fre_batch8d?.car_affordability_progress===false);
  add('Privacy and Terms disclose plan dates targets and exclude unsaved calculations',privacy.includes('plan started')&&privacy.includes('last reviewed')&&privacy.includes('target date or target amount')&&terms.includes('plan start date')&&terms.includes('last-reviewed date')&&terms.includes('unsaved calculations are not added'));
  add('8D responsive styles keep explanatory model and progress cards mobile-safe',css.includes('FRE Batch 8D - explicit plan model and target-based progress')&&css.includes('@media(max-width:520px)')&&css.includes('.mycm-plan-model-grid{grid-template-columns:1fr}'));
  add('Batch 8 continuity and V17 registry record target-based intelligence without formula change',(continuity.includes('**8D — THIS RELEASE:**')||continuity.includes('**8D — COMPLETE:**'))&&continuity.includes('A plan can be improving and still need attention')&&registry.schema_version===17&&registry.registry_id==='carrowmont-fre-engine-registry-v17'&&registry.fre_batch8d?.formula_change==='none'&&registry.fre_batch8d?.bank_or_transaction_monitoring===false);
  add('Batch 8D implementation and acceptance ledger exist',Boolean(impl)&&Boolean(ledger));

  let api=null;try{const sandbox={console,Intl,Date,JSON,Math,Number,String,Object,Array,Set,Map};sandbox.globalThis=sandbox;vm.runInNewContext(progressSrc,sandbox,{filename:'carrowmont-progress.js'});api=sandbox.CarrowmontProgress;}catch(_){api=null;}
  add('8D intelligence module loads as deterministic account-layer logic',Boolean(api?.evaluate&&api?.evaluateAll&&api?.targetFrom&&api?.freshness&&api?.planMeta));
  if(api){
    const retirement={journey:'retirement',label:'Retirement plan',created_at:'2026-01-01T00:00:00Z',updated_at:'2026-11-01T00:00:00Z',scenario:{input:{currentAge:40},summary:{retirementAge:60,fundedPct:70,gap:300000,additionalContribution:250,contributionFrequency:'monthly'},progressHistory:[{savedAt:'2026-01-01T00:00:00Z',snapshot:{journey:'retirement',fundedPct:60,gap:400000}}],planMeta:{startedAt:'2026-01-01T00:00:00Z',lastReviewedAt:'2026-11-01T00:00:00Z',reviewEveryMonths:6,target:{kind:'funding-pct',value:100,age:60}}}};
    const r=api.evaluate(retirement,'USD','2026-11-13T00:00:00Z');
    add('8D can show improving retirement trend while the saved target still needs attention',r.status==='Needs attention'&&r.trend?.status==='Improving'&&/70% funded/.test(r.headline)&&/\$250/.test(r.correction));
    const emergency={journey:'emergency-runway',label:'Emergency',updated_at:'2026-11-01T00:00:00Z',scenario:{summary:{runwayMonths:3,targetMonths:6,targetGap:9000}}};
    const e=api.evaluate(emergency,'USD','2026-11-13T00:00:00Z');
    add('8D emergency target intelligence quantifies the saved runway gap',e.status==='Needs attention'&&/3 months/.test(e.headline)&&/\$9,000/.test(e.correction));
    const stale={journey:'financial-independence',label:'FI',updated_at:'2025-01-01T00:00:00Z',scenario:{input:{currentAge:35,targetAge:50},summary:{targetAge:50,modelledFIAge:49,currentAssets:100000},planMeta:{startedAt:'2025-01-01T00:00:00Z',lastReviewedAt:'2025-01-01T00:00:00Z',reviewEveryMonths:6,target:{kind:'fi-age',value:50}}}};
    const f=api.evaluate(stale,'USD','2026-11-13T00:00:00Z');
    add('8D freshness does not present old on-track data as current',f.status==='Needs review'&&f.freshness?.stale===true&&/may no longer reflect/.test(f.headline));
    const car=api.evaluateAll([{journey:'car-affordability',scenario:{summary:{vehiclePrice:30000}}}], 'USD','2026-11-13T00:00:00Z');
    add('8D ongoing intelligence still excludes Car Affordability scenarios',Array.isArray(car)&&car.length===0);
  }
  return checks;
}
