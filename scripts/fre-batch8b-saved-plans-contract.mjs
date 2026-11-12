import fs from 'node:fs';
import path from 'node:path';

export function runFreBatch8bSavedPlansContract(sourceRoot){
  const checks=[]; const add=(name,ok,detail='')=>checks.push({name,ok,detail});
  const read=rel=>{const p=path.join(sourceRoot,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const main='draw004.github.io';
  const bridge=read(`${main}/assets/account/carrowmont-plan-save.js`);
  const account=read(`${main}/assets/account/carrowmont-account.js`);
  const accountUi=read(`${main}/assets/account/my-carrowmont-account.js`);
  const mycm=read(`${main}/my-carrowmont.html`);
  const mycmCss=read(`${main}/assets/dashboard/my-carrowmont.css`);

  add('central saved-plan bridge requires explicit Save/Update before staging account data',
    bridge.includes("const PENDING_KEY='carrowmont_pending_saved_plan_v1'") && bridge.includes('explicit:true') && bridge.includes('data-cm-save') && !bridge.includes('stage(plan);return true;adapter.offered'));
  add('logged-in existing plan receives explicit update-or-keep choices',bridge.includes('Update My Carrowmont with these changes')&&bridge.includes('Keep existing plan')&&bridge.includes('This calculation is separate from your saved My Carrowmont plan until you choose to update it.'));
  add('logged-in state is checked only from a persisted account session and existing account scenarios',bridge.includes('hasPersistedAuthSession()')&&bridge.includes('Account.listScenarios()')&&bridge.includes('row?.journey===adapter.journey'));
  add('saved-plan bridge suppresses update prompt when reopened inputs still match the saved plan',bridge.includes('planInputFingerprint(plan)===savedInputFingerprint(adapter.accountState.existing)')&&bridge.includes('consumeOpen(adapter)'));
  add('saved-plan bridge supports reopening account scenarios back into their originating tool',bridge.includes("const OPEN_KEY='carrowmont_open_saved_plan_v1'")&&bridge.includes('adapter.applyPlan?.(entry.plan.scenario)'));
  add('account layer can list save delete and reopen user-owned saved scenarios',account.includes('async function listScenarios()')&&account.includes('async function saveScenario')&&account.includes('async function deleteScenario')&&account.includes('function stageOpenPlan(row)'));
  add('saving the same journey updates the existing account scenario instead of creating a duplicate active copy',accountUi.includes("const existing=(await Account.listScenarios()).find(row=>row?.journey===plan.journey)||null")&&accountUi.includes('id:existing?.id')&&accountUi.includes('updated:Boolean(existing)'));
  add('authenticated My Carrowmont renders a saved-plan library with open and delete actions',accountUi.includes('async function renderSavedPlans()')&&accountUi.includes("open.textContent='Open plan'")&&accountUi.includes("del.textContent='Delete'")&&accountUi.includes('Account.stageOpenPlan(row)'));
  add('My Carrowmont hero uses approved compact value and analytics copy',mycm.includes('Keep your financial plans connected.')&&mycm.includes('Save your retirement, goals, debt, loans and other financial plans')&&mycm.includes('access them across devices and see deeper insights')&&mycm.includes('Only the plans you choose to keep become part of My Carrowmont.')&&['Save plans','Access anywhere','Update anytime','See deeper insights'].every(x=>mycm.includes(`<span>${x}</span>`)));
  add('My Carrowmont hero no longer promotes bank-connection absence as a value badge',!/<div class="mycm-privacy-badges">[\s\S]*?<span>No bank connection<\/span>/.test(mycm));
  add('My Carrowmont hero uses space-efficient responsive sizing',mycmCss.includes('FRE Batch 8B - use hero space efficiently')&&mycmCss.includes('.mycm-hero{padding:42px 0 22px}')&&mycmCss.includes('font-size:clamp(36px,4.2vw,54px)'));

  const supported=[
    ['retirement-calculator/planner.html','retirement-calculator/app.js','retirement'],
    ['goal-planner/index.html','goal-planner/app.js','goal'],
    ['financial-independence/index.html','financial-independence/app.js','financial-independence'],
    ['budget-cash-flow-planner/index.html','budget-cash-flow-planner/app.js','budget-cash-flow'],
    [`${main}/emergency-fund-runway-calculator.html`,`${main}/emergency-fund-runway-calculator.js`,'emergency-runway'],
    ['budget-cash-flow-planner/debt-payoff-calculator.html','budget-cash-flow-planner/debt-payoff-calculator.js','debt-payoff'],
    ['budget-cash-flow-planner/credit-card-payoff-calculator.html','budget-cash-flow-planner/credit-card-payoff-calculator.js','credit-card-payoff'],
    ['loan-calculator/index.html','loan-calculator/app.js','loan-emi'],
    ['mortgage-payoff-calculator/index.html','mortgage-payoff-calculator/app.js','mortgage-payoff'],
    ['sip-calculator/index.html','sip-calculator/app.js','recurring-investment'],
    ['retirement-calculator/withdrawal-calculator.html','retirement-calculator/withdrawal-calculator.js','retirement-withdrawal'],
    [`${main}/car-affordability-auto-decision-calculator.html`,`${main}/car-affordability-auto-decision-calculator.js`,'car-affordability']
  ];
  for(const [htmlPath,appPath,journey] of supported){
    const html=read(htmlPath),app=read(appPath);
    add(`${journey}: substantial planner loads the shared explicit-save bridge`,html.includes('/assets/account/carrowmont-plan-save.js'));
    add(`${journey}: adapter registers a plan-specific My Carrowmont journey`,app.includes(`journey:'${journey}'`)&&app.includes('CarrowmontPlanSave'));
  }
  const excluded=['inflation-calculator/index.html','compound-interest-calculator/index.html'];
  add('quick utility surfaces do not receive a generic Batch 8B account prompt',excluded.every(f=>!read(f).includes('/assets/account/carrowmont-plan-save.js')));

  const emergency=read(`${main}/emergency-fund-runway-calculator.js`);
  add('Emergency Fund saves current reserve/target facts only after meaningful user activity',emergency.includes("journey:'emergency-runway'")&&emergency.includes("'resilience.emergencySavings'")&&emergency.includes("'resilience.targetMonths'")&&emergency.includes('if (mycmTouched)'));
  const credit=read('budget-cash-flow-planner/credit-card-payoff-calculator.js');
  add('Credit Card Payoff can preserve balance APR and minimum-payment context after explicit save',credit.includes("journey:'credit-card-payoff'")&&credit.includes("'debt.creditCardMinimums'")&&credit.includes("'debt.highestAprPct'"));
  const loan=read('loan-calculator/app.js');
  add('Loan/EMI can be kept as a saved plan without silently converting a modeled loan into current dashboard debt facts',loan.includes("journey:'loan-emi'")&&loan.includes('profileFacts:{}')&&loan.includes('Save this loan plan to My Carrowmont'));
  const sip=read('sip-calculator/app.js');
  add('SIP/Recurring Investment can be kept as a reusable plan without misclassifying a generic investment as retirement/FI facts',sip.includes("journey:'recurring-investment'")&&sip.includes('profileFacts:{}'));
  const withdrawal=read('retirement-calculator/withdrawal-calculator.js');
  add('Retirement Withdrawal/Drawdown saves the withdrawal scenario and retirement starting balance after explicit save',withdrawal.includes("journey:'retirement-withdrawal'")&&withdrawal.includes("'retirement.currentSavings'"));
  const carApp=read(`${main}/car-affordability-auto-decision-calculator.js`);
  add('car affordability saves a hypothetical scenario without converting the proposed car loan into an existing debt fact',carApp.includes("label:'Car affordability plan'")&&carApp.includes("'cashFlow.takeHomeIncome'")&&!carApp.includes("'debt.mortgageBalance'")&&!carApp.includes("'debt.balance'"));
  add('untouched car starter values do not qualify for a save prompt',carApp.includes('if(!usingStarterValues)mycmTouched=true')&&carApp.includes('if(mycmTouched&&!usingStarterValues)window.CarrowmontPlanSave'));

  const retirementHtml=read('retirement-calculator/planner.html'),retirementFaq=read('retirement-calculator/faq.html'),retirementPrivacy=read('retirement-calculator/privacy.html');
  add('retirement removes obsolete device-only save controls and aligns help/privacy with My Carrowmont',!retirementHtml.includes('Save plan on this device')&&!retirementHtml.includes('Load saved plan')&&retirementFaq.includes('Save to My Carrowmont')&&retirementPrivacy.includes('Only plans you choose to keep become part of My Carrowmont'));
  const budgetStorage=read('budget-cash-flow-planner/storage.js');
  const budgetHtml=read('budget-cash-flow-planner/index.html');
  add('Budget guest month comparisons are session-only instead of a persistent account substitute',budgetStorage.includes('sessionStorage')&&!budgetStorage.includes('indexedDB')&&!budgetStorage.includes('localStorage')&&budgetHtml.includes('Session-only comparisons')&&budgetHtml.includes('THIS BROWSER SESSION'));
  const continuity=read(`${main}/docs/CARROWMONT_FRE_BATCH8_CONTINUITY_AMENDMENT.md`);
  add('Batch 8 continuity records Save/Update contract and keeps progress tracking in 8C',continuity.includes('**8B — THIS RELEASE:**')&&continuity.includes('Update My Carrowmont with these changes')&&continuity.includes('Keep existing plan')&&continuity.includes('**8C — NEXT:**'));
  const pages=JSON.parse(read(`${main}/data/carrowmont-search-pages.json`)),index=JSON.parse(read(`${main}/data/carrowmont-search-index.json`));
  add('search inventory remains 138 and My Carrowmont metadata reflects saved plans and insights',pages.entries?.length===138&&index.entries?.length===138&&pages.entries?.some(e=>e.url==='/my-carrowmont.html'&&/Save Financial Plans/.test(e.title)&&/deeper planning insights/i.test(e.description)));
  const registry=JSON.parse(read(`${main}/docs/CARROWMONT_FRE_ENGINE_REGISTRY_V15.json`));
  add('Engine Registry V15 records eleven account-backed planning journeys plus Car Affordability scenario',registry.schema_version===15&&registry.registry_id==='carrowmont-fre-engine-registry-v15'&&registry.fre_batch8b?.supported_journeys?.length===12&&registry.fre_batch8b?.account_backed_planning_journeys?.length===11&&registry.fre_batch8b?.explicit_save_or_update_required===true&&registry.fre_batch8b?.logged_in_auto_save===false);
  add('Batch 8B implementation and acceptance ledger exist',['CARROWMONT_FRE_BATCH8B_SELECTIVE_SAVE_TO_MY_CARROWMONT.md','CARROWMONT_FRE_BATCH8B_ACCEPTANCE_LEDGER.md'].every(f=>fs.existsSync(path.join(sourceRoot,main,'docs',f))));
  return checks;
}
