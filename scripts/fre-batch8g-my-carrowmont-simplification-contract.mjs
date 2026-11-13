import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);

export function runFreBatch8gMyCarrowmontSimplificationContract(root){
  const checks=[];const add=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail});
  const read=rel=>{const p=path.join(root,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const main='draw004.github.io';
  const page=read(`${main}/my-carrowmont.html`),ui=read(`${main}/assets/dashboard/my-carrowmont.js`),css=read(`${main}/assets/dashboard/my-carrowmont.css`),accountUi=read(`${main}/assets/account/my-carrowmont-account.js`);
  const askHtml=read(`${main}/ask-carrowmont.html`),askUi=read(`${main}/assets/ask/ask-carrowmont.js`),askCore=read(`${main}/assets/fre/ask-carrowmont-mvp.js`);
  const debtCore=read('budget-cash-flow-planner/debt-payoff-core.js'),debtUi=read('budget-cash-flow-planner/debt-payoff-calculator.js'),debtCss=read('budget-cash-flow-planner/debt-payoff-calculator.css');
  const store=require(path.join(root,main,'assets/fre/dashboard-store.js'));

  add('8G dashboard presents only three primary money sections before saved plans',
    ['mycmCashFlowCard','mycmEmergencyCard','mycmDebtCard'].every(id=>page.includes(`id="${id}"`))&&
    !['mycmBorrowingCard','mycmRetirementCard','mycmGoalCard','mycmFiCard','mycmPrioritiesCard'].some(id=>page.includes(`id="${id}"`))&&
    page.includes('Your money at a glance'));
  add('8G merges mortgage and general debt into one user-facing Debt & loans section',page.includes('Debt &amp; loans')&&ui.includes("card('Debt & loans'")&&!page.includes('Mortgage & loan burden'));
  add('8G uses monthly income received as primary household income and keeps gross income advanced-only',
    ui.includes("path:'cashFlow.takeHomeIncome',label:'Monthly income you receive'")&&
    ui.includes("path:'cashFlow.grossIncome',label:'Income before tax'")&&
    !ui.match(/monthly:\{[^}]*cashFlow\.grossIncome/s));
  add('8G debt card shows plain debt-payment share of monthly income without calling it lender DTI',ui.includes('of your monthly income goes toward debt payments')&&!/debt-to-income|\bDTI\b/i.test(ui));
  add('8G uses focused editors for monthly money emergency savings and debt',
    ui.includes("monthly:{title:'Update monthly money'")&&ui.includes("emergency:{title:'Update emergency savings'")&&ui.includes("debt:{title:'Update debt & loans'")&&
    page.includes('Update only the section you need.'));
  add('8G explicit removal uses removeFact and requests immediate account persistence while blank inputs remain no-change',
    ui.includes('profile=Store.removeFact(profile,path);persist(true,true)')&&ui.includes("if(input.value==='')return")&&ui.includes('data-mycm-remove')&&
    accountUi.includes('event.detail.saveImmediately===true')&&accountUi.includes('void (async()=>')&&accountUi.includes('Account.saveCloudProfile(profile)'));
  add('8G keeps the saved-plan concept model visible by default while remaining collapsible',page.includes('<details class="mycm-plan-model" open>')&&['Current details','Saved plan','What-if calculation','Progress history'].every(label=>page.includes(`<strong>${label}</strong>`)));
  let p=store.create({region:'US',currency:'USD'});p=store.setFact(p,'cashFlow.flexibleExpenses',35000,{source:'8g-contract'});p=store.removeFact(p,'cashFlow.flexibleExpenses');
  add('8G removed facts stay absent after normalization',!store.hasFact(store.normalize(p),'cashFlow.flexibleExpenses',{includeExcluded:true}));
  add('8G emergency target is user-selected 2 3 6 or custom and excludes flexible spending',
    ui.includes('[2,3,6].map')&&ui.includes("value=\"custom\"")&&ui.includes('starting suggestion')&&ui.includes('essential monthly expenses + required debt payments')&&ui.includes('Other monthly spending is not included.'));
  add('8G emergency target math reuses deterministic emergency core with debt payments included',
    ui.includes('CarrowmontEmergencyFundCore.calculate')&&ui.includes('essentialExpenses:num(value(\'cashFlow.essentialExpenses\'))')&&ui.includes('debtPayments:debt.value'));
  add('8G dashboard keeps advanced saved details available without making them the primary workflow',page.includes('<details class="mycm-knows"')&&page.includes('Review all saved details')&&ui.includes('data-mycm-influence'));
  add('8G advanced saved-details Remove action uses a distinct selector from focused-editor Remove controls',
    ui.includes('data-mycm-saved-remove')&&ui.includes("closest('[data-mycm-saved-remove]')")&&
    !ui.includes('mycm-button mycm-button-danger\" type=\"button\" data-mycm-remove=\"${esc(path)}'));
  add('8G dashboard responsive contract protects primary cards focused target choices and long values',
    css.includes('.mycm-primary-grid{grid-template-columns:repeat(3')&&css.includes('@media(max-width:980px)')&&css.includes('.mycm-primary-grid{grid-template-columns:1fr}')&&css.includes('overflow-wrap:anywhere'));

  add('8G renames the guided decision to Pay debt or invest while preserving the internal intent key',
    askHtml.includes('data-ask-intent="debt-vs-savings">Pay debt or invest?</button>')&&askCore.includes("DEBT_VS_SAVINGS:'debt-vs-savings'")&&askCore.includes("label:'Pay debt or invest?'")&&askUi.includes("'debt-vs-savings':'Pay debt or invest?'"));
  add('8G dashboard deep-links only the decision key and preserves the private Ask-to-Search handoff rule',
    page.includes('/ask-carrowmont.html?decision=debt-vs-savings')&&askUi.includes("new URL(window.location.href).searchParams.get('decision')")&&!/\?q=|URLSearchParams/.test(askUi));
  add('8G debt-versus-invest comparison uses the same monthly outflow and ending month for both paths',
    askCore.includes('function compareDebtVsInvestPaths')&&askCore.includes('const totalMonthlyOutflow = Math.max(0, debt.totalMonthlyBudget)')&&askCore.includes('const horizonMonths = Math.max(1, investFirst.monthly.length')&&askCore.includes('totalMonthlyOutflow - debtPaid'));
  add('8G debt-versus-invest copy distinguishes contractual debt math from assumed investment returns',
    askCore.includes('investment growth uses your return assumption and is not guaranteed')&&askCore.includes('same total monthly outflow and the same ending month')&&askHtml.includes('Should I pay down debt or invest it?'));

  let core=null;try{const sandbox={window:{},console,Math,Number,String,Object,Array,Map,Set};vm.runInNewContext(debtCore,sandbox,{filename:'debt-payoff-core.js'});core=sandbox.window.CarrowmontDebtPayoffCore;}catch(_){core=null;}
  const validGuard=core?.paymentGuard?.([{balance:1250000,annualRatePct:10.75,minimumPayment:22300}],5000);
  const badGuard=core?.paymentGuard?.([{balance:1250000,annualRatePct:1075,minimumPayment:22300}],5000);
  add('8G debt payoff core exposes a deterministic payment-reduction guard',Boolean(core?.paymentGuard)&&validGuard?.ok===true&&badGuard?.ok===false&&badGuard.firstMonthInterest>badGuard.totalMonthlyBudget);
  add('8G debt payoff keeps 600-month model boundary but blocks impossible payments before ordinary rendering',
    debtCore.includes('const MAX_MONTHS = 600')&&debtUi.includes('C.paymentGuard(debts,extra)')&&debtUi.includes('renderPaymentGuardFailure'));
  add('8G debt rate field explains annual percent entry and requires review above 100 percent without silent conversion',
    debtUi.includes("rate: 'Annual interest rate (%)'")&&debtUi.includes('enter 10.75 for 10.75%')&&debtUi.includes('annualRatePct>100')&&debtUi.includes('Use the entered rate anyway')&&!debtUi.includes('/100)'));
  add('8G unresolved payoff no longer presents giant total interest as a completed result',
    debtUi.includes("'Not shown — balance remains'")&&debtUi.includes('not shown because a balance remains after 50 years')&&debtUi.includes('els.report.disabled=!complete'));
  add('8G debt results include overflow-safe styling',debtCss.includes('overflow-wrap:anywhere')&&debtCss.includes('.debt-field-help'));

  const pages=JSON.parse(read(`${main}/data/carrowmont-search-pages.json`)||'{"entries":[]}');
  const index=JSON.parse(read(`${main}/data/carrowmont-search-index.json`)||'{"entries":[]}');
  add('8G creates no new public URL or search inventory entry',pages.entries?.length===138&&index.entries?.length===138&&pages.entries?.some(e=>e.url==='/my-carrowmont.html')&&pages.entries?.some(e=>e.url==='/ask-carrowmont.html'));
  add('8G dashboard and Ask remain free of direct network calls',!/(?:\bfetch\s*\(|XMLHttpRequest|WebSocket)/.test(ui+askUi+askCore));
  return checks;
}
