import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const add = (checks, name, ok, detail = '') => checks.push({ name, ok:Boolean(ok), detail });
const close = (actual, expected, tolerance = 1e-9) => Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected));

export function runFrePrimaryCoreParity(sourceRoot) {
  const checks = [];
  const files = {
    budget:'budget-cash-flow-planner/core.js',
    goal:'goal-planner/core.js',
    inflation:'inflation-calculator/core.js',
    retirement:'retirement-calculator/core.js'
  };
  add(checks, 'all four Batch 1B pure core modules exist', Object.values(files).every(rel => fs.existsSync(path.join(sourceRoot, rel))));
  if (!checks[0].ok) return checks;

  let Budget, Goal, Inflation, Retirement, AdapterContract, PrimaryAdapters;
  try {
    Budget = require(path.join(sourceRoot, files.budget));
    Goal = require(path.join(sourceRoot, files.goal));
    Inflation = require(path.join(sourceRoot, files.inflation));
    Retirement = require(path.join(sourceRoot, files.retirement));
    AdapterContract = require(path.join(sourceRoot, 'draw004.github.io/assets/fre/engine-adapters.js'));
    PrimaryAdapters = require(path.join(sourceRoot, 'draw004.github.io/assets/fre/primary-engine-adapters.js'));
    add(checks, 'four extracted cores and primary FRE adapters load in Node isolation', true);
  } catch (error) {
    add(checks, 'four extracted cores and primary FRE adapters load in Node isolation', false, error.message);
    return checks;
  }

  add(checks, 'core APIs expose stable versioned deterministic entry points',
    Budget.VERSION === 'BUDGET-CORE-1.0' && typeof Budget.calculate === 'function' &&
    Goal.VERSION === 'GOAL-CORE-1.0' && typeof Goal.calculate === 'function' &&
    Inflation.VERSION === 'INFLATION-CORE-1.0' && typeof Inflation.calculate === 'function' &&
    Retirement.VERSION === 'RETIREMENT-CORE-1.0' && typeof Retirement.calculatePlan === 'function'
  );

  const budgetState = {
    incomes:[{amount:120000,frequency:'monthly'},{amount:12000,frequency:'quarterly'}],
    essential:[{amount:30000,frequency:'monthly'},{amount:6000,frequency:'monthly'},{amount:36000,frequency:'annual'},{amount:6500,frequency:'monthly'}],
    flexible:[{amount:15000,frequency:'monthly'},{amount:8500,frequency:'monthly'},{amount:5000,frequency:'monthly'}],
    savings:[{amount:10000,frequency:'monthly'},{amount:5000,frequency:'monthly'}],
    emergencyCurrent:180000, emergencyTargetMonths:6, primaryPayFrequency:'biweekly'
  };
  const budget = Budget.calculate(budgetState);
  add(checks, 'Budget core preserves locked pre-extraction monthly-equivalent fixture',
    close(budget.income,124000) && close(budget.essential,45500) && close(budget.flexible,28500) && close(budget.saving,15000) && close(budget.reserves,3000) && close(budget.remaining,35000) && close(budget.savingsRate,12.096774193548388) && close(budget.emergencyGap,93000) && close(budget.cycleRoom,16153.846153846158)
  );
  add(checks, 'Budget core preserves weekly/daily and emergency coverage outputs', close(budget.weekly,8076.923076923077) && close(budget.daily,1149.9209429351731) && close(budget.coverage,3.956043956043956) && close(budget.targetAmount,273000));

  const goalA = Goal.calculate({today:2500000,inflation:.07,years:12,existing:500000,ret:.10,monthly:8000,contributionFrequency:'monthly',futureLump:0,futureLumpYear:0});
  add(checks, 'Goal core preserves approved education fixture exactly', close(goalA.futureCost,5630478.972402062) && close(goalA.projected,3714577.336438383) && close(goalA.monthlyRequired,15144.34435095136) && close(goalA.additional,7144.34435095136) && close(goalA.funding,0.6597267043612949));
  const goalB = Goal.calculate({today:100000,inflation:0,years:2,existing:0,ret:0,monthly:1000,contributionFrequency:'weekly',futureLump:0,futureLumpYear:0});
  add(checks, 'Goal core preserves 52-period weekly contribution semantics', close(goalB.af,104) && close(goalB.projected,104000) && close(goalB.monthlyRequired,961.5384615384615));
  const goalC = Goal.calculate({today:1500000,inflation:.05,years:7,existing:200000,ret:.08,monthly:5000,contributionFrequency:'biweekly',futureLump:300000,futureLumpYear:3});
  add(checks, 'Goal core preserves future lump-sum timing and biweekly fixture', close(goalC.lumpFuture,408146.6880000001) && close(goalC.projected,1954895.7873208374) && close(goalC.gap,155754.84666353837));

  const inflationA = Inflation.calculate({amount:100000,years:20,rate:5});
  add(checks, 'Inflation core preserves locked 5 percent 20-year fixture', close(inflationA.future,265329.77051444224) && close(inflationA.sameNominalToday,37688.94828730004) && close(inflationA.increase,165.32977051444223) && close(inflationA.remaining,37.688948287300036));
  const inflationB = Inflation.calculate({amount:1000,years:10,rate:0});
  add(checks, 'Inflation core preserves zero-inflation identity case', inflationB.factor === 1 && inflationB.future === 1000 && inflationB.sameNominalToday === 1000 && inflationB.remaining === 100 && inflationB.doublingYears === null);

  const quick = {mode:'quick',currentAge:35,retirementAge:60,planningAge:90,currentSavings:1000000,currentMonthlyInvestment:20000,payFrequency:'monthly',contributionFrequency:'monthly',sameAsPayCycle:true,preReturn:10,postReturn:7.5,bufferRate:10,quickMonthlyExpense:90000,quickRetirementPct:65,quickInflation:5,generalInflation:5,healthInflation:7,lifestyleInflation:5,educationInflation:7,phase1Pct:110,phase2Pct:90,phase3Pct:70,expenses:[],incomes:[],goals:[]};
  const rq = Retirement.calculatePlan(quick);
  add(checks, 'Retirement core preserves approved quick-mode corpus fixture exactly', close(rq.requiredCorpus,56325097.776442125) && close(rq.projectedCorpus,35501203.934170485) && close(rq.totalMonthlyNeeded,36884.353709272844) && close(rq.extraMonthlyNeeded,16884.353709272844) && close(rq.fundedPct,63.0291030742228));
  add(checks, 'Retirement core preserves quick-mode depletion and contribution timing', close(rq.projectedDepletionAge,78.33333333333333) && rq.contributionPeriods === 300 && rq.contributionPeriodsPerYear === 12 && close(rq.retirementLifestyleFuture,198101.7640426142));

  const detailed = {mode:'detailed',currentAge:40,retirementAge:60,planningAge:85,currentSavings:2000000,currentMonthlyInvestment:15000,payFrequency:'monthly',contributionFrequency:'monthly',sameAsPayCycle:true,preReturn:9,postReturn:6.5,bufferRate:8,quickMonthlyExpense:0,quickRetirementPct:65,quickInflation:5,generalInflation:5,healthInflation:7,lifestyleInflation:4,educationInflation:6,phase1Pct:110,phase2Pct:90,phase3Pct:75,expenses:[{name:'Groceries',amount:20000,inflationType:'general',rule:'adjust',setting:100},{name:'Healthcare',amount:5000,inflationType:'health',rule:'adjust',setting:120},{name:'Mortgage',amount:25000,inflationType:'general',rule:'end',setting:55},{name:'Travel',amount:8000,inflationType:'lifestyle',rule:'adjust',setting:110},{name:'Hobby',amount:3000,inflationType:'lifestyle',rule:'start',setting:80}],incomes:[{name:'Pension',amount:25000,startAge:60,growth:2}],goals:[{name:'Family goal',amount:500000,age:65,inflationType:'general'},{name:'Education support',amount:1000000,age:62,inflationType:'education'}]};
  const rd = Retirement.calculatePlan(detailed);
  add(checks, 'Retirement core preserves detailed expenses income goals and buffer fixture', close(rd.requiredCorpus,28093990.33963403) && close(rd.projectedCorpus,20791597.066389296) && close(rd.goalsPV,4412910.002646227,1e-8) && close(rd.firstYearIncome,25228.34729251526) && rd.expenseChanges.length === 5);
  add(checks, 'Retirement core preserves lifestyle/end/start rules and detailed depletion', close(rd.retirementLifestyleToday,38320) && close(rd.monthlyReduced,25000) && close(rd.monthlyIncreased,5320.000000000002) && close(rd.projectedDepletionAge,78.41666666666667));

  const registry = AdapterContract.createRegistry();
  PrimaryAdapters.registerAll(registry, { budget:Budget, goal:Goal, inflation:Inflation, retirement:Retirement });
  add(checks, 'primary adapter bundle registers all four extracted engines', ['budget-cash-flow','goal-planner','inflation','retirement'].every(id => registry.has(id)));
  const budgetEnvelope = registry.run('budget-cash-flow',{currency:'INR',inputs:{state:budgetState}});
  const goalEnvelope = registry.run('goal-planner',{currency:'INR',inputs:{state:{today:100000,inflation:0,years:2,existing:0,ret:0,monthly:1000,contributionFrequency:'weekly',futureLump:0,futureLumpYear:0}}});
  const inflationEnvelope = registry.run('inflation',{currency:'USD',inputs:{amount:100000,years:20,rate:5}});
  const retirementEnvelope = registry.run('retirement',{currency:'INR',inputs:{state:quick}});
  add(checks, 'primary adapters expose standard formula-free envelopes from the extracted cores', budgetEnvelope.metrics.remaining === 35000 && goalEnvelope.metrics.projected === 104000 && close(inflationEnvelope.metrics.futureValue,265329.77051444224) && close(retirementEnvelope.metrics.requiredCorpus,56325097.776442125));

  const integrations = [
    ['budget-cash-flow-planner/index.html','budget-cash-flow-planner/app.js','CarrowmontBudgetCore'],
    ['goal-planner/index.html','goal-planner/app.js','CarrowmontGoalCore'],
    ['inflation-calculator/index.html','inflation-calculator/app.js','CarrowmontInflationCore'],
    ['retirement-calculator/planner.html','retirement-calculator/app.js','CarrowmontRetirementCore']
  ];
  for (const [htmlRel, appRel, apiName] of integrations) {
    const html = fs.readFileSync(path.join(sourceRoot, htmlRel),'utf8');
    const app = fs.readFileSync(path.join(sourceRoot, appRel),'utf8');
    const corePos = html.indexOf('core.js?v=20261107.fre1b');
    const appPos = html.indexOf('app.js?v=20261107.fre1b');
    add(checks, `${appRel} loads its extracted core before the UI app`, corePos >= 0 && appPos > corePos && app.includes(`window.${apiName}`));
  }

  const coreSource = Object.values(files).map(rel => fs.readFileSync(path.join(sourceRoot,rel),'utf8')).join('\n');
  add(checks, 'extracted financial cores remain pure with no DOM storage or network calls', !/\b(document|window|fetch|XMLHttpRequest|localStorage|sessionStorage|indexedDB)\b/.test(coreSource));

  const docs = ['draw004.github.io/docs/CARROWMONT_FRE_BATCH1B_ACCEPTANCE_LEDGER.md','draw004.github.io/docs/CARROWMONT_FRE_BATCH1B_PRIMARY_CORE_EXTRACTION.md','draw004.github.io/docs/CARROWMONT_FRE_ENGINE_REGISTRY_V3.json'];
  add(checks, 'Batch 1B continuity record ledger and Engine Registry V3 exist', docs.every(rel => fs.existsSync(path.join(sourceRoot,rel))));
  if (docs.every(rel => fs.existsSync(path.join(sourceRoot,rel)))) {
    const registryV3 = JSON.parse(fs.readFileSync(path.join(sourceRoot,docs[2]),'utf8'));
    const extracted = registryV3.engines.filter(engine => ['budget-cash-flow','goal-planner','inflation','retirement'].includes(engine.id));
    add(checks, 'Engine Registry V3 records all four extracted engines as READY_WITH_ADAPTER', registryV3.schema_version === 3 && extracted.length === 4 && extracted.every(engine => engine.status === 'READY_WITH_ADAPTER' && engine.engine_file === 'core.js' && engine.api));
  }

  return checks;
}
