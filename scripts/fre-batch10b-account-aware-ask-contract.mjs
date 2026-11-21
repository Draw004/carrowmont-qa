import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export function runFreBatch10bAccountAwareAskContract(root){
  const checks=[];const add=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail});
  const read=rel=>{const p=path.join(root,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const qaRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const readQa=rel=>{const p=path.join(qaRoot,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const html=read('draw004.github.io/ask-carrowmont.html');
  const ui=read('draw004.github.io/assets/ask/ask-carrowmont.js');
  const css=read('draw004.github.io/assets/ask/ask-carrowmont.css');
  const context=read('draw004.github.io/assets/account/carrowmont-ask-context.js');
  const privacy=read('draw004.github.io/privacy.html');
  const terms=read('draw004.github.io/terms.html');
  const about=read('draw004.github.io/about.html');
  const spec=read('draw004.github.io/docs/CARROWMONT_FRE_BATCH10B_ACCOUNT_AWARE_ASK.md');
  const ledger=read('draw004.github.io/docs/CARROWMONT_FRE_BATCH10B_ACCEPTANCE_LEDGER.md');
  const sitemap=read('draw004.github.io/sitemap.xml');
  const pagesText=read('draw004.github.io/data/carrowmont-search-pages.json');
  let pages=null;try{pages=JSON.parse(pagesText);}catch{}
  const browser=readQa('tests/75-fre10b-account-aware-ask.spec.js');

  add('Batch 10B introduces a dedicated read-only Account-Aware Ask adapter and loads it before the Ask UI',context.includes("VERSION='carrowmont-ask-context-v1.0'")&&html.includes('/assets/account/carrowmont-ask-context.js?v=20261121-fre12b4')&&html.indexOf('/assets/account/carrowmont-ask-context.js')<html.indexOf('/assets/ask/ask-carrowmont.js'));
  add('Batch 10B account adapter reads existing profile/scenario APIs but contains no account write/delete API',context.includes('loadCloudProfile')&&context.includes('listScenarios')&&!context.includes('saveCloudProfile')&&!context.includes('saveScenario')&&!context.includes('deleteCloudProfile')&&!context.includes('deleteScenario'));
  add('Batch 10B explicit intent maps cover all six controlled Ask journeys',[
    'emergency-runway','cash-flow-shortfall','car-affordability','mortgage-prepay-vs-invest','debt-vs-savings','money-priorities'
  ].every(intent=>context.includes(`'${intent}'`))&&context.includes("'cashFlow.takeHomeIncome'")&&context.includes("'resilience.emergencySavings'")&&context.includes("'debt.mortgageBalance'")&&context.includes("'retirement.currentSavings'")&&context.includes("'goal.targetAmount'"));
  add('Batch 10B freshness requires confirmation for older saved facts rather than silently accepting them',context.includes('DEFAULT_FACT_FRESH_DAYS=180')&&context.includes('LONG_TERM_FACT_FRESH_DAYS=365')&&context.includes('stale:Boolean(stale)')&&ui.includes("['stale-saved','saved-review']")&&ui.includes('Please confirm or replace it for this Ask question'));
  add('Batch 10B blocks currency-mismatched saved financial context instead of performing silent FX conversion',context.includes('currencyMismatch')&&context.includes('currentCurrency!==profileCurrency')&&ui.includes('Saved amounts were not reused')&&ui.includes('does not automatically convert saved financial amounts'));
  add('Batch 10B reuses fresh saved facts before the existing missing-question resolver',ui.includes('applyAccountContext(context)')&&ui.includes('state.facts[item.key]=item.value')&&ui.includes('api.resolve({intent:state.intent,facts:state.facts')&&ui.includes('api.missingQuestions'));
  add('Batch 10B lets users change one saved value or ignore saved context without changing the account',html.includes('askContextIgnoreBtn')&&ui.includes('editContextKey(item.key)')&&ui.includes('ignoreAccountContext')&&ui.includes('temporary what-if override for this Ask only')&&ui.includes('My Carrowmont will not be changed'));
  add('Batch 10B Trust Check exposes saved/session/temporary provenance and preserves the explicit save boundary',ui.includes('My Carrowmont saved value')&&ui.includes('My Carrowmont value confirmed in this Ask session')&&ui.includes('temporary what-if override for this Ask only')&&ui.includes('entered in this Ask session')&&ui.includes('Saved details are read-only here'));
  add('Batch 10B signed-out Ask remains account-network-lazy',context.includes('hasPersistedAuthSession')&&context.includes('if(!hasPersistedAuthSession())return')&&browser.includes('does not load the Supabase SDK'));
  add('Batch 10B mortgage journey may reuse a compatible saved remaining term without reusing decision-specific extra amount',context.includes("latestScenario(scenarios,'mortgage-payoff')")&&context.includes("key:'remainingYears'")&&!context.includes("key:'extraAmount'")&&browser.includes('requests only the new extra amount'));
  add('Batch 10B public/legal copy explains account-aware read and temporary override boundaries',privacy.includes('Ask Carrowmont may read relevant saved profile values or saved-plan details')&&privacy.includes('temporary what-if value does not change My Carrowmont')&&terms.includes('Ask Carrowmont may use relevant current saved details')&&about.includes('Ask Carrowmont can reuse relevant current saved details'));
  add('Batch 10B UI is responsive and visibly distinguishes saved, stale and temporary-override context',css.includes('.ask-account-context')&&css.includes('.ask-field-saved')&&css.includes('.ask-field-stale')&&css.includes('.ask-saved-note.is-override')&&css.includes('@media(max-width:700px)'));
  add('Batch 10B implementation and acceptance records include guest/account/save/privacy/currency boundaries and 14-dimension review',spec.includes('Guest-first and network boundary')&&spec.includes('Currency boundary')&&spec.includes('Save boundary')&&ledger.includes('14-dimension Change-Impact Matrix')&&ledger.includes('| Formulas |')&&ledger.includes('| Architecture |'));
  add('Batch 10B browser QA covers fresh/partial/stale/override/ignore/currency/mortgage/mobile behavior',browser.includes('fresh signed-in My Carrowmont facts')&&browser.includes('only requests the missing field')&&browser.includes('older saved facts')&&browser.includes('temporarily overridden')&&browser.includes('ignore all saved context')&&browser.includes('currency mismatch')&&browser.includes('saved mortgage plan')&&browser.includes('390px'));
  add('Batch 10B adds no public URL, sitemap or search-inventory entry',Boolean(pages)&&pages.entries?.length===145&&sitemap.includes('<loc>https://carrowmont.com/ask-carrowmont.html</loc>')&&(sitemap.match(/<loc>/g)||[]).length===145);

  const unit=spawnSync(process.execPath,[path.join(qaRoot,'scripts/fre-batch10b-account-aware-ask-unit.mjs')],{env:{...process.env,SOURCE_ROOT:root},encoding:'utf8'});
  add('Batch 10B pure context unit checks protect freshness, currency mismatch and saved mortgage-term mapping',unit.status===0,(unit.stderr||unit.stdout||'').trim());
  return checks;
}
