import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const qaRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const add = (checks, name, ok, detail = '') => checks.push({ name, ok:Boolean(ok), detail });
const close = (actual, expected, tolerance = 1e-9) => Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected));

export function runFreBorrowingHealthContract(sourceRoot) {
  const checks = [];
  const rel = {
    core:'draw004.github.io/debt-to-income-borrowing-health-core.js',
    html:'draw004.github.io/debt-to-income-borrowing-health-calculator.html',
    app:'draw004.github.io/debt-to-income-borrowing-health-calculator.js',
    css:'draw004.github.io/debt-to-income-borrowing-health-calculator.css',
    pdfExport:'draw004.github.io/debt-to-income-borrowing-health-pdf-export.js',
    pdfRenderer:'draw004.github.io/debt-to-income-borrowing-health-pdf-renderer.js',
    adapterContract:'draw004.github.io/assets/fre/engine-adapters.js',
    borrowingAdapters:'draw004.github.io/assets/fre/borrowing-health-engine-adapters.js',
    catalog:'draw004.github.io/assets/fre/engine-catalog.js',
    router:'draw004.github.io/assets/fre/intent-router.js',
    registry:'draw004.github.io/docs/CARROWMONT_FRE_ENGINE_REGISTRY_V5.json',
    ledger:'draw004.github.io/docs/CARROWMONT_FRE_BATCH2B_ACCEPTANCE_LEDGER.md',
    implementation:'draw004.github.io/docs/CARROWMONT_FRE_BATCH2B_DEBT_TO_INCOME_BORROWING_HEALTH.md'
  };
  const qaRel = { browserSpec:'tests/58-fre2b-borrowing-health.spec.js', qaConfig:'qa.config.js' };
  add(checks, 'Batch 2B tool core UI report adapter and continuity files exist', Object.values(rel).every(file => fs.existsSync(path.join(sourceRoot,file))) && Object.values(qaRel).every(file => fs.existsSync(path.join(qaRoot,file))));
  if (!checks[0].ok) return checks;

  let Core, AdapterContract, BorrowingAdapters;
  try {
    Core = require(path.join(sourceRoot,rel.core));
    AdapterContract = require(path.join(sourceRoot,rel.adapterContract));
    BorrowingAdapters = require(path.join(sourceRoot,rel.borrowingAdapters));
    add(checks, 'Borrowing-health core and FRE adapter load in Node isolation', true);
  } catch (error) {
    add(checks, 'Borrowing-health core and FRE adapter load in Node isolation', false, error.message);
    return checks;
  }
  add(checks, 'Borrowing-health core exposes stable deterministic v1 API', Core.VERSION === 'debt-to-income-borrowing-health-v1.0' && typeof Core.calculate === 'function');

  const baseInput={grossMonthlyIncome:120000,takeHomeMonthlyIncome:95000,essentialNonDebtExpenses:45000,housingDebtPayment:20000,otherLoanPayments:8000,creditCardMinimums:2000,otherDebtPayments:0,proposedNewDebtPayment:12000,incomeDropPct:15};
  const base=Core.calculate(baseInput);
  add(checks, 'Base fixture preserves exact current debt and current/proposed gross DTI', base.ok && base.currentDebtPayments===30000 && base.currentGrossDtiPct===25 && base.proposedDebtPayments===42000 && base.proposedGrossDtiPct===35 && base.dtiIncreasePctPoints===10);
  add(checks, 'Base fixture preserves take-home cash room before and after proposed payment', base.currentCashRoom===20000 && base.proposedCashRoom===8000 && base.proposedPaymentShareOfCurrentRoomPct===60 && base.classification==='PROPOSED_TIGHTENING');
  add(checks, 'Income-drop stress uses proposed debt and stressed gross income without hidden lender threshold', base.stressedGrossIncome===102000 && close(base.stressedGrossDtiPct,41.176471,1e-9));

  const empty=Core.calculate({});
  add(checks, 'Missing gross income blocks a false DTI answer', empty.ok===false && empty.classification==='NEEDS_GROSS_INCOME' && empty.currentGrossDtiPct===null && empty.warnings.some(w=>/gross monthly income/i.test(w)));
  const ratioOnly=Core.calculate({grossMonthlyIncome:100000,housingDebtPayment:25000,incomeDropPct:0});
  add(checks, 'Take-home income remains optional and ratio-only mode does not fabricate cash room', ratioOnly.ok && ratioOnly.currentGrossDtiPct===25 && ratioOnly.currentCashRoom===null && ratioOnly.classification==='RATIO_ONLY');
  const currentDeficit=Core.calculate({grossMonthlyIncome:100000,takeHomeMonthlyIncome:50000,essentialNonDebtExpenses:40000,otherLoanPayments:20000,proposedNewDebtPayment:0});
  add(checks, 'Existing commitments can surface a current monthly cash shortfall without a score', currentDeficit.currentCashRoom===-10000 && currentDeficit.classification==='CURRENT_DEFICIT');
  const proposedDeficit=Core.calculate({grossMonthlyIncome:100000,takeHomeMonthlyIncome:80000,essentialNonDebtExpenses:40000,otherLoanPayments:20000,proposedNewDebtPayment:30000});
  add(checks, 'Proposed borrowing surfaces a negative cash-room scenario explicitly', proposedDeficit.currentCashRoom===20000 && proposedDeficit.proposedCashRoom===-10000 && proposedDeficit.classification==='PROPOSED_DEFICIT');

  const registry=AdapterContract.createRegistry(); BorrowingAdapters.registerAll(registry,{borrowingHealth:Core});
  const envelope=registry.run('debt-to-income-borrowing-health',{currency:'INR',inputs:{state:baseInput}});
  add(checks, 'FRE borrowing adapter returns the standard deterministic envelope', registry.has('debt-to-income-borrowing-health') && envelope.engineId==='debt-to-income-borrowing-health' && envelope.engineVersion===Core.VERSION && envelope.metrics.currentGrossDtiPct===25 && envelope.metrics.proposedGrossDtiPct===35 && envelope.metrics.proposedCashRoom===8000);
  add(checks, 'FRE adapter explicitly rejects a universal DTI approval cutoff', envelope.assumptions.some(a=>a.id==='no-universal-dti-cutoff' && /does not apply a universal lender approval threshold/i.test(a.note||'')));

  const coreSource=fs.readFileSync(path.join(sourceRoot,rel.core),'utf8');
  const adapterSource=fs.readFileSync(path.join(sourceRoot,rel.borrowingAdapters),'utf8');
  const html=fs.readFileSync(path.join(sourceRoot,rel.html),'utf8');
  const app=fs.readFileSync(path.join(sourceRoot,rel.app),'utf8');
  add(checks, 'Borrowing-health core stays pure with no DOM storage account or network dependency', !/\b(document|window|fetch|XMLHttpRequest|localStorage|sessionStorage|indexedDB)\b/.test(coreSource));
  add(checks, 'FRE borrowing adapter delegates arithmetic to the core instead of duplicating DTI formulas', /core\.calculate\(inputs\.state\)/.test(adapterSource) && !/(grossMonthlyIncome\s*\/|currentDebtPayments\s*\/|proposedDebtPayments\s*\/)/.test(adapterSource));
  const corePos=html.indexOf('/debt-to-income-borrowing-health-core.js'), appPos=html.indexOf('/debt-to-income-borrowing-health-calculator.js');
  add(checks, 'Public page loads deterministic core before its UI app', corePos>=0 && appPos>corePos && /window\.CarrowmontBorrowingHealthCore/.test(app));
  add(checks, 'Public copy rejects universal DTI cutoffs and lender-approval prediction', /No universal DTI cutoff/i.test(html) && /does not apply a universal approval threshold/i.test(html) && /does not predict lender approval/i.test(html));
  add(checks, 'Public methodology separates gross-income DTI from take-home cash room and keeps inputs local', /Gross-income DTI/i.test(html) && /Cash room/i.test(html) && /does not send or store the financial amounts entered on this page/i.test(html));
  add(checks, 'Public actions expose Copy Summary CSV and Borrowing Health Report', ['copySummaryBtn','downloadCsvBtn','generateReportBtn'].every(id=>html.includes(`id="${id}"`)) && /carrowmont-debt-to-income-borrowing-health\.csv/.test(app));

  const registryV5=JSON.parse(fs.readFileSync(path.join(sourceRoot,rel.registry),'utf8'));
  const engine=registryV5.engines?.find(item=>item.id==='debt-to-income-borrowing-health');
  add(checks, 'Engine Registry V5 records 24 engines and preserves 59-region 48-currency localization', registryV5.schema_version===5 && registryV5.registry_id==='carrowmont-fre-engine-registry-v5' && registryV5.engines?.length===24 && registryV5.locale_contract?.regions===59 && registryV5.locale_contract?.currencies===48 && engine?.status==='READY_WITH_ADAPTER' && engine?.api==='CarrowmontBorrowingHealthCore');

  const tools=fs.readFileSync(path.join(sourceRoot,'draw004.github.io/tools.html'),'utf8');
  const home=fs.readFileSync(path.join(sourceRoot,'draw004.github.io/index.html'),'utf8');
  const sitemap=fs.readFileSync(path.join(sourceRoot,'draw004.github.io/sitemap.xml'),'utf8');
  const searchPages=JSON.parse(fs.readFileSync(path.join(sourceRoot,'draw004.github.io/data/carrowmont-search-pages.json'),'utf8'));
  const searchIndex=JSON.parse(fs.readFileSync(path.join(sourceRoot,'draw004.github.io/data/carrowmont-search-index.json'),'utf8'));
  const searchAliases=JSON.parse(fs.readFileSync(path.join(sourceRoot,'draw004.github.io/data/carrowmont-search-aliases.json'),'utf8'));
  const SearchCore=require(path.join(sourceRoot,'draw004.github.io/search-core.js'));
  const learnPages=['debt-consolidation-explained.html','how-credit-card-interest-works.html','how-is-loan-emi-calculated.html','mortgage-affordability-vs-lender-approval.html','cash-flow-vs-income.html'];
  add(checks, 'Tools Hub exposes 23 live tools including borrowing health while nine-card homepage stays unchanged', /"numberOfItems"\s*:\s*23/.test(tools) && /data-secondary-tool="debt-to-income-borrowing-health"/.test(tools) && (tools.match(/class="directory-tool-card/g)||[]).length===23 && (home.match(/data-tool-id=/g)||[]).length===9);
  add(checks, 'Sitemap and reviewed search inventory include the new canonical tool', sitemap.includes('<loc>https://carrowmont.com/debt-to-income-borrowing-health-calculator.html</loc>') && searchPages.entries?.length===136 && searchPages.entries?.some(item=>item.url==='/debt-to-income-borrowing-health-calculator.html'));
  const calcSearch=SearchCore.search(searchIndex.entries,searchAliases,'debt to income calculator',{region:'US',limit:12});
  const dtiSearch=SearchCore.search(searchIndex.entries,searchAliases,'dti calculator',{region:'IN',limit:12});
  const creditGuide=SearchCore.search(searchIndex.entries,searchAliases,'credit score explained',{region:'GB',limit:12});
  add(checks, 'Search intent sends DTI calculator queries to FRE2B while preserving educational credit-score ownership', calcSearch[0]?.url==='/debt-to-income-borrowing-health-calculator.html' && dtiSearch[0]?.url==='/debt-to-income-borrowing-health-calculator.html' && creditGuide[0]?.url==='/credit-score-explained.html');
  add(checks, 'Five relevant Learn pages provide contextual inbound discovery links with mobile-wrapping guide-note contract', learnPages.every(file=>{const text=fs.readFileSync(path.join(sourceRoot,'draw004.github.io',file),'utf8');return /<p class="guide-note seo-related-guides"><strong>Check your borrowing picture:<\/strong>\s*<a class="text-link" href="\/debt-to-income-borrowing-health-calculator\.html">/.test(text);}));

  const browserSpec=fs.readFileSync(path.join(qaRoot,qaRel.browserSpec),'utf8');
  add(checks, 'Browser QA protects privacy reports discovery and 1280/768/412/390/360 layouts', /financial inputs remain local/i.test(browserSpec) && /exact three-page PDF/i.test(browserSpec) && /nine-core homepage/i.test(browserSpec) && /\[1280,768,412,390,360\]/.test(browserSpec));
  const qaConfig=fs.readFileSync(path.join(qaRoot,qaRel.qaConfig),'utf8');
  add(checks, 'Central QA public-page expectation advances to 136 and includes borrowing health', /search1ExpectedPublicPages\s*=\s*136/.test(qaConfig) && /debt-to-income-borrowing-health-calculator\.html/.test(qaConfig));
  return checks;
}
