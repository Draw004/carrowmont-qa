import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const FRE_FILES = [
  'financial-context.js',
  'engine-catalog.js',
  'engine-adapters.js',
  'primary-engine-adapters.js',
  'resilience-engine-adapters.js',
  'borrowing-health-engine-adapters.js',
  'credit-card-payoff-engine-adapters.js',
  'priority-framework.js',
  'intent-router.js',
  'scenario-comparison.js',
  'confidence.js',
  'core.js'
];

const add = (checks, name, ok, detail = '') => checks.push({ name, ok:Boolean(ok), detail });

function loadFre(sourceRoot) {
  const dir = path.join(sourceRoot, 'draw004.github.io', 'assets', 'fre');
  const context = vm.createContext({ console });
  for (const file of FRE_FILES) {
    const source = fs.readFileSync(path.join(dir, file), 'utf8');
    new vm.Script(source, { filename:file }).runInContext(context);
  }
  return { dir, context };
}

export function runFreCoreContract(sourceRoot) {
  const checks = [];
  const dir = path.join(sourceRoot, 'draw004.github.io', 'assets', 'fre');
  add(checks, 'all Batch 1A FRE contract files exist', FRE_FILES.every(file => fs.existsSync(path.join(dir, file))));
  const docs = [
    'draw004.github.io/docs/CARROWMONT_FRE_BATCH1A_ACCEPTANCE_LEDGER.md',
    'draw004.github.io/docs/CARROWMONT_FRE_BATCH1A_CORE_CONTRACTS.md',
    'draw004.github.io/docs/CARROWMONT_FRE_ENGINE_REGISTRY_V2.json',
    'draw004.github.io/docs/CARROWMONT_FRE_ENGINE_REGISTRY_V3.json',
    'draw004.github.io/docs/CARROWMONT_FRE_ENGINE_REGISTRY_V4.json',
    'draw004.github.io/docs/CARROWMONT_FRE_ENGINE_REGISTRY_V5.json',
    'draw004.github.io/docs/CARROWMONT_FRE_ENGINE_REGISTRY_V6.json',
    'draw004.github.io/docs/CARROWMONT_FRE_ENGINE_REGISTRY_V7.json'
  ];
  add(checks, 'FRE history through current Engine Registry V7 exists', docs.every(rel => fs.existsSync(path.join(sourceRoot, rel))));
  const registryV2 = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'draw004.github.io/docs/CARROWMONT_FRE_ENGINE_REGISTRY_V2.json'), 'utf8'));
  const registryV3 = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'draw004.github.io/docs/CARROWMONT_FRE_ENGINE_REGISTRY_V3.json'), 'utf8'));
  const registryV4 = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'draw004.github.io/docs/CARROWMONT_FRE_ENGINE_REGISTRY_V4.json'), 'utf8'));
  const registryV5 = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'draw004.github.io/docs/CARROWMONT_FRE_ENGINE_REGISTRY_V5.json'), 'utf8'));
  const registryV6 = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'draw004.github.io/docs/CARROWMONT_FRE_ENGINE_REGISTRY_V6.json'), 'utf8'));
  const registryV7 = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'draw004.github.io/docs/CARROWMONT_FRE_ENGINE_REGISTRY_V7.json'), 'utf8'));
  add(checks, 'Engine registries preserve historical states and historical V6 and current 26-engine 59-region 48-currency baseline', registryV2.schema_version === 2 && registryV3.schema_version === 3 && registryV3.engines?.length === 22 && registryV4.schema_version === 4 && registryV4.engines?.length === 23 && registryV5.schema_version === 5 && registryV5.engines?.length === 24 && registryV6.schema_version === 6 && registryV6.engines?.length === 25 && registryV7.schema_version === 7 && registryV7.engines?.length === 26 && registryV7.locale_contract?.regions === 59 && registryV7.locale_contract?.currencies === 48);
  if (!checks[0].ok) return checks;

  let loaded;
  try {
    loaded = loadFre(sourceRoot);
    add(checks, 'FRE contract JavaScript parses and loads in isolation', true);
  } catch (error) {
    add(checks, 'FRE contract JavaScript parses and loads in isolation', false, error.message);
    return checks;
  }

  const c = loaded.context;
  const Context = c.CarrowmontFinancialContext;
  const Catalog = c.CarrowmontFreEngineCatalog;
  const Adapters = c.CarrowmontFreEngineAdapters;
  const Priority = c.CarrowmontFrePriorityFramework;
  const Router = c.CarrowmontFreIntentRouter;
  const Scenarios = c.CarrowmontFreScenarioComparison;
  const Confidence = c.CarrowmontFreConfidence;
  const Core = c.CarrowmontFreCore;

  add(checks, 'financial context is guest-first and has no persistence contract', Context?.SCHEMA_VERSION === 1 && Context?.PERSISTENCE === 'none');
  let ctx = Context.create({ region:'IN', currency:'INR', now:'2026-11-07T00:00:00.000Z' });
  ctx = Context.setFact(ctx, 'cashFlow.monthlyIncome', 100000, { origin:'user', unit:'INR/month', now:'2026-11-07T00:00:01.000Z' });
  add(checks, 'financial facts preserve value, provenance, unit and freshness',
    Context.getFact(ctx, 'cashFlow.monthlyIncome')?.value === 100000 &&
    Context.getFact(ctx, 'cashFlow.monthlyIncome')?.origin === 'user' &&
    Context.getFact(ctx, 'cashFlow.monthlyIncome')?.unit === 'INR/month' &&
    Context.getFact(ctx, 'cashFlow.monthlyIncome')?.lastUpdated === '2026-11-07T00:00:01.000Z'
  );
  ctx = Context.setExcluded(ctx, 'cashFlow.monthlyIncome', true, { now:'2026-11-07T00:00:02.000Z' });
  add(checks, 'excluded financial facts are not silently reused in recommendations', Context.getFact(ctx, 'cashFlow.monthlyIncome') === null && Context.getFact(ctx, 'cashFlow.monthlyIncome', { includeExcluded:true })?.excluded === true);

  const reqCtx = Context.setFact(Context.create({ region:'GB', currency:'GBP', now:'2026-11-07T00:00:00.000Z' }), 'resilience.liquidSavings', 4000, { origin:'inferred', estimated:true, now:'2026-11-07T00:00:01.000Z' });
  const reqStatus = Context.requirementStatus(reqCtx, ['resilience.liquidSavings','cashFlow.monthlyIncome']);
  add(checks, 'requirement status distinguishes missing and estimated facts', reqStatus.missing.length === 1 && reqStatus.missing[0] === 'cashFlow.monthlyIncome' && reqStatus.estimated.includes('resilience.liquidSavings'));

  add(checks, 'engine catalog exposes 26 engines with all Batch 1 extraction blockers closed and Batch 2A/2B/2C/2D engines ready', Catalog?.CATALOG_VERSION === 6 && Catalog?.ENGINES?.length === 26 && Catalog?.needsExtraction()?.length === 0 && ['budget-cash-flow','goal-planner','inflation','retirement','emergency-fund-runway','debt-to-income-borrowing-health','car-affordability','credit-card-payoff-comparison'].every(id => Catalog.get(id)?.status === 'READY_WITH_ADAPTER' && Catalog.get(id)?.api));

  const registry = Adapters.createRegistry();
  registry.register({ id:'fixture-engine', engineVersion:'fixture-v1', requiredInputs:['amount'], invoke:({ inputs, currency }) => ({ currency, inputsUsed:inputs, metrics:{ doubled:Number(inputs.amount) * 2 }, assumptions:[], warnings:[] }) });
  const envelope = registry.run('fixture-engine', { currency:'USD', inputs:{ amount:5 } });
  add(checks, 'engine adapters return a deterministic standard envelope', envelope.engineId === 'fixture-engine' && envelope.metrics.doubled === 10 && envelope.currency === 'USD' && envelope.adapterContractVersion === 1);
  let unknownRejected = false;
  try { registry.run('missing-engine', { inputs:{} }); } catch { unknownRejected = true; }
  add(checks, 'adapter registry rejects unregistered engines instead of guessing', unknownRejected);

  add(checks, 'priority framework is locked to Stabilize Protect Reduce Build Grow Optimize', Priority?.STAGES?.map(stage => stage.label).join(' > ') === 'Stabilize > Protect > Reduce > Build > Grow > Optimize');

  const debtRoute = Router.resolve({ text:'I have credit card debt and savings. Should I invest the savings or clear debt?' });
  add(checks, 'intent router deterministically recognizes debt-versus-savings', debtRoute.intent === Router.INTENTS.DEBT_VS_SAVINGS && debtRoute.route.priorityStage === 'reduce');
  const runwayRoute = Router.routeForIntent(Router.INTENTS.EMERGENCY_RUNWAY);
  add(checks, 'emergency-runway route now uses its dedicated deterministic engine', runwayRoute.status === 'READY_FOR_ADAPTERS' && runwayRoute.engineIds.length === 1 && runwayRoute.engineIds[0] === 'emergency-fund-runway' && runwayRoute.engineStatus.every(item => item.status === 'READY_WITH_ADAPTER')); 
  const borrowingRoute = Router.resolve({ text:'What is my DTI and can I afford another loan payment?' });
  add(checks, 'borrowing-health intent now routes to its dedicated deterministic engine', borrowingRoute.intent === Router.INTENTS.BORROWING_HEALTH && borrowingRoute.route.status === 'READY_FOR_ADAPTERS' && borrowingRoute.route.engineIds[0] === 'debt-to-income-borrowing-health');
  const carRoute = Router.routeForIntent(Router.INTENTS.CAR_AFFORDABILITY);
  add(checks, 'car-affordability journey is ready now that its deterministic engine exists', carRoute.status === 'READY_FOR_ADAPTERS' && carRoute.engineIds?.[0] === 'car-affordability' && Catalog.get('car-affordability')?.status === 'READY_WITH_ADAPTER');

  const comparison = Scenarios.compare({
    a:{ id:'baseline', currency:'INR', metrics:{ monthlyCost:22000, endingValue:100000 } },
    b:{ id:'option-b', currency:'INR', metrics:{ monthlyCost:18000, endingValue:120000 } },
    metrics:[
      { key:'monthlyCost', preference:'lower' },
      { key:'endingValue', preference:'higher' }
    ]
  });
  add(checks, 'scenario comparison separates metric winners without making a financial recommendation', comparison.metrics.every(metric => metric.winner === 'b'));
  let currencyMismatchRejected = false;
  try { Scenarios.compare({ a:{ currency:'USD', metrics:{} }, b:{ currency:'INR', metrics:{} }, metrics:[] }); } catch { currencyMismatchRejected = true; }
  add(checks, 'scenario comparison blocks silent cross-currency comparisons', currencyMismatchRejected);

  const high = Confidence.evaluate({ requirementStatus:{ missing:[], excluded:[], estimated:[] }, assumptions:[], sensitivity:'low' });
  const moderate = Confidence.evaluate({ requirementStatus:{ missing:[], excluded:[], estimated:['investing.expectedReturn'] }, assumptions:[], sensitivity:'moderate' });
  const low = Confidence.evaluate({ requirementStatus:{ missing:['cashFlow.monthlyIncome'], excluded:[], estimated:[] }, assumptions:[], sensitivity:'low' });
  add(checks, 'confidence levels distinguish complete, estimated and missing inputs', high.level === 'High' && moderate.level === 'Moderate' && low.level === 'Low');

  let planCtx = Context.create({ region:'IN', currency:'INR', now:'2026-11-07T00:00:00.000Z' });
  planCtx = Context.setFact(planCtx, 'resilience.liquidSavings', 150000, { origin:'user', now:'2026-11-07T00:00:01.000Z' });
  const plan = Core.planResolution({ text:'How many months can my emergency fund last if I lose my job?', context:planCtx });
  add(checks, 'orchestrator asks only for missing emergency-runway facts before engine execution', plan.status === 'NEEDS_INPUT' && plan.missingFacts.length === 1 && plan.missingFacts[0] === 'cashFlow.essentialExpenses' && !plan.missingFacts.includes('resilience.liquidSavings')); 

  const allSource = FRE_FILES.map(file => fs.readFileSync(path.join(dir, file), 'utf8')).join('\n');
  add(checks, 'Batch 1A FRE core makes no network or browser-storage calls', !/\b(fetch|XMLHttpRequest|localStorage|sessionStorage|indexedDB)\b/.test(allSource));

  const htmlFiles = fs.readdirSync(path.join(sourceRoot, 'draw004.github.io')).filter(name => name.endsWith('.html'));
  const frePublicPages = htmlFiles.filter(name => fs.readFileSync(path.join(sourceRoot, 'draw004.github.io', name), 'utf8').includes('/assets/fre/'));
  add(checks, 'FRE public wiring remains limited to the approved Batch 3B Ask Carrowmont page', frePublicPages.length === 1 && frePublicPages[0] === 'ask-carrowmont.html');

  return checks;
}
