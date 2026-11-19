import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export function runFreBatch8kSitewidePolishAccountContract(root){
  const checks=[];const add=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail});
  const read=rel=>{const p=path.join(root,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const qaRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const readQa=rel=>{const p=path.join(qaRoot,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const main='draw004.github.io/';
  const page=read(main+'my-carrowmont.html');
  const account=read(main+'assets/account/carrowmont-account.js');
  const accountUi=read(main+'assets/account/my-carrowmont-account.js');
  const dash=read(main+'assets/dashboard/my-carrowmont.js');
  const css=read(main+'assets/dashboard/my-carrowmont.css');
  const save=read(main+'assets/account/carrowmont-plan-save.js');
  const privacy=read(main+'privacy.html');
  const terms=read(main+'terms.html');
  const editorial=read(main+'editorial-policy.html');
  const disclaimer=read(main+'disclaimer.html');
  const learn=read(main+'mortgage-prepayment-vs-investing.html');
  const tool=read('mortgage-payoff-calculator/prepayment-vs-investing.html');

  add('8K V2 prevents the 4 percent stress-test sequence/results grid from widening the mobile document',
    read(main+'4-percent-rule-stress-test.css').includes('.stress-results,.stress-result-panel,.stress-sequence-grid,.stress-sequence-note{min-width:0;max-width:100%}'));

  add('8K normalizes composite-control outer heights across the remaining calculator families',
    read('mortgage-payoff-calculator/styles.css').includes('.money-input,.input-suffix{height:42px;min-height:42px}')&&
    read('loan-calculator/styles.css').includes('.money-input,.input-suffix{height:48px;min-height:48px}')&&
    read(main+'4-percent-rule-stress-test.css').includes('.stress-input-suffix{height:46px;min-height:46px}')&&
    read(main+'home-affordability-calculator.css').includes('.home1-suffix{height:47px;min-height:47px}')&&
    read(main+'us-debt-interest-cost-calculator.css').includes('.usdc-input-suffix,.usdc-input-prefix{height:44px;min-height:44px}')&&
    read('mortgage-payoff-calculator/decision-centre.css').includes('.mdc-money,.mdc-suffix{height:42px;min-height:42px}')&&
    read('mortgage-payoff-calculator/rent-vs-buy-calculator.css').includes('.rent1-money,.rent1-suffix{height:42px;min-height:42px}')&&
    read(main+'financial-independence-number-by-spending.css').includes('.fiq-input-suffix{height:46px;min-height:46px}'));

  const sharedDirs=['sip-calculator','goal-planner','financial-independence','inflation-calculator','retirement-calculator','budget-cash-flow-planner','mortgage-payoff-calculator','compound-interest-calculator','loan-calculator'];
  const bridges=sharedDirs.map(d=>read(`${d}/shared-plan-bridge.js`));
  const states=sharedDirs.map(d=>read(`${d}/shared-plan-state.js`));
  const hashes=arr=>arr.map(x=>crypto.createHash('sha256').update(x).digest('hex'));
  add('8K keeps replicated shared-plan bridge and state helpers byte-identical across all primary tools',
    bridges.every(Boolean)&&states.every(Boolean)&&new Set(hashes(bridges)).size===1&&new Set(hashes(states)).size===1);
  add('8K shared handoff and Save-to-My-Carrowmont action cards use compact equal-width wrapping controls',
    bridges[0].includes('.cm-shared-plan-actions{display:grid;grid-template-columns:1fr')&&bridges[0].includes('.cm-shared-plan-banner button{width:100%')&&
    save.includes('grid-template-columns:1fr')&&save.includes('width:100%')&&save.includes("signedInPrimaryLabel||'Save to My Carrowmont'")&&save.includes("signedOutPrimaryLabel||'Save to My Carrowmont'"));

  add('8K My Carrowmont renders the cached signed-in dashboard before cloud reconciliation while preventing edits during sync',
    accountUi.includes('function showCachedDashboard()')&&accountUi.includes('browserStore?.load?.()')&&accountUi.includes("cloudSummary.textContent='Showing your latest saved dashboard while Carrowmont syncs…'")&&
    accountUi.includes("dashboard.inert=true")&&accountUi.includes("dashboard.setAttribute('aria-busy','true')")&&accountUi.includes('dashboard.inert=false')&&accountUi.includes('refreshPromise'));
  add('8K account client coalesces repeated user checks and keeps Supabase profile/scenario ownership unchanged',
    account.includes('let userCacheKnown=false')&&account.includes('let userPromise=null')&&account.includes('if(!force&&userCacheKnown) return userCache')&&account.includes("profileTable:clean(raw.profileTable)||'carrowmont_profiles'")&&account.includes("scenarioTable:clean(raw.scenarioTable)||'carrowmont_saved_scenarios'"));

  add('8K adds Google OAuth beside the existing passwordless email magic-link flow without password auth or Google data scopes',
    page.includes('id="mycmGoogleSignIn"')&&page.includes('Continue with Google')&&page.includes('or use email')&&
    account.includes("signInWithOAuth({provider:'google'")&&account.includes('signInWithOtp')&&!account.includes('signInWithPassword')&&
    !account.includes('gmail')&&!account.includes('drive.file')&&!account.includes('https://www.googleapis.com/auth/')&&
    privacy.includes('Google')&&privacy.includes('Gmail')&&privacy.includes('Google Drive')&&terms.includes('Google'));
  add('8K Google login setup is documented without storing a Google client secret in public source',
    read(main+'docs/CARROWMONT_GOOGLE_SIGNIN_SETUP.md').includes('https://oltscckjsbbpfctegosn.supabase.co/auth/v1/callback')&&
    read(main+'docs/CARROWMONT_GOOGLE_SIGNIN_SETUP.md').includes('Do not commit')&&!read(main+'docs/CARROWMONT_GOOGLE_SIGNIN_SETUP.md').match(/client_secret\s*[:=]\s*[A-Za-z0-9_-]{10,}/i));

  add('8K My Carrowmont planning discovery localizes country-sensitive labels without changing stable journey IDs/routes',
    dash.includes("journey:'mortgage-payoff'")&&dash.includes("journey:'recurring-investment'")&&dash.includes("journey:'loan-emi'")&&
    dash.includes('L?.getMortgageTerms?.(region)')&&dash.includes("region==='IN'?{...area,label:'SIP / investing'")&&dash.includes("label:'Recurring investing'")&&dash.includes("region==='IN'?{...area,label:'Loan / EMI'")&&dash.includes("label:'Loan repayment'"));
  add('8K shared housing handoff copy consumes the existing country-aware mortgage/home-loan terminology layer',
    bridges[0].includes('const fallbackHousingTerms=region=>')&&bridges[0].includes("region==='IN'||region==='AU'||region==='NZ'")&&bridges[0].includes('const housingTerms=()=>L.getMortgageTerms')&&bridges[0].includes('`${housingTerms().nounCap} repayment available from Carrowmont`')&&bridges[0].includes('`Apply to ${housingTerms().nounCap} / rent`'));

  add('8K policy review dates are current for November 2026',editorial.includes('Last updated: November 2026')&&disclaimer.includes('Last updated: November 2026'));
  const desc=html=>html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"|<meta[^>]+content="([^"]+)"[^>]+name="description"/i)?.slice(1).find(Boolean)||'';
  const learnDesc=desc(learn),toolDesc=desc(tool);
  add('8K Learn and tool mortgage-prepayment pages keep distinct concise search descriptions',learnDesc&&toolDesc&&learnDesc!==toolDesc&&learnDesc.length>=100&&learnDesc.length<=160&&toolDesc.length>=100&&toolDesc.length<=170);
  add('8K My Carrowmont changed app-launch runtime and dashboard assets are cache-busted while account runtimes stay stable',
    (page.includes('my-carrowmont.css?v=20261115-fre8k4')||page.includes('my-carrowmont.css?v=20261116-fre9')||(page.includes('my-carrowmont.css?v=20261118-fre12')||page.includes('my-carrowmont.css?v=20261118-drawc1')||(page.includes('my-carrowmont.css?v=20261119-drawc2')||page.includes('my-carrowmont.css?v=20261119-panel-v6b'))))&&page.includes('carrowmont-account.js?v=20261115-fre8k')&&(page.includes('my-carrowmont.js?v=20261115-fre8k')||page.includes('my-carrowmont.js?v=20261116-fre9')||page.includes('my-carrowmont.js?v=20261116-fre9b'))&&(page.includes('my-carrowmont-account.js?v=20261115-fre8k')||page.includes('my-carrowmont-account.js?v=20261116-fre9')||page.includes('my-carrowmont-account.js?v=20261116-fre9b'))&&(page.includes('site.js?v=20261115-fre8jv3')||page.includes('site.js?v=20261118-fre12')||(page.includes('site.js?v=20261119-pwa-install2')||(page.includes('site.js?v=20261119-nav-stable-v6b')||page.includes('site.js?v=20261119-pwa-install-v6')))));

  const browser=readQa('tests/71-fre8k-sitewide-polish-account.spec.js');
  const commonQa=readQa('helpers/common.js');
  const mortgageQa=readQa('tests/15-mortgage-payoff-calculator.spec.js');
  add('8K V2 browser harness preserves seeded Supabase sessions and tests Google through the real frozen account API',
    commonQa.includes('supabaseAuthEntries')&&commonQa.includes('/^sb-.*-auth-token$/')&&browser.includes('signedIn:false')&&browser.includes("signInWithOAuth:async args")&&!browser.includes('CarrowmontAccount.signInWithGoogle=async'));
  add('8K V2 legacy mortgage handoff QA follows localized copy and the shared housing-row action',
    mortgageQa.includes('Home loan repayment available from Carrowmont')&&mortgageQa.includes("name: 'Use in housing row'")&&!mortgageQa.includes('Use in Rent / mortgage'));
  add('8K V3 FI-by-spending uses compact navigation before the 1024px header can widen the page',
    read(main+'financial-independence-number-by-spending.css').includes('@media (min-width:981px) and (max-width:1180px)')&&
    read(main+'financial-independence-number-by-spending.css').includes('body[data-cm-page=\"fi-number-by-spending\"] .desktop-nav{display:none}')&&
    read(main+'financial-independence-number-by-spending.html').includes('financial-independence-number-by-spending.css?v=20261115-fre8k3'));
  add('8K V4 My Carrowmont switches to compact navigation before the 1024px header can widen the page',
    css.includes('@media(max-width:1180px)')&&css.includes('body[data-cm-page=\"my-carrowmont\"] .desktop-nav{display:none}')&&
    css.includes('body[data-cm-page=\"my-carrowmont\"] .mobile-nav{display:block}')&&(page.includes('my-carrowmont.css?v=20261115-fre8k4')||page.includes('my-carrowmont.css?v=20261116-fre9')||(page.includes('my-carrowmont.css?v=20261118-fre12')||page.includes('my-carrowmont.css?v=20261118-drawc1')||(page.includes('my-carrowmont.css?v=20261119-drawc2')||page.includes('my-carrowmont.css?v=20261119-panel-v6b')))));
  add('8K V3 responsive discovery QA counts the six visible planning cards rather than hidden expandable cards',
    browser.includes("#mycmAddPlanningGrid .mycm-add-card:visible")&&!browser.includes("#mycmAddPlanningGrid .mycm-add-card')).toHaveCount(6"));
  add('8K browser QA covers mobile tablet laptop desktop geometry warm dashboard Google OAuth and country-aware discovery',
    ['360','390','768','1024','1440'].every(w=>browser.includes(w))&&browser.includes('warm dashboard')&&browser.includes('signInWithOAuth')&&browser.includes('SIP / investing')&&browser.includes('Mortgage prepayment')&&browser.includes('assertNoHorizontalOverflow')&&browser.includes('mycm-authenticated'));

  const pages=JSON.parse(read(main+'data/carrowmont-search-pages.json')||'{"entries":[]}');
  const index=JSON.parse(read(main+'data/carrowmont-search-index.json')||'{"entries":[]}');
  add('8K creates no new public URL or search inventory entry',pages.entries?.length===145&&index.entries?.length===145);
  return checks;
}
