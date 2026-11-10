import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require=createRequire(import.meta.url);
const qaRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

export function runFreAskMvpUiContract(root){
  const checks=[]; const add=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail});
  const read=rel=>{const p=path.join(root,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const main='draw004.github.io/';
  const html=read(main+'ask-carrowmont.html');
  const ui=read(main+'assets/ask/ask-carrowmont.js');
  const css=read(main+'assets/ask/ask-carrowmont.css');
  const core=read(main+'assets/fre/ask-carrowmont-mvp.js');
  add('public Ask Carrowmont page and scoped UI assets exist',Boolean(html&&ui&&css&&core));
  if(!html||!ui) return checks;

  add('public UI exposes the six controlled journey starters after Batch 5',[
    'debt-vs-savings','car-affordability','mortgage-prepay-vs-invest','emergency-runway','cash-flow-shortfall','money-priorities'
  ].every(intent=>html.includes(`data-ask-intent="${intent}"`)));
  add('public UI uses the Batch 3A journey core and all required deterministic engine scripts',[
    '/assets/fre/ask-carrowmont-mvp.js','/assets/fre/intent-router.js','/assets/fre/priority-framework.js','/assets/fre/money-priorities.js','/budget-cash-flow-planner/core.js','/emergency-fund-runway-core.js','/goal-planner/core.js','/car-affordability-auto-decision-core.js','/budget-cash-flow-planner/debt-payoff-core.js','/compound-interest-calculator/core.js','/mortgage-payoff-calculator/prepayment-vs-investing-core.js'
  ].every(src=>html.includes(src)) && html.indexOf('/assets/fre/ask-carrowmont-mvp.js')<html.indexOf('/assets/ask/ask-carrowmont.js'));
  add('question UI keeps each step to the core maximum of three missing facts',ui.includes('maxQuestions:3') && ui.includes('api.missingQuestions(state.intent,state.facts,3)'));
  add('Batch 4 guided GUI exposes progress and keeps Why we ask collapsed by default',/id="askProgress"/.test(html) && /askProgressText/.test(ui) && /Why we ask/.test(ui) && /document\.createElement\('details'\)/.test(ui));
  add('Batch 4 I-dont-know handling is limited to explicit return assumptions and labels the illustrative default',/assumedInvestmentReturnPct:\{[^}]*unknownDefault:5/.test(ui) && /assumedSavingsReturnPct:\{[^}]*unknownDefault:5/.test(ui) && !/monthlyIncome:\{[^}]*unknownDefault/.test(ui) && /Illustrative default used because you selected/.test(ui));
  add('Batch 4 validation identifies the field needing correction in plain language',/Enter a valid non-negative number for/.test(ui) && /Use 0 only when the amount is genuinely zero/.test(ui));
  add('Batch 4 closeout supports previous-step correction without discarding entered answers',/data-ask-back/.test(html) && /function goBack\(\)/.test(ui) && /answerCache/.test(ui) && /history\.push/.test(ui));
  add('Batch 4 closeout preserves valid fields and marks-focuses the exact invalid field',/ask-field-invalid/.test(css) && /aria-invalid/.test(ui) && /reveal\(field,input\)/.test(ui));
  add('Batch 4 closeout smart focus and accessibility controls are explicit',/prefers-reduced-motion/.test(ui) && /focus\(\{preventScroll:true\}\)/.test(ui) && /focus-visible/.test(css) && /aria-live="assertive"/.test(html));
  add('public result renderer presents recommendation confidence and change factors before practical next steps',ui.includes('askRecommendationHeadline') && ui.includes('askConfidence') && ui.includes('askWhatCouldChange') && html.indexOf('askRecommendationHeadline') < html.indexOf('askMetrics') && html.indexOf('askWhatCouldChange') < html.indexOf('askNextSteps'));
  add('result UI exposes answer-first resolution diagnosis numbers alternatives change factors next steps trace and assumptions',[
    'askRecommendationHeadline','askRecommendationAction','askRecommendationRationale','askConfidence','askDiagnosis','askMetrics','askAlternatives','askWhatCouldChange','askNextSteps','askEngineTrace','askAssumptions'
  ].every(id=>html.includes(`id="${id}"`)) && /Carrowmont’s view/.test(html));
  add('Ask financial facts are not persisted or transmitted by the UI or journey core',!/(?:localStorage|sessionStorage|indexedDB|\bfetch\s*\(|XMLHttpRequest|WebSocket)/.test(ui+'\n'+core));
  add('public copy makes deterministic calculation authority and privacy boundary explicit',/Tested engines/.test(html) && /Inputs are not saved/.test(html) && /calculators do the mathematics/.test(html));
  add('unsupported free-text questions get a visible transparent fallback instead of a silent dead end',/id="askUnsupported"/.test(html) && /guided resolution is not available yet/.test(html) && /showUnsupported/.test(ui) && /Search Carrowmont/.test(html) && /Browse Tools/.test(html) && /Explore Learn/.test(html));
  add('locale layer remains authoritative for country currency and money formatting',ui.includes('CarrowmontLocale') && ui.includes('getCurrency') && ui.includes('getRegion') && ui.includes('formatMoney'));

  const tools=read(main+'tools.html'); const home=read(main+'index.html');
  add('Batch 3C preserves the 23-tool directory and nine-card homepage while adding a controlled Ask entry',/"numberOfItems"\s*:\s*23/.test(tools) && (tools.match(/class="directory-tool-card/g)||[]).length===23 && (home.match(/data-tool-id=/g)||[]).length===9 && /data-home-ask-entry/.test(home) && /href=["']\/ask-carrowmont\.html["']/.test(home));

  const sharedSite=read(main+'site.js');
  add('Batch 3C makes Ask discoverable in shared desktop navigation and as the center mobile primary action',/FRE3C: expose Ask Carrowmont/.test(sharedSite) && /href='\/ask-carrowmont\.html'/.test(sharedSite) && /\{ key: 'ask', label: 'Ask', href: '\/ask-carrowmont\.html' \}/.test(sharedSite) && /\{ key: 'research', label: 'Research'/.test(sharedSite)===false && /href=\"\/research\.html\">'.*ICONS\.research/s.test(sharedSite));
  add('Batch 3C puts the interactive question in the compact first-screen workspace',/ask-workspace-section/.test(html) && /What are you trying to figure out\?/.test(html) && !/ask-side-card/.test(html) && /ask-suggestions/.test(html));

  const sitemap=read(main+'sitemap.xml');
  const pages=JSON.parse(read(main+'data/carrowmont-search-pages.json'));
  const index=JSON.parse(read(main+'data/carrowmont-search-index.json'));
  const aliases=JSON.parse(read(main+'data/carrowmont-search-aliases.json'));
  const SearchCore=require(path.join(root,main+'search-core.js'));
  add('sitemap and reviewed search inventory expose Ask Carrowmont as public page 137',sitemap.includes('<loc>https://carrowmont.com/ask-carrowmont.html</loc>') && pages.entries?.length===137 && index.entries?.length===137 && pages.entries?.some(e=>e.url==='/ask-carrowmont.html'));
  const askSearch=SearchCore.search(index.entries,aliases,'ask carrowmont',{region:'US',limit:12});
  add('site search gives Ask Carrowmont clear navigational ownership',askSearch[0]?.url==='/ask-carrowmont.html');

  const qaConfig=fs.readFileSync(path.join(qaRoot,'qa.config.js'),'utf8');
  add('central QA inventory advances to 137 and includes Ask Carrowmont',/search1ExpectedPublicPages\s*=\s*137/.test(qaConfig) && /ask-carrowmont-page/.test(qaConfig));
  const browserSpec=fs.readFileSync(path.join(qaRoot,'tests/61-fre3b-ask-carrowmont.spec.js'),'utf8');
  add('browser QA protects guided resolution privacy correction recovery discoverability and responsive layouts',/emergency-fund journey resolves/.test(browserSpec) && /financial inputs are not persisted/.test(browserSpec) && /lets users go back, correct answers/.test(browserSpec) && /focuses the exact invalid field/.test(browserSpec) && /smart focus and result review/.test(browserSpec) && /Ask is discoverable from shared navigation/.test(browserSpec) && /\[1280,768,412,390,360\]/.test(browserSpec));

  const registry=JSON.parse(read(main+'docs/CARROWMONT_FRE_ENGINE_REGISTRY_V10.json'));
  add('Engine Registry V10 records public Batch 3B without adding an engine',registry.schema_version===10 && registry.engines?.length===26 && registry.fre_batch3b?.public_url==='/ask-carrowmont.html' && registry.fre_batch3b?.public_tool_count===23 && registry.fre_batch3b?.search_public_page_count===137);
  add('Batch 3B documentation and acceptance ledger exist',Boolean(read(main+'docs/CARROWMONT_FRE_BATCH3B_ASK_CARROWMONT_PUBLIC_MVP.md')) && Boolean(read(main+'docs/CARROWMONT_FRE_BATCH3B_ACCEPTANCE_LEDGER.md')));
  add('Batch 3D resolution-completion documentation and 14-item acceptance ledger exist',Boolean(read(main+'docs/CARROWMONT_FRE_BATCH3D_ASK_MVP_RESOLUTION_COMPLETION.md')) && /14-dimension change-impact matrix/.test(read(main+'docs/CARROWMONT_FRE_BATCH3D_ACCEPTANCE_LEDGER.md')));
  add('Batch 4 guided-GUI documentation and acceptance ledger exist',Boolean(read(main+'docs/CARROWMONT_FRE_BATCH4_GUIDED_GUI.md')) && /14-dimension change-impact matrix/.test(read(main+'docs/CARROWMONT_FRE_BATCH4_ACCEPTANCE_LEDGER.md')));
  add('Batch 5 Money Priorities renders a next-three-moves evidence surface without a new public URL',/money-priorities/.test(html) && /askAlternativesHeading/.test(html) && /priorityMoves/.test(ui) && /Your next three moves/.test(ui));
  const registry11=JSON.parse(read(main+'docs/CARROWMONT_FRE_ENGINE_REGISTRY_V11.json'));
  add('Engine Registry V11 records Money Priorities as an Ask journey while keeping 23 public tools and 137 public pages',registry11.schema_version===11 && registry11.fre_batch5?.ask_journey==='money-priorities' && registry11.fre_batch5?.public_tool_count===23 && registry11.fre_batch5?.search_public_page_count===137);
  add('Batch 5 documentation and acceptance ledger exist',Boolean(read(main+'docs/CARROWMONT_FRE_BATCH5_MONEY_PRIORITIES.md')) && /14-dimension change-impact matrix/.test(read(main+'docs/CARROWMONT_FRE_BATCH5_ACCEPTANCE_LEDGER.md')));
  return checks;
}
