import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function loadBrowserCore(file, globals = {}) {
  const code = fs.readFileSync(file, 'utf8');
  const sandbox = { window:{ ...globals }, console, Date };
  sandbox.globalThis = sandbox.window;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename:file });
  return sandbox.window;
}

export function runFreBatch12B4LumpSumGoalTradeoffsContract(root) {
  const checks=[]; const add=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail});
  const read=rel=>{const p=path.join(root,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const main=path.join(root,'draw004.github.io');
  const engineFile=path.join(main,'assets/fre/lump-sum-goal-tradeoffs.js');
  add('lump-sum trade-off decision engine exists',fs.existsSync(engineFile));
  if(!fs.existsSync(engineFile))return checks;

  const Emergency=require(path.join(main,'emergency-fund-runway-core.js'));
  const Goal=require(path.join(root,'goal-planner/core.js'));
  const Debt=loadBrowserCore(path.join(root,'budget-cash-flow-planner/debt-payoff-core.js')).CarrowmontDebtPayoffCore;
  const Compound=loadBrowserCore(path.join(root,'compound-interest-calculator/core.js')).CarrowmontCompoundCore;
  const Engine=require(engineFile);
  const api=Engine.create({emergency:Emergency,debtPayoff:Debt,goal:Goal,compound:Compound});

  const facts={
    lumpSumAmount:200000,
    essentialExpenses:20000,
    emergencySavings:50000,
    emergencyTargetMonths:3,
    debtBalance:50000,
    debtAprPct:18,
    debtMonthlyPayment:5000,
    goalTargetAmount:300000,
    goalCurrentSavings:50000,
    goalYearsAway:3,
    goalMonthlyContribution:3000,
    assumedLongTermReturnPct:7,
    investmentHorizonYears:10
  };
  const result=api.evaluate(facts,{currency:'INR'});
  add('same lump sum is compared across a transparent priority split and all available destinations',result.alternatives?.map(x=>x.id).join('|')==='priority-split|emergency-first|debt-first|goal-first|invest-first');
  add('priority split can allocate one lump sum across emergency debt goal and long-term investing',result.allocation?.emergencyAllocation>0&&result.allocation?.debtAllocation>0&&result.allocation?.goalAllocation>0&&result.allocation?.investmentAllocation>0,JSON.stringify(result.allocation));
  const debt=result.alternatives.find(x=>x.id==='debt-first');
  add('debt path reuses payoff math and reduces both balance and modeled interest when the payment amortizes',debt?.debtBalanceAfter<facts.debtBalance&&debt?.modeledInterestSaved>0&&debt?.modeledMonthsSaved>0);
  const goal=result.alternatives.find(x=>x.id==='goal-first');
  add('goal path reuses Goal Planner and improves funding without inventing a second goal formula',goal?.goalFundingPctAfter>goal?.goalFundingPctBefore&&goal?.goalGapAfter<goal?.goalGapBefore);
  const invest=result.alternatives.find(x=>x.id==='invest-first');
  add('long-term path reuses Compound Interest with user-entered horizon and return',invest?.investmentHorizonYears===10&&invest?.assumedLongTermReturnPct===7&&invest?.endingValue>facts.lumpSumAmount);
  add('debt only enters the modeled priority split when its APR is above the entered return assumption',api.evaluate({...facts,debtAprPct:5},{currency:'INR'}).allocation?.debtAllocation===0);
  add('engine output keeps the one-off amount explicit and explains assumption boundaries',result.importantNumbers?.lumpSumAmount===200000&&result.assumptions?.some(x=>x.id==='assumedLongTermReturnPct')&&result.whatCouldChangeAnswer?.length>=5&&result.confidence?.level==='MEDIUM_HIGH');
  const engineSource=read('draw004.github.io/assets/fre/lump-sum-goal-tradeoffs.js');
  add('decision engine has no network or browser persistence calls',!/(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB)/.test(engineSource));

  const Ask=require(path.join(main,'assets/fre/ask-carrowmont-mvp.js'));
  const Router=require(path.join(main,'assets/fre/intent-router.js'));
  const Budget=require(path.join(root,'budget-cash-flow-planner/core.js'));
  const Priority=require(path.join(main,'assets/fre/priority-framework.js'));
  const MoneyPriorities=require(path.join(main,'assets/fre/money-priorities.js'));
  const Car=require(path.join(main,'car-affordability-auto-decision-core.js'));
  const Loan=loadBrowserCore(path.join(root,'loan-calculator/core.js')).CarrowmontLoanCore;
  const Borrowing=require(path.join(main,'debt-to-income-borrowing-health-core.js'));
  const Mortgage=loadBrowserCore(path.join(root,'mortgage-payoff-calculator/core.js')).CarrowmontMortgageCore;
  const Mdc=loadBrowserCore(path.join(root,'mortgage-payoff-calculator/prepayment-vs-investing-core.js'),{CarrowmontMortgageCore:Mortgage}).CarrowmontMdc1aCore;
  const ask=Ask.create({router:Router,budget:Budget,emergency:Emergency,car:Car,loan:Loan,borrowing:Borrowing,debtPayoff:Debt,compound:Compound,mortgagePrepay:Mdc,goal:Goal,priorityFramework:Priority,moneyPriorities:MoneyPriorities,lumpSumTradeoffs:Engine});
  add('Ask exposes the lump-sum decision as the seventh controlled journey while preserving the established six',ask.SUPPORTED?.length>=7&&ask.SUPPORTED?.[5]?.intent==='money-priorities'&&ask.SUPPORTED?.[6]?.intent==='lump-sum-goal-tradeoffs');
  add('ordinary-language windfall questions route to the new guided journey without hijacking investing-timing questions',ask.classify('I received a bonus. What should I do with it?')?.intent==='lump-sum-goal-tradeoffs'&&ask.classify('Should I use my inheritance to pay debt or invest?')?.intent==='lump-sum-goal-tradeoffs'&&ask.classify('lump sum vs monthly investing')?.intent!=='lump-sum-goal-tradeoffs');
  const noDebtQuestions=ask.questionsFor('lump-sum-goal-tradeoffs',{debtBalance:0,goalTargetAmount:0}).map(x=>x.key);
  add('guided questions skip debt and goal details when the user enters zero for those paths',!noDebtQuestions.includes('debtAprPct')&&!noDebtQuestions.includes('debtMonthlyPayment')&&!noDebtQuestions.includes('goalCurrentSavings')&&!noDebtQuestions.includes('goalYearsAway')&&!noDebtQuestions.includes('goalMonthlyContribution'));
  const resolved=ask.resolve({intent:'lump-sum-goal-tradeoffs',currency:'INR',facts});
  add('Ask result resolves through the new decision engine and preserves the standard explanation contract',resolved.status==='RESOLVED'&&resolved.alternatives?.length===5&&resolved.trace?.map(x=>x.engineId).join('|')==='emergency-fund-runway|debt-payoff|goal-planner|compound-interest'&&resolved.recommendation?.headline&&resolved.nextSteps?.length);

  const html=read('draw004.github.io/ask-carrowmont.html');
  const ui=read('draw004.github.io/assets/ask/ask-carrowmont.js');
  const guide=read('draw004.github.io/what-to-do-with-a-lump-sum.html');
  const context=read('draw004.github.io/assets/account/carrowmont-ask-context.js');
  const store=read('draw004.github.io/assets/fre/dashboard-store.js');
  add('Ask page loads the engine before the Ask core and exposes a clear guided starter',html.includes('data-ask-intent="lump-sum-goal-tradeoffs"')&&html.includes('/assets/fre/lump-sum-goal-tradeoffs.js?v=20261121-fre12b4')&&html.indexOf('/assets/fre/lump-sum-goal-tradeoffs.js')<html.indexOf('/assets/fre/ask-carrowmont-mvp.js'));
  add('Learn guide deep-links directly into the new guided decision and records the new review date',guide.includes('/ask-carrowmont.html?decision=lump-sum-goal-tradeoffs')&&guide.includes('Reviewed 21 November 2026')&&guide.includes('"dateModified":"2026-11-21"'));
  add('Ask UI supports conditional progress, whole-year validation and all five comparison cards',ui.includes('api?.questionsFor?.(state.intent,state.facts)')&&ui.includes("state.intent==='lump-sum-goal-tradeoffs'?5:4")&&ui.includes('goalYearsAway|investmentHorizonYears')&&ui.includes('whole number of at least 1'));
  add('signed-in context may reuse compatible resilience goal and return facts but never invents or reuses the one-off lump sum or focused-debt scenario',context.includes("'lump-sum-goal-tradeoffs':Object.freeze")&&context.includes("goalTargetAmount:'goal.targetAmount'")&&!/['\"]lump-sum-goal-tradeoffs['\"][\s\S]{0,800}lumpSumAmount:/.test(context)&&!/['\"]lump-sum-goal-tradeoffs['\"][\s\S]{0,800}debtMonthlyPayment:/.test(context));
  add('explicit My Carrowmont save maps only reusable household facts and leaves the windfall amount and focused debt scenario session-only',store.includes("'lump-sum-goal-tradeoffs':Object.freeze")&&store.includes("emergencyTargetMonths:'resilience.targetMonths'")&&store.includes("goalTargetAmount:'goal.targetAmount'")&&!/['\"]lump-sum-goal-tradeoffs['\"][\s\S]{0,800}lumpSumAmount:/.test(store)&&!/['\"]lump-sum-goal-tradeoffs['\"][\s\S]{0,800}debtBalance:/.test(store));

  const tools=read('draw004.github.io/tools.html');
  const sitemap=read('draw004.github.io/sitemap.xml');
  const pages=JSON.parse(read('draw004.github.io/data/carrowmont-search-pages.json'));
  add('release adds no public tool or URL and keeps the reviewed 23-tool 145-page inventory',/"numberOfItems"\s*:\s*23/.test(tools)&&(tools.match(/class="directory-tool-card/g)||[]).length===23&&pages.entries?.length===145&&(sitemap.match(/<loc>/g)||[]).length===145&&!sitemap.includes('lump-sum-goal-tradeoffs.html'));
  add('changed Learn guide sitemap date is reconciled without changing its canonical URL',sitemap.includes('<loc>https://carrowmont.com/what-to-do-with-a-lump-sum.html</loc><lastmod>2026-11-21</lastmod>')&&guide.includes('<link rel="canonical" href="https://carrowmont.com/what-to-do-with-a-lump-sum.html"'));
  return checks;
}
