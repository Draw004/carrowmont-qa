import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require=createRequire(import.meta.url);

export function runFreBatch13AConnectedDataReadinessContract(root){
  const checks=[];const add=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail});
  const read=rel=>{const p=path.join(root,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const qaRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const readQa=rel=>{const p=path.join(qaRoot,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const corePath=path.join(root,'draw004.github.io/assets/connected/connected-data-core.js');
  const sandboxPath=path.join(root,'draw004.github.io/assets/connected/connected-data-sandbox.js');
  const storePath=path.join(root,'draw004.github.io/assets/fre/dashboard-store.js');
  add('13A connected-data core, sandbox adapter and Dashboard Store are present',fs.existsSync(corePath)&&fs.existsSync(sandboxPath)&&fs.existsSync(storePath));
  if(!(fs.existsSync(corePath)&&fs.existsSync(sandboxPath)&&fs.existsSync(storePath)))return checks;
  delete require.cache[require.resolve(corePath)];delete require.cache[require.resolve(sandboxPath)];delete require.cache[require.resolve(storePath)];
  const Core=require(corePath),Sandbox=require(sandboxPath),Store=require(storePath);
  const baseTime='2026-11-23T00:00:00.000Z';
  let profile=Store.create({region:'IN',currency:'INR',now:baseTime});
  profile=Store.setFact(profile,'resilience.emergencySavings',20000,{now:baseTime,unit:'INR',source:'QA'});
  const state=Sandbox.connect({scopes:['balances','cashFlowSummary'],currency:'INR',now:baseTime});
  add('13A sandbox consent records granular selected scopes only',state.consent.scopes.length===2&&state.consent.scopes.includes('balances')&&state.consent.scopes.includes('cashFlowSummary'));
  add('13A normalized snapshot retains summaries and discards raw transaction/credential fields',Array.isArray(state.snapshot.balances)&&state.snapshot.balances.length===2&&state.snapshot.cashFlowSummary?.takeHomeIncome===82000&&!('rawTransactions' in state.snapshot)&&!/password|secret|access.?token|refresh.?token|credential/i.test(JSON.stringify(state)));
  add('13A freshness reports current state before consent expiry',Core.freshness({consent:state.consent,snapshot:state.snapshot,now:'2026-11-23T01:00:00Z'}).state==='current');
  add('13A freshness reports stale data deterministically when refresh age exceeds threshold',Core.freshness({consent:state.consent,snapshot:state.snapshot,now:'2026-11-23T13:00:00Z',staleAfterHours:12}).state==='stale');
  add('13A freshness reports expired consent after the sandbox consent window',Core.freshness({consent:state.consent,snapshot:state.snapshot,now:'2026-11-24T01:00:01Z'}).state==='expired');
  const items=Core.buildReviewItems(state.snapshot,profile);
  const emergency=items.find(item=>item.targetPath==='resilience.emergencySavings');
  add('13A review stages current and connected values side by side before apply',emergency?.currentValue===20000&&emergency?.connectedValue===342000&&emergency?.changed===true,JSON.stringify(emergency||{}));
  let blocked=false;try{Core.applyReviewItem(profile,emergency,Store,{explicit:false,now:baseTime});}catch(_){blocked=true;}
  add('13A connected value cannot modify My Carrowmont without an explicit Use this value action',blocked===true);
  const applied=Core.applyReviewItem(profile,emergency,Store,{explicit:true,now:'2026-11-23T00:05:00Z'});
  const appliedFact=Store.getFact(applied,'resilience.emergencySavings',{includeExcluded:true});
  add('13A explicit apply preserves reviewed provenance in the existing profile schema',appliedFact?.value===342000&&appliedFact?.origin==='connected-reviewed'&&/Sandbox Bank \(reviewed\)/.test(appliedFact?.source||'')&&/Disconnecting/.test(appliedFact?.note||''));
  const usdState=Sandbox.connect({scopes:['balances'],currency:'USD',now:baseTime});
  const mismatch=Core.buildReviewItems(usdState.snapshot,profile).find(item=>item.targetPath==='resilience.emergencySavings');
  add('13A cross-currency connected values are flagged instead of compared as equivalent amounts',mismatch?.currencyMismatch===true&&mismatch?.currentUnit==='INR'&&mismatch?.unit==='USD',JSON.stringify(mismatch||{}));
  let mismatchBlocked=false;try{Core.applyReviewItem(profile,mismatch,Store,{explicit:true,now:baseTime});}catch(error){mismatchBlocked=/currency must match/i.test(error?.message||'');}
  add('13A cross-currency connected values fail closed before explicit apply',mismatchBlocked===true);
  let rejected=false;try{Core.assertNoCredentials({nested:{accessToken:'not-allowed'}});}catch(_){rejected=true;}
  add('13A core rejects credential-like keys anywhere in stored connected-data state',rejected===true);

  const config=read('draw004.github.io/assets/connected/connected-data-config.js');
  const ui=read('draw004.github.io/assets/connected/connected-data-ui.js');
  const html=read('draw004.github.io/my-carrowmont.html');
  const css=read('draw004.github.io/assets/connected/connected-data.css');
  const spec=read('draw004.github.io/docs/CARROWMONT_FRE_BATCH13A_CONNECTED_DATA_READINESS.md');
  const ledger=read('draw004.github.io/docs/CARROWMONT_FRE_BATCH13A_ACCEPTANCE_LEDGER.md');
  add('13A production configuration remains disabled, sandbox-only and has no live providers',config.includes('enabled:false')&&config.includes("mode:'sandbox'")&&config.includes('sandboxOnly:true')&&config.includes('liveProviders:Object.freeze([])'));
  add('13A My Carrowmont preview is hidden by default and reuses the existing indexed page',html.includes('id="mycmConnectedData"')&&html.includes('hidden></section>')&&html.includes('/assets/connected/connected-data-ui.js?v=20261123-fre13a')&&!html.includes('connected-data.html'));
  add('13A sandbox UI states no live bank/credential boundary and explicit review semantics',ui.includes('never contacts a bank')&&ui.includes('never asks for a banking password')&&ui.includes('Use this value')&&ui.includes('Disconnect &amp; delete sandbox copy')&&ui.includes('No live provider'));
  add('13A sandbox uses saved My Carrowmont locale before device locale and blocks mismatch apply',ui.includes("currency:profile?.locale?.currency||window.CarrowmontLocale?.getCurrency?.()||'USD'")&&ui.includes("window.CarrowmontLocale?.regions?.[active.region]?.locale")&&ui.includes('Currency mismatch — align the connected value with your My Carrowmont currency before applying.'));
  add('13A sandbox connection state is session-only',config.includes("sessionKey:'carrowmont_connected_data_sandbox_session_v1'")&&ui.includes('sessionStorage.setItem(Config.sessionKey')&&ui.includes('sessionStorage.removeItem(Config.sessionKey)')&&!ui.includes('localStorage.setItem(Config.sessionKey'));
  add('13A UI never routes sandbox snapshot into Ask Carrowmont',!ui.includes('ask-carrowmont')&&!ui.includes('CarrowmontAsk')&&spec.includes('Ask does not receive connected raw data'));
  add('13A responsive connected-data CSS collapses review/scopes on narrow screens',css.includes('@media(max-width:760px)')&&css.includes('.cm-connected-scopes,.cm-connected-review-list{grid-template-columns:1fr}')&&css.includes('@media(max-width:420px)'));
  add('13A spec and acceptance ledger preserve live-provider regulatory gate',spec.includes('Batch 13B')&&spec.includes('does not assert that Carrowmont itself is an Account Aggregator')&&ledger.includes('Production feature remains off'));
  const pages=JSON.parse(read('draw004.github.io/data/carrowmont-search-pages.json')||'{"entries":[]}');
  const index=JSON.parse(read('draw004.github.io/data/carrowmont-search-index.json')||'{"entries":[]}');
  const sitemap=read('draw004.github.io/sitemap.xml');
  add('13A preserves public search/sitemap inventory and creates no connected-data URL',pages.entries?.length===145&&index.entries?.length===145&&(sitemap.match(/<loc>/g)||[]).length===145&&!sitemap.includes('connected-data')&&!pages.entries?.some(entry=>/connected-data/.test(entry.url||'')));
  const common=readQa('helpers/common.js');
  add('13A clean-navigation QA preserves sandbox session state across reloads',common.includes("const connectedSandboxSessionKey = 'carrowmont_connected_data_sandbox_session_v1'")&&common.includes('if (connectedSandboxSession) sessionStorage.setItem(connectedSandboxSessionKey, connectedSandboxSession)'));
  const browser=readQa('tests/98-fre13a-connected-data-readiness.spec.js');
  add('13A browser QA covers consent scopes, explicit review/apply, disconnect, persistence boundary and mobile overflow',browser.includes('Review sandbox consent')&&browser.includes('Connect sandbox')&&browser.includes('Use this value')&&browser.includes('Disconnect & delete sandbox copy')&&browser.includes('carrowmont_connected_data_sandbox_session_v1')&&browser.includes('assertNoHorizontalOverflow'));
  return checks;
}
