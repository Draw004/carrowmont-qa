import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const qaRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadBrowserCore(file, globals = {}) {
  const code = fs.readFileSync(file, 'utf8');
  const sandbox = { window:{ ...globals }, console, Date };
  sandbox.globalThis = sandbox.window;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename:file });
  return sandbox.window;
}

export function runFreAskMvpContract(root) {
  const checks=[]; const add=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail});
  const main=path.join(root,'draw004.github.io');
  const askFile=path.join(main,'assets/fre/ask-carrowmont-mvp.js');
  add('Ask MVP journey core exists', fs.existsSync(askFile));
  if (!fs.existsSync(askFile)) return checks;

  const Router=require(path.join(main,'assets/fre/intent-router.js'));
  const Budget=require(path.join(root,'budget-cash-flow-planner/core.js'));
  const Emergency=require(path.join(main,'emergency-fund-runway-core.js'));
  const Car=require(path.join(main,'car-affordability-auto-decision-core.js'));
  const loanWindow=loadBrowserCore(path.join(root,'loan-calculator/core.js'));
  const Loan=loanWindow.CarrowmontLoanCore;
  const Borrowing=require(path.join(main,'debt-to-income-borrowing-health-core.js'));
  const debtWindow=loadBrowserCore(path.join(root,'budget-cash-flow-planner/debt-payoff-core.js'));
  const compoundWindow=loadBrowserCore(path.join(root,'compound-interest-calculator/core.js'));
  const mortgageWindow=loadBrowserCore(path.join(root,'mortgage-payoff-calculator/core.js'));
  const mdcWindow=loadBrowserCore(path.join(root,'mortgage-payoff-calculator/prepayment-vs-investing-core.js'), { CarrowmontMortgageCore:mortgageWindow.CarrowmontMortgageCore });
  const Ask=require(askFile);
  const api=Ask.create({ router:Router, budget:Budget, emergency:Emergency, car:Car, loan:Loan, borrowing:Borrowing, debtPayoff:debtWindow.CarrowmontDebtPayoffCore, compound:compoundWindow.CarrowmontCompoundCore, mortgagePrepay:mdcWindow.CarrowmontMdc1aCore });

  add('MVP exposes exactly five controlled journeys', api.SUPPORTED.length===5 && new Set(api.SUPPORTED.map(x=>x.intent)).size===5);
  add('ordinary-language cash-shortfall text is recognized deterministically', api.classify('I keep running out of money before payday').intent===api.INTENTS.CASH_FLOW_SHORTFALL);
  const missing=api.resolve({ intent:api.INTENTS.CAR_AFFORDABILITY, facts:{ vehiclePrice:25000 } });
  add('missing-fact response asks at most three questions and does not execute early', missing.status==='NEEDS_INPUT' && missing.questions.length===3 && missing.questions.every(q=>q.key!=='vehiclePrice'));

  const emergency=api.resolve({ intent:api.INTENTS.EMERGENCY_RUNWAY, currency:'USD', facts:{ essentialExpenses:3000, emergencySavings:9000 } });
  add('emergency-fund journey resolves through deterministic engine with trace', emergency.status==='RESOLVED' && emergency.importantNumbers.runwayMonths===3 && emergency.trace?.[0]?.engineId==='emergency-fund-runway');

  const cash=api.resolve({ intent:api.INTENTS.CASH_FLOW_SHORTFALL, currency:'USD', facts:{ monthlyIncome:4000, essentialExpenses:3000, flexibleExpenses:1500 } });
  add('payday shortfall journey uses Budget core and detects negative monthly room', cash.status==='RESOLVED' && cash.importantNumbers.remaining===-500 && cash.trace?.[0]?.engineId==='budget-cash-flow');

  const car=api.resolve({ intent:api.INTENTS.CAR_AFFORDABILITY, currency:'USD', facts:{ vehiclePrice:25000, takeHomeMonthlyIncome:5500, essentialMonthlyExpenses:2500, annualRate:7, termMonths:60, monthlyRunningCosts:350, emergencySavings:12000 } });
  add('car journey calls existing Car Affordability engine', car.status==='RESOLVED' && car.trace?.[0]?.engineId==='car-affordability' && Number.isFinite(car.importantNumbers.monthlyLoanPayment));

  const debt=api.resolve({ intent:api.INTENTS.DEBT_VS_SAVINGS, currency:'USD', facts:{ debtBalance:5000, debtAprPct:20, debtMinimumPayment:150, monthlySurplus:200, emergencySavings:3000, essentialExpenses:2500, assumedSavingsReturnPct:6 } });
  add('debt-versus-savings journey calls emergency, debt-payoff and compound-interest engines', debt.status==='RESOLVED' && debt.trace?.map(x=>x.engineId).join('|')==='emergency-fund-runway|debt-payoff|compound-interest' && debt.importantNumbers.modeledInterestSaved>0);

  const mortgage=api.resolve({ intent:api.INTENTS.MORTGAGE_PREPAY_VS_INVEST, currency:'USD', country:'US', startDate:'2026-11-09', facts:{ mortgageBalance:200000, mortgageRatePct:5, remainingYears:20, extraAmount:10000, assumedInvestmentReturnPct:7 } });
  add('mortgage journey calls existing Mortgage Prepay vs Invest core', mortgage.status==='RESOLVED' && mortgage.trace?.[0]?.engineId==='mortgage-prepay-vs-invest' && mortgage.importantNumbers.assumedReturnPct===7);

  for (const result of [emergency,cash,car,debt,mortgage]) {
    add(`resolved ${result.intent} returns the standard explanation contract`, Boolean(result.situation && result.diagnosis && result.importantNumbers && result.alternatives && result.nextSteps && result.assumptions && result.trace));
    add(`resolved ${result.intent} returns an answer-first resolution contract`, Boolean(result.recommendation?.headline && result.recommendation?.action && result.recommendation?.rationale && result.confidence?.level && result.confidence?.basis && result.whatCouldChangeAnswer?.length));
  }
  add('emergency journey prioritizes resilience when runway is below one month', api.resolve({ intent:api.INTENTS.EMERGENCY_RUNWAY, currency:'USD', facts:{ essentialExpenses:3000, emergencySavings:500 } }).recommendation?.headline.includes('first cash buffer'));
  add('cash-flow journey gives a corrective resolution when monthly room is negative', cash.recommendation?.headline.includes('deficit') && cash.whatCouldChangeAnswer.length>=3);
  add('car journey gives an affordability resolution rather than only calculator output', Boolean(car.recommendation?.headline && car.confidence?.level==='MEDIUM_HIGH'));
  add('debt-versus-savings journey favors high-cost debt when buffer exists and debt APR exceeds modeled return', debt.recommendation?.headline.includes('debt') && debt.recommendation?.headline.includes('stronger'));
  add('mortgage journey states which modeled path is stronger or tied', /stronger modeled path|approximately tied/.test(mortgage.recommendation?.headline||''));

  const source=fs.readFileSync(askFile,'utf8');
  add('Ask MVP core makes no network or persistence calls', !/\b(fetch|XMLHttpRequest|localStorage|sessionStorage|indexedDB)\b/.test(source));
  const tools=fs.readFileSync(path.join(main,'tools.html'),'utf8');
  add('Batch 3A does not change public Tools Hub count', /"numberOfItems"\s*:\s*23/.test(tools) && (tools.match(/class="directory-tool-card/g)||[]).length===23);
  const qaConfig=fs.readFileSync(path.join(qaRoot,'qa.config.js'),'utf8');
  add('Batch 3A core remains compatible with the Batch 3B public-page inventory', /search1ExpectedPublicPages\s*=\s*137/.test(qaConfig));
  const registry=JSON.parse(fs.readFileSync(path.join(main,'docs/CARROWMONT_FRE_ENGINE_REGISTRY_V9.json'),'utf8'));
  add('Engine Registry V9 records Batch 3A without changing engine count', registry.schema_version===9 && registry.engines?.length===26 && registry.fre_batch3a?.controlled_journeys?.length===5 && registry.fre_batch3a?.public_url===null);
  add('Batch 3A documentation and ledger exist', fs.existsSync(path.join(main,'docs/CARROWMONT_FRE_BATCH3A_ASK_CARROWMONT_MVP_CORE.md')) && fs.existsSync(path.join(main,'docs/CARROWMONT_FRE_BATCH3A_ACCEPTANCE_LEDGER.md')));
  return checks;
}
