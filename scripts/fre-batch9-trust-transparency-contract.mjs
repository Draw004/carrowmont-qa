import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export function runFreBatch9TrustTransparencyContract(root){
  const checks=[];const add=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail});
  const read=rel=>{const p=path.join(root,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const qaRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const readQa=rel=>{const p=path.join(qaRoot,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const main='draw004.github.io/';
  const trustJs=read(main+'assets/trust/carrowmont-trust.js');
  const trustCss=read(main+'assets/trust/carrowmont-trust.css');
  const mycm=read(main+'my-carrowmont.html');
  const mycmCss=read(main+'assets/dashboard/my-carrowmont.css');
  const mycmUi=read(main+'assets/account/my-carrowmont-account.js');
  const mycmDash=read(main+'assets/dashboard/my-carrowmont.js');
  const ask=read(main+'ask-carrowmont.html');
  const askJs=read(main+'assets/ask/ask-carrowmont.js');
  const trustStandard=read(main+'docs/CARROWMONT_TRUST_STANDARD.md');
  const spec=read(main+'docs/CARROWMONT_FRE_BATCH9_TRUST_EXPLAINABILITY_PLAN_TRANSPARENCY.md');
  const ledger=read(main+'docs/CARROWMONT_FRE_BATCH9_ACCEPTANCE_LEDGER.md');
  const google=read(main+'docs/CARROWMONT_GOOGLE_SIGNIN_SETUP.md');

  const questions=['Why am I seeing this?','What numbers were used?','Which values are assumptions?','What could change the result?'];
  add('Batch 9 shared Trust Check exists with plain-language progressive disclosure and explicit save boundary',
    trustJs.includes('Carrowmont Trust Check')&&questions.every(q=>trustJs.includes(q))&&trustJs.includes('What gets saved?')&&trustJs.includes('explicitly choose Save to My Carrowmont')&&trustCss.includes('.cm-trust-contract'));

  const sharedDirs=['sip-calculator','goal-planner','financial-independence','inflation-calculator','retirement-calculator','budget-cash-flow-planner','mortgage-payoff-calculator','compound-interest-calculator','loan-calculator'];
  const bridges=sharedDirs.map(d=>read(`${d}/shared-plan-bridge.js`));
  const hashes=bridges.map(x=>crypto.createHash('sha256').update(x).digest('hex'));
  add('Batch 9 primary shared-plan tools load one byte-identical Trust Check bridge',bridges.every(x=>x.includes('/assets/trust/carrowmont-trust.js?v=20261116-fre9')&&x.includes('CarrowmontTrust'))&&new Set(hashes).size===1);

  const direct=[
    main+'emergency-fund-runway-calculator.html',main+'car-affordability-auto-decision-calculator.html',main+'debt-to-income-borrowing-health-calculator.html',main+'home-affordability-calculator.html',main+'4-percent-rule-stress-test.html',main+'financial-independence-number-by-spending.html',main+'market-chain-reaction-explorer.html',main+'us-debt-interest-cost-calculator.html',main+'gold-macro-stress-explorer.html',main+'silver-supply-demand-macro-stress-explorer.html','budget-cash-flow-planner/debt-payoff-calculator.html','budget-cash-flow-planner/credit-card-payoff-calculator.html','retirement-calculator/withdrawal-calculator.html','mortgage-payoff-calculator/rent-vs-buy-calculator.html'
  ];
  add('Batch 9 important standalone tools load the same shared Trust Check',direct.every(rel=>read(rel).includes('/assets/trust/carrowmont-trust.js?v=20261116-fre9')));

  add('Batch 9 My Carrowmont formalizes the Trust Contract without weakening account controls',
    mycm.includes('id="mycmTrustContract"')&&['Why am I seeing this?','What numbers were used?','When was it last updated?','Which values did I enter?','Which values are assumptions?','What could change the result?'].every(q=>mycm.includes(q))&&
    mycm.includes('Export account data')&&mycm.includes('Delete saved profile')&&mycm.includes('Sign out'));
  add('Batch 9 My Carrowmont progress insights expose values assumptions freshness change drivers and save boundary',
    mycmUi.includes('progressTrustHtml')&&mycmUi.includes('Values you entered / numbers used')&&mycmUi.includes('Assumptions')&&mycmUi.includes('Freshness')&&mycmUi.includes('What could change this?')&&mycmUi.includes('Save boundary'));
  add('Batch 9 saved details expose source and last-updated context',mycmDash.includes('Last updated ${esc(factDate('));

  add('Batch 9 Continue with Google uses a multicolor Google G without changing the button wording',
    mycm.includes('Continue with Google')&&['#4285F4','#34A853','#FBBC05','#EA4335'].every(c=>mycm.includes(c))&&mycmCss.includes('.mycm-google-mark svg'));

  add('Batch 9 Ask result includes a progressive Trust Check with rationale values engines assumptions freshness change drivers and save boundary',
    ask.includes('Carrowmont Trust Check - verify this result')&&['askTrustWhy','askTrustValues','askEngineTrace','askAssumptions','askTrustFreshness','askTrustChange','askTrustBoundary'].every(id=>ask.includes(id))&&
    askJs.includes('Save boundary:')&&askJs.includes('Calculated from the values in this Ask session'));

  add('Batch 9 Trust Standard formally records the six-question contract and AI/deterministic boundary',
    trustStandard.includes('# 12. Carrowmont Trust Contract - Batch 9')&&trustStandard.includes('Which values did I enter?')&&trustStandard.includes('AI/conversational wording')&&trustStandard.includes('unsaved calculation is exploration'));
  add('Batch 9 implementation specification and acceptance ledger cover roadmap scope and 14-dimension impact review',
    spec.includes('## Carrowmont Trust Contract')&&spec.includes('## Exit gate')&&ledger.includes('14-dimension change-impact review')&&ledger.includes('No calculator formula or deterministic engine changes'));
  add('Batch 9 records the live Carrowmont Google support identity and published branding without committing a secret',
    google.includes('contact@carrowmont.com')&&google.includes('Branding verification is complete, published')&&google.includes('does not request sensitive or restricted Google scopes')&&!google.match(/client_secret\s*[:=]\s*[A-Za-z0-9_-]{12,}/i));

  const browser=readQa('tests/72-fre9-trust-transparency.spec.js');
  add('Batch 9 browser QA covers multicolor Google G My Carrowmont progress Trust Check Ask Trust Check tool Trust Check and responsive geometry',
    browser.includes('multicolor Google G')&&browser.includes('progress Trust Check')&&browser.includes('Ask Trust Check')&&browser.includes('tool Trust Check')&&browser.includes('assertNoHorizontalOverflow'));
  return checks;
}
