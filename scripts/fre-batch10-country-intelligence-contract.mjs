import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function runFreBatch10CountryIntelligenceContract(root){
  const checks=[];const add=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail});
  const read=rel=>{const p=path.join(root,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const qaRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const readQa=rel=>{const p=path.join(qaRoot,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const dataText=read('draw004.github.io/data/country-financial-reference.json');
  let data=null;try{data=JSON.parse(dataText);}catch{}
  const markets=data?.markets||{};
  const expected=['IN','US','GB','CA','AU'];
  const sourceDomains=['rbi.org.in','federalreserve.gov','bankofengland.co.uk','bankofcanada.ca','rba.gov.au'];
  const context=read('draw004.github.io/assets/trust/carrowmont-trust.js');
  const css=read('draw004.github.io/assets/trust/carrowmont-trust.css');
  const methodology=read('draw004.github.io/methodology.html');
  const spec=read('draw004.github.io/docs/CARROWMONT_FRE_BATCH10_COUNTRY_AWARE_FINANCIAL_INTELLIGENCE.md');
  const ledger=read('draw004.github.io/docs/CARROWMONT_FRE_BATCH10_ACCEPTANCE_LEDGER.md');
  const toolPages=[
    'draw004.github.io/home-affordability-calculator.html',
    'draw004.github.io/debt-to-income-borrowing-health-calculator.html',
    'draw004.github.io/car-affordability-auto-decision-calculator.html',
    'draw004.github.io/emergency-fund-runway-calculator.html',
    'sip-calculator/index.html','compound-interest-calculator/index.html','loan-calculator/index.html','mortgage-payoff-calculator/index.html',
    'retirement-calculator/planner.html','inflation-calculator/index.html','goal-planner/index.html','financial-independence/index.html','budget-cash-flow-planner/index.html'
  ];
  const urls=[];for(const code of expected){const m=markets[code];if(m?.policyRate?.sourceUrl)urls.push(m.policyRate.sourceUrl);if(m?.inflationReference?.sourceUrl)urls.push(m.inflationReference.sourceUrl);}
  add('Batch 10 verified reference model is valid JSON with the five priority markets',Boolean(data)&&expected.every(code=>markets[code])&&data.reviewedAt==='2026-11-17');
  add('Batch 10 each priority market has a policy reference, inflation reference and official source links',expected.every(code=>markets[code]?.policyRate?.display&&markets[code]?.inflationReference?.display&&markets[code]?.policyRate?.sourceUrl&&markets[code]?.inflationReference?.sourceUrl));
  add('Batch 10 source domains are restricted to the five official central-bank authorities',urls.length===10&&urls.every(url=>sourceDomains.some(domain=>{try{return new URL(url).hostname.endsWith(domain);}catch{return false;}})),urls.join(', '));
  add('Batch 10 policy-rate entries carry an as-of date and the reference set carries a review date',expected.every(code=>/^2026-\d{2}-\d{2}$/.test(markets[code]?.policyRate?.asOf||''))&&/^2026-\d{2}-\d{2}$/.test(data?.reviewedAt||''));
  add('Batch 10 shared runtime follows CarrowmontLocale and hides unsupported markets instead of inventing context',context.includes('CarrowmontLocale')&&context.includes("const market=data?.markets?.[region]")&&context.includes('if(!market){if(host)host.hidden=true;return host;}')&&(context.includes("root.addEventListener('carrowmont:localechange',render)")||context.includes("window.addEventListener('carrowmont:localechange',render)")));
  add('Batch 10 runtime keeps official references contextual and never writes calculator/account data',context.includes('does not automatically replace an entered interest rate')&&context.includes('not your lender')&&context.includes('not a forecast')&&!/localStorage|sessionStorage|supabase|CarrowmontAccount|\.value\s*=/.test(context));
  add('Batch 10 shared runtime embeds the verified release reference and exposes a reusable API for later Ask work without a new runtime fetch dependency',context.includes("const REFERENCE=")&&context.includes('Promise.resolve(REFERENCE)')&&context.includes('getReference(region)')&&context.includes('CarrowmontCountryIntelligence')&&!context.includes('fetch(DATA_URL'));
  add('Batch 10 embedded runtime matches the reviewed five-market source record',expected.every(code=>{const m=markets[code];return context.includes(JSON.stringify(m.country))&&context.includes(JSON.stringify(m.policyRate.display))&&context.includes(JSON.stringify(m.inflationReference.display))&&context.includes(JSON.stringify(m.policyRate.sourceUrl))&&context.includes(JSON.stringify(m.inflationReference.sourceUrl));}));
  add('Batch 10 responsive Country Context styling uses a collapsed two-column-to-one-column presentation',css.includes('.cm-country-context')&&css.includes('grid-template-columns:repeat(2,minmax(0,1fr))')&&css.includes('@media(max-width:700px)')&&css.includes('grid-template-columns:1fr'));
  add('Batch 10 loads Country Context on all 13 selected primary tool surfaces through the established Trust asset path',toolPages.every(rel=>read(rel).includes('/assets/trust/carrowmont-trust.js?v=20261117-fre10b')&&read(rel).includes('data-cm-country-context-auto')),toolPages.filter(rel=>!read(rel).includes('/assets/trust/carrowmont-trust.js?v=20261117-fre10b')).join(', '));
  add('Batch 10 selected tool pages no longer request the deployment-sensitive country-intelligence asset path',toolPages.every(rel=>!read(rel).includes('/assets/country-intelligence/')));
  add('Batch 10 methodology explains five-market scope, official-source dates and no automatic override',methodology.includes('Country-aware official reference context')&&methodology.includes('India, the United States, the United Kingdom, Canada and Australia')&&methodology.includes('never replace the values a user enters or saves'));
  add('Batch 10 implementation and acceptance records preserve formula, FX, tax/regulatory, account and Trust boundaries',spec.includes('does not automatically write an official rate')&&spec.includes('does not perform automatic FX conversion')&&spec.includes('tax, pension, benefit, lender-eligibility or regulatory engines')&&ledger.includes('No calculator formula or deterministic engine changed')&&ledger.includes('No Supabase schema, Google OAuth or account-ownership change'));
  const browser=readQa('tests/74-fre10-country-intelligence.spec.js');
  add('Batch 10 browser QA covers all five supported markets, unsupported fallback, role copy, no input overwrite and mobile geometry',expected.every(code=>browser.includes(`'${code}'`))&&browser.includes("'NZ'")&&browser.includes('do not overwrite')&&browser.includes('not today')&&browser.includes('assertNoHorizontalOverflow'));
  return checks;
}
