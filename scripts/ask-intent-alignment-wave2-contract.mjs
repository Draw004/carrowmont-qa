import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);

export function runAskIntentAlignmentWave2Contract(root){
  const checks=[]; const add=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail});
  const read=rel=>{const p=path.join(root,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const json=rel=>JSON.parse(read(rel)||'{}');
  const main='draw004.github.io/';
  const aliases=json(main+'data/carrowmont-search-aliases.json');
  const index=json(main+'data/carrowmont-search-index.json');
  const corpus=json('carrowmont-qa/fixtures/ask-intent-wave2-corpus.json');
  const html=read(main+'ask-carrowmont.html');
  const ui=read(main+'assets/ask/ask-carrowmont.js');
  const mvp=read(main+'assets/fre/ask-carrowmont-mvp.js');
  const router=read(main+'assets/fre/intent-router.js');
  const searchCoreSource=read(main+'search-core.js');
  const searchApi=read(main+'search.js');
  const browser=read('carrowmont-qa/tests/102-ask-intent-alignment-wave2.spec.js');
  const standard=read(main+'docs/CARROWMONT_SHARED_UI_STANDARD.md');
  const impl=read(main+'docs/CARROWMONT_ASK_INTENT_ALIGNMENT_WAVE2_IMPLEMENTATION.md');
  const audit=read(main+'docs/CARROWMONT_ASK_INTENT_E2E_AUDIT_2026-11-25.md');

  const owners=Array.isArray(aliases.owners)?aliases.owners:[];
  const fixtures=Array.isArray(corpus.fixtures)?corpus.fixtures:[];
  add('Wave 2 shared ownership schema defines exactly seventeen reviewed intent owners', aliases.schema_version===2 && owners.length===17 && new Set(owners.map(x=>x.id)).size===17);
  add('Wave 2 reviewed corpus contains at least two hundred natural-language fixtures', fixtures.length>=205 && fixtures.every(x=>x.query&&x.owner&&['guided','explain'].includes(x.action)));
  add('Every reviewed owner defines Ask ownership plus guided and explanation Search destinations', owners.every(x=>x.id&&x.ask_intent&&x.search_guided_url&&x.search_explain_url&&Array.isArray(x.patterns)&&x.patterns.length));

  let core=null;
  try{ core=require(path.join(root,main,'search-core.js')); }catch{}
  let ownershipPass=0, searchPass=0;
  if(core){
    for(const f of fixtures){
      const resolved=core.resolveOwnership(aliases,f.query);
      const expectedOwner=owners.find(x=>x.id===f.owner);
      const expectedMode=f.action==='explain'?'explain':null;
      const ownerOk=resolved?.id===f.owner && (expectedMode?resolved.mode==='explain':resolved?.mode!=='explain');
      if(ownerOk) ownershipPass+=1;
      const expectedUrl=f.action==='explain'?expectedOwner?.search_explain_url:expectedOwner?.search_guided_url;
      const results=core.search(index.entries||[],aliases,f.query,{region:f.region||'OTHER',limit:12});
      if(results[0]?.url===expectedUrl) searchPass+=1;
    }
  }
  add('Shared ownership resolver matches all reviewed Ask/Search fixtures', ownershipPass===fixtures.length,`${ownershipPass}/${fixtures.length}`);
  add('Search top destination matches the reviewed shared owner on all reviewed fixtures', searchPass===fixtures.length,`${searchPass}/${fixtures.length}`);

  const expectedIntents=['debt-vs-savings','car-affordability','mortgage-prepay-vs-invest','emergency-runway','cash-flow-shortfall','money-priorities','lump-sum-goal-tradeoffs','borrowing-health','home-affordability','debt-payoff','credit-card-payoff','retirement-readiness','retirement-withdrawal','goal-funding','loan-cost','inflation-impact','recurring-investment'];
  add('Ask public start screen exposes seventeen unique guided journeys', expectedIntents.every(intent=>(html.match(new RegExp(`data-ask-intent="${intent}"`,'g'))||[]).length===1) && (html.match(/data-ask-intent=/g)||[]).length===17);
  add('Ask start screen organizes Wave 2 into five understandable decision groups', ['Everyday stability','Debt decisions','Big goals','Growth &amp; retirement','Trade-offs'].every(x=>html.includes(x)) && (html.match(/class="ask-decision-group"/g)||[]).length===5);
  add('Wave 2 loads only existing deterministic calculator cores for the four new journeys', ['/retirement-calculator/withdrawal-core.js','/loan-calculator/core.js','/inflation-calculator/core.js','/sip-calculator/core.js'].every(x=>html.includes(x)) && !/fetch\(|XMLHttpRequest|WebSocket/.test(mvp));
  add('Wave 2 MVP exposes all seventeen intents and the four added journey branches', expectedIntents.every(x=>mvp.includes(`'${x}'`)) && ['retirementWithdrawalJourney','loanCostJourney','inflationImpactJourney','recurringInvestmentJourney'].every(x=>mvp.includes(x)));
  add('Retirement withdrawal journey supports both runway and supported-withdrawal modes', mvp.includes("retirementWithdrawalMode==='support'") && mvp.includes('retirementWithdrawalTargetYears') && mvp.includes('retirementWithdrawalMonthly'));
  add('Wave 2 Ask uses shared ownership before legacy fallback classification', ui.includes('async function ownershipFor') && ui.includes('CarrowmontSearch.ownership') && ui.indexOf('ownershipFor(understood)')<ui.indexOf('api.classify(understood)'));
  add('Explanation-mode questions route to educational fallback instead of forcing a calculator journey', ui.includes("ownership.mode==='explain'") && ui.includes('showUnsupported') && ui.includes('Find an explanation'));
  add('Work through this action text is ownership-aware and cannot knowingly contradict an unsupported best match', ui.includes('function updateStartAction') && ui.includes('Work through this') && ui.includes('Open best match') && ui.includes('Find an explanation'));
  add('Retirement Readiness writes the existing safe Drawdown session handoff', ui.includes("carrowmont_retirement_withdrawal_handoff_v1") && ui.includes('function writeRetirementWithdrawalHandoff') && ['projectedCorpus','requiredCorpus','monthlyNeed','retirementAge','postReturn','inflation'].every(x=>ui.includes(x)));
  add('Retirement result exposes both planner and drawdown next-step destinations', ui.includes('/retirement-calculator/') && ui.includes('/retirement-calculator/withdrawal-calculator.html') && /Test how long this retirement balance may last/.test(ui));
  add('Debt-versus-invest CTA is outcome-aware and the obsolete broken debt-payoff fragment is gone', ui.includes('modeledPathDifference') && ui.includes('/sip-calculator/') && ui.includes('/budget-cash-flow-planner/debt-payoff-calculator.html') && !ui.includes('/budget-cash-flow-planner/#debt-payoff'));
  add('Money Priorities and Lump Sum results can route to the modeled first practical action', ui.includes('function practicalLinkForStage') && ui.includes('priorityMoves') && ui.includes('lumpSum'));
  add('Home Affordability surfaces the new upfront-costs guide as a secondary learning action', ui.includes('/home-buying-upfront-costs.html'));
  add('New Wave 2 scenario journeys do not become implicit My Carrowmont saved-profile fields', ['retirement-withdrawal','loan-cost','inflation-impact','recurring-investment'].every(x=>ui.includes(x)) && ui.includes('DASHBOARD_SAVE_INTENTS') && !/DASHBOARD_SAVE_INTENTS[^;]*retirement-withdrawal/s.test(ui));
  add('Wave 2 preserves no-financial-values-in-URL privacy boundary', !/URLSearchParams\([^)]*(?:facts|amount|balance|income|apr|rate|savings)/i.test(ui) && ui.includes('sessionStorage'));

  add('Plain-language acronym standard is explicit in development standards', /abbreviation|acronym/i.test(standard) && ['APR','DTI','SIP','SWP','EMI'].every(x=>standard.includes(x)));
  add('Ask labels or helper copy expand core financial abbreviations at first meaningful use', ['APR (Annual Percentage Rate)','DTI (Debt-to-Income ratio)','SIP (Systematic Investment Plan)','SWP (Systematic Withdrawal Plan)','EMI (Equated Monthly Instalment)'].every(x=>(ui+'\n'+mvp+'\n'+html).includes(x)));

  add('SearchCore exposes shared action-mode and ownership APIs', searchCoreSource.includes('resolveActionMode') && searchCoreSource.includes('resolveOwnership') && searchCoreSource.includes("version: '1.3.0'"));
  add('Public Search API exposes ownership to Ask while keeping Search local', searchApi.includes('ownership: function (query, options)') && searchApi.includes('CarrowmontSearchCore.resolveOwnership') && !/fetch\([^)]*query/i.test(searchApi));
  add('Fallback intent router prioritizes specific retirement-withdrawal and mortgage comparison intents', router.includes('RETIREMENT_WITHDRAWAL') && router.indexOf('RETIREMENT_WITHDRAWAL')<router.lastIndexOf('RETIREMENT_READINESS') && router.indexOf('MORTGAGE_PREPAY_VS_INVEST')<router.lastIndexOf('DEBT_VS_SAVINGS'));
  add('Wave 2 Ask/Search runtime assets use a deployment cache-buster including the fallback intent router', html.includes('/assets/fre/intent-router.js?v=20261125-askwave2&amp;live=20261126-cachefix2') && html.includes('/search-core.js?v=20261125-askwave2&amp;live=20261126-cachefix2') && html.includes('/search.js?v=20261125-askwave2&amp;live=20261126-cachefix2') && html.includes('/assets/ask/ask-carrowmont.js?v=20261125-askwave2&amp;live=20261126-cachefix2') && searchApi.includes('v=20261125-askwave2&live=20261126-cachefix2'));

  add('Wave 2 browser QA verifies real click routing, journey execution, final CTA destinations and handoffs', Boolean(browser) && ['calculate how long will my retirement fund would last','Find an explanation','carrowmont_retirement_withdrawal_handoff_v1','debt-payoff-calculator.html','sip-calculator','Loan / EMI','SIP (Systematic Investment Plan)','SWP (Systematic Withdrawal Plan)'].every(x=>browser.includes(x)));
  add('Wave 2 portable audit and implementation handover documents exist', Boolean(audit&&impl) && audit.includes('End-to-End') && impl.includes('Carrowmont Ask Intent Alignment') && impl.includes('204') && impl.includes('17'));
  return checks;
}
