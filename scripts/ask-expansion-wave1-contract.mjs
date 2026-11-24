import fs from 'node:fs';
import path from 'node:path';

export function runAskExpansionWave1Contract(root){
  const checks=[]; const add=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail});
  const read=rel=>{const p=path.join(root,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const main='draw004.github.io/';
  const html=read(main+'ask-carrowmont.html');
  const core=read(main+'assets/fre/ask-carrowmont-mvp.js');
  const ui=read(main+'assets/ask/ask-carrowmont.js');
  const css=read(main+'assets/ask/ask-carrowmont.css');
  const context=read(main+'assets/account/carrowmont-ask-context.js');
  const store=read(main+'assets/fre/dashboard-store.js');
  const status=read(main+'docs/CARROWMONT_CURRENT_PROJECT_STATUS.md');
  const impl=read(main+'docs/CARROWMONT_ASK_EXPANSION_WAVE1_IMPLEMENTATION.md');
  const ledger=read(main+'docs/CARROWMONT_ASK_EXPANSION_WAVE1_ACCEPTANCE_LEDGER.md');
  const browser=read('carrowmont-qa/tests/61-fre3b-ask-carrowmont.spec.js');

  const intents=['debt-vs-savings','car-affordability','mortgage-prepay-vs-invest','emergency-runway','cash-flow-shortfall','money-priorities','lump-sum-goal-tradeoffs','borrowing-health','home-affordability','debt-payoff','credit-card-payoff','retirement-readiness','goal-funding'];
  const newIntents=['borrowing-health','home-affordability','debt-payoff','credit-card-payoff','retirement-readiness','goal-funding'];
  add('Wave 1 core exposes exactly thirteen unique controlled Ask journeys',intents.every(intent=>core.includes(`intent:INTENTS.${intent.replace(/-/g,'_').toUpperCase()}`)||core.includes(`'${intent}'`)) && (core.match(/Object\.freeze\(\{ intent:INTENTS\./g)||[]).length===13);
  add('Wave 1 public start screen exposes every controlled journey exactly once',intents.every(intent=>(html.match(new RegExp(`data-ask-intent="${intent}"`,'g'))||[]).length===1));
  add('Wave 1 start screen organizes decisions into four user-oriented groups', ['Everyday stability','Debt decisions','Big goals','Trade-offs'].every(x=>html.includes(x)) && (html.match(/class="ask-decision-group"/g)||[]).length===4 && css.includes('.ask-decision-group'));
  add('Wave 1 loads the additional existing deterministic cores before the Ask core', ['/budget-cash-flow-planner/credit-card-payoff-core.js','/retirement-calculator/core.js','/home-affordability-calculator-core.js'].every(src=>html.includes(src)) && html.indexOf('/retirement-calculator/core.js')<html.indexOf('/assets/fre/ask-carrowmont-mvp.js'));
  add('Wave 1 routes all six new journeys to deterministic engine functions rather than network services', newIntents.every(intent=>core.includes(`'${intent}'`)) && !/\b(fetch|XMLHttpRequest|WebSocket|indexedDB|localStorage|sessionStorage)\b/.test(core));
  add('Borrowing and home journeys preserve lender-approval boundaries and a higher-rate home sensitivity', /lender approval/i.test(core) && /(not|does not)/i.test(core) && /planning ceiling/i.test(core) && /\+2 percentage-point rate stress check/.test(core));
  add('Retirement and goal journeys keep inflation and return assumptions explicit rather than hidden', ['retirementInflationPct','retirementPreReturnPct','retirementPostReturnPct','retirementBufferPct','goalReturnPct','goalInflationPct'].every(key=>core.includes(key)) && ui.includes('I don’t know — use a 5% illustration'));
  add('Wave 1 detail links route each new answer to its matching full Carrowmont tool', ['/debt-to-income-borrowing-health-calculator.html','/home-affordability-calculator.html','/budget-cash-flow-planner/debt-payoff-calculator.html','/budget-cash-flow-planner/credit-card-payoff-calculator.html','/retirement-calculator/','/goal-planner/'].every(url=>ui.includes(url)));
  add('Wave 1 blocks nonsensical positive-value and retirement-age relationships before engine execution', ui.includes('function journeyValidationIssue') && ui.includes("goal amount greater than 0") && ui.includes('Target retirement age must be greater than current age') && ui.includes('plan-through age of 110 or less') && browser.includes('blocks nonsensical goal and retirement inputs before running an engine'));
  add('Goal Funding replaces generic optional-goal zero guidance with journey-specific positive-goal guidance', ui.includes("state.intent==='goal-funding'&&key==='goalTargetAmount'") && ui.includes('goal cost in today’s money') && ui.includes("state.intent==='goal-funding'&&key==='goalYearsAway'"));
  add('Wave 1 account context reuses only mapped compatible profile facts for all six new journeys', newIntents.every(intent=>context.includes(`'${intent}'`)) && context.includes("grossMonthlyIncome:'cashFlow.grossIncome'") && context.includes("cardMinimumPayment:'debt.creditCardMinimums'") && context.includes("retirementCurrentSavings:'retirement.currentSavings'"));
  add('Wave 1 explicit-save mappings omit scenario-specific proposed borrowing home and retirement-planning facts', newIntents.every(intent=>store.includes(`'${intent}'`)) && !/proposedNewDebtPayment:'/.test(store) && !/homeDeposit:'/.test(store) && !/retirementPlanningAge:'/.test(store) && !/cardTargetMonths:'/.test(store));
  add('Wave 1 browser QA covers grouped discovery and every newly added guided journey', browser.includes('groups thirteen unique guided decisions') && browser.includes('resolves all six new journeys through their existing deterministic engines') && newIntents.every(intent=>browser.includes(`'${intent}'`)));
  add('Wave 1 continuity documents record research rationale advice boundaries release gates and Learn Hub 2.0 as next', Boolean(impl&&ledger) && impl.includes('External benchmark research') && impl.includes('Guidance is not individualized regulated advice') && impl.includes('Learn Hub 2.0') && ledger.includes('Publisher -> merge -> QA -> Guard -> Source Snapshot') && status.includes('Ask Carrowmont Expansion Wave 1'));
  add('Wave 1 preserves product inventory and defers connected-data/native-app work', status.includes('Batch 13B')&&status.includes('ON HOLD')&&status.includes('Batch 14')&&status.includes('traffic/usage-gated') && impl.includes('no public URL or tool-directory count increase'));
  return checks;
}
