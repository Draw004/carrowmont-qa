import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const qaRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const add = (checks, name, ok, detail = '') => checks.push({ name, ok:Boolean(ok), detail });
const close = (actual, expected, tolerance = 1e-9) => Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected));

export function runFreEmergencyRunwayContract(sourceRoot) {
  const checks = [];
  const rel = {
    core:'draw004.github.io/emergency-fund-runway-core.js',
    html:'draw004.github.io/emergency-fund-runway-calculator.html',
    app:'draw004.github.io/emergency-fund-runway-calculator.js',
    css:'draw004.github.io/emergency-fund-runway-calculator.css',
    pdfExport:'draw004.github.io/emergency-fund-runway-pdf-export.js',
    pdfRenderer:'draw004.github.io/emergency-fund-runway-pdf-renderer.js',
    adapterContract:'draw004.github.io/assets/fre/engine-adapters.js',
    resilienceAdapters:'draw004.github.io/assets/fre/resilience-engine-adapters.js',
    catalog:'draw004.github.io/assets/fre/engine-catalog.js',
    router:'draw004.github.io/assets/fre/intent-router.js',
    registry:'draw004.github.io/docs/CARROWMONT_FRE_ENGINE_REGISTRY_V4.json',
    ledger:'draw004.github.io/docs/CARROWMONT_FRE_BATCH2A_ACCEPTANCE_LEDGER.md',
    implementation:'draw004.github.io/docs/CARROWMONT_FRE_BATCH2A_EMERGENCY_FUND_RUNWAY.md'
  };
  const qaRel = {
    browserSpec:'tests/57-fre2a-emergency-fund-runway.spec.js',
    qaConfig:'qa.config.js'
  };
  add(checks, 'Batch 2A tool core UI report adapter and continuity files exist',
    Object.values(rel).every(file => fs.existsSync(path.join(sourceRoot,file))) &&
    Object.values(qaRel).every(file => fs.existsSync(path.join(qaRoot,file)))
  );
  if (!checks[0].ok) return checks;

  let Core, AdapterContract, ResilienceAdapters;
  try {
    Core = require(path.join(sourceRoot,rel.core));
    AdapterContract = require(path.join(sourceRoot,rel.adapterContract));
    ResilienceAdapters = require(path.join(sourceRoot,rel.resilienceAdapters));
    add(checks, 'Emergency-runway core and FRE resilience adapter load in Node isolation', true);
  } catch (error) {
    add(checks, 'Emergency-runway core and FRE resilience adapter load in Node isolation', false, error.message);
    return checks;
  }

  add(checks, 'Emergency-runway core exposes stable v1 deterministic API and locked 3-6 reference range', Core.VERSION === 'emergency-fund-runway-v1.0' && typeof Core.calculate === 'function' && Core.REFERENCE_RANGE?.low === 3 && Core.REFERENCE_RANGE?.high === 6);

  const baseInput = { essentialExpenses:60000, debtPayments:10000, otherCommitments:5000, emergencySavings:300000, otherLiquidCash:50000, includeOtherLiquidCash:false, targetMonths:6, monthlyContribution:15000, disruptionIncome:0, shockCost:50000 };
  const base = Core.calculate(baseInput);
  add(checks, 'Base runway fixture preserves exact monthly need reserve target gap and build time', base.ok && base.monthlyNeed === 75000 && base.reserve === 300000 && base.fullLossRunwayMonths === 4 && base.targetAmount === 450000 && base.targetGap === 150000 && base.monthsToTarget === 10 && base.classification === 'BUILDING');
  add(checks, 'Base stress fixture preserves post-shock reserve burn and stressed runway', base.postShockReserve === 250000 && base.stressMonthlyBurn === 75000 && close(base.stressedRunwayMonths,3.333333,1e-6));
  add(checks, 'Reference amounts are derived from essential need but remain separate from user target', base.referenceLowAmount === 225000 && base.referenceHighAmount === 450000 && base.referenceRangeMonths.low === 3 && base.referenceRangeMonths.high === 6 && base.assumptions.targetMonths === 6);

  const excluded = Core.calculate({...baseInput,otherLiquidCash:90000,includeOtherLiquidCash:false});
  const included = Core.calculate({...baseInput,otherLiquidCash:90000,includeOtherLiquidCash:true});
  add(checks, 'Other liquid cash is excluded unless the user explicitly elects to count it', excluded.reserve === 300000 && included.reserve === 390000 && included.fullLossRunwayMonths === 5.2 && included.warnings.some(w => /only because you chose/i.test(w)));

  const empty = Core.calculate({});
  add(checks, 'Zero essential need blocks a false runway answer', empty.ok === false && empty.classification === 'NEEDS_EXPENSE_INPUT' && empty.fullLossRunwayMonths === null && empty.warnings.some(w => /Enter at least one monthly essential/i.test(w)));

  const covered = Core.calculate({essentialExpenses:50000,emergencySavings:400000,targetMonths:6,monthlyContribution:0});
  add(checks, 'Target-covered case reports no gap and zero months to target', covered.classification === 'TARGET_COVERED' && covered.fullLossRunwayMonths === 8 && covered.targetGap === 0 && covered.monthsToTarget === 0);

  const incomeCovered = Core.calculate({essentialExpenses:50000,emergencySavings:200000,targetMonths:6,disruptionIncome:60000,shockCost:10000});
  add(checks, 'Stress scenario does not fabricate a finite runway when continuing income covers modeled need', incomeCovered.stressMonthlyBurn === 0 && incomeCovered.stressedRunwayMonths === null && incomeCovered.warnings.some(w => /covers the modeled monthly need/i.test(w)));

  const first = Core.calculate({essentialExpenses:50000,emergencySavings:10000,targetMonths:6,monthlyContribution:10000});
  add(checks, 'First-buffer milestone exposes exact gap and build time', first.classification === 'FIRST_BUFFER' && first.firstStageAmount === 50000 && first.firstStageGap === 40000 && first.monthsToFirstStage === 4);

  const noContribution = Core.calculate({essentialExpenses:50000,emergencySavings:100000,targetMonths:6,monthlyContribution:0});
  add(checks, 'A funding gap without contribution stays unknown rather than inventing a build time', noContribution.targetGap === 200000 && noContribution.monthsToTarget === null && noContribution.warnings.some(w => /Add a monthly contribution/i.test(w)));

  const registry = AdapterContract.createRegistry();
  ResilienceAdapters.registerAll(registry,{ emergencyFund:Core });
  const envelope = registry.run('emergency-fund-runway',{ currency:'INR', inputs:{ state:baseInput } });
  add(checks, 'FRE resilience adapter registers the engine and returns a standard deterministic envelope', registry.has('emergency-fund-runway') && envelope.engineId === 'emergency-fund-runway' && envelope.engineVersion === Core.VERSION && envelope.currency === 'INR' && envelope.metrics.monthlyNeed === 75000 && envelope.metrics.runwayMonths === 4 && envelope.metrics.targetGap === 150000 && envelope.raw.methodologyVersion === Core.VERSION);
  add(checks, 'FRE adapter labels target months as user chosen rather than a universal recommendation', envelope.assumptions.some(a => a.id === 'target-months' && /User-chosen planning target/i.test(a.note || '')));

  const coreSource = fs.readFileSync(path.join(sourceRoot,rel.core),'utf8');
  const adapterSource = fs.readFileSync(path.join(sourceRoot,rel.resilienceAdapters),'utf8');
  const html = fs.readFileSync(path.join(sourceRoot,rel.html),'utf8');
  const app = fs.readFileSync(path.join(sourceRoot,rel.app),'utf8');
  add(checks, 'Emergency-runway deterministic core stays pure with no DOM storage account or network dependency', !/\b(document|window|fetch|XMLHttpRequest|localStorage|sessionStorage|indexedDB)\b/.test(coreSource));
  add(checks, 'FRE resilience adapter delegates arithmetic to the core instead of duplicating formulas', /core\.calculate\(inputs\.state\)/.test(adapterSource) && !/(essentialExpenses\s*\+\s*|reserve\s*\/\s*|monthlyNeed\s*\*)/.test(adapterSource));
  const corePos = html.indexOf('/emergency-fund-runway-core.js');
  const appPos = html.indexOf('/emergency-fund-runway-calculator.js');
  add(checks, 'Public page loads deterministic core before its UI app', corePos >= 0 && appPos > corePos && /window\.CarrowmontEmergencyFundCore/.test(app));
  add(checks, 'Public copy keeps 3-6 months explicitly contextual and the planning target user chosen', /Reference point, not a rule/i.test(html) && /does not force a universal target/i.test(html) && /context only, not Carrowmont choosing your target/i.test(app));
  add(checks, 'Public methodology explicitly discloses no country-specific support assumption and no storage of entered financial amounts', /does not model tax, benefits eligibility, insurance claims or country-specific support systems/i.test(html) && /does not send or store the financial amounts entered on this page/i.test(html));
  add(checks, 'Public actions expose Copy Summary CSV and Runway Report', ['copySummaryBtn','downloadCsvBtn','generateReportBtn'].every(id => html.includes(`id="${id}"`)) && /carrowmont-emergency-fund-runway\.csv/.test(app));

  const registryV4 = JSON.parse(fs.readFileSync(path.join(sourceRoot,rel.registry),'utf8'));
  const engine = registryV4.engines?.find(item => item.id === 'emergency-fund-runway');
  add(checks, 'Engine Registry V4 records 23 engines and preserves 59-region 48-currency localization', registryV4.schema_version === 4 && registryV4.registry_id === 'carrowmont-fre-engine-registry-v4' && registryV4.engines?.length === 23 && registryV4.locale_contract?.regions === 59 && registryV4.locale_contract?.currencies === 48 && engine?.status === 'READY_WITH_ADAPTER' && engine?.api === 'CarrowmontEmergencyFundCore');

  const tools = fs.readFileSync(path.join(sourceRoot,'draw004.github.io/tools.html'),'utf8');
  const sitemap = fs.readFileSync(path.join(sourceRoot,'draw004.github.io/sitemap.xml'),'utf8');
  const searchPages = JSON.parse(fs.readFileSync(path.join(sourceRoot,'draw004.github.io/data/carrowmont-search-pages.json'),'utf8'));
  const searchIndex = JSON.parse(fs.readFileSync(path.join(sourceRoot,'draw004.github.io/data/carrowmont-search-index.json'),'utf8'));
  const searchAliases = JSON.parse(fs.readFileSync(path.join(sourceRoot,'draw004.github.io/data/carrowmont-search-aliases.json'),'utf8'));
  const SearchCore = require(path.join(sourceRoot,'draw004.github.io/search-core.js'));
  const learnPages = ['emergency-fund-how-much.html','emergency-savings.html','sinking-fund-vs-emergency-fund.html','how-to-make-a-budget.html','budgeting-with-irregular-income.html'];
  add(checks, 'Tools Hub exposes 21 live tools including Emergency Fund & Runway', /"numberOfItems"\s*:\s*21/.test(tools) && /data-secondary-tool="emergency-fund-runway"/.test(tools) && (tools.match(/class="directory-tool-card/g) || []).length === 21);
  add(checks, 'Sitemap and reviewed search inventory include the new canonical tool', sitemap.includes('<loc>https://carrowmont.com/emergency-fund-runway-calculator.html</loc>') && searchPages.entries?.length === 134 && searchPages.entries?.some(item => item.url === '/emergency-fund-runway-calculator.html'));
  const calcSearch = SearchCore.search(searchIndex.entries, searchAliases, 'emergency fund calculator', { region:'US', limit:12 });
  const runwaySearch = SearchCore.search(searchIndex.entries, searchAliases, 'financial runway calculator', { region:'IN', limit:12 });
  const guideSearch = SearchCore.search(searchIndex.entries, searchAliases, 'how much emergency fund', { region:'CA', limit:12 });
  add(checks, 'Search intent sends calculator queries to FRE2A while preserving informational emergency-fund ownership', calcSearch[0]?.url === '/emergency-fund-runway-calculator.html' && runwaySearch[0]?.url === '/emergency-fund-runway-calculator.html' && guideSearch[0]?.url === '/emergency-fund-how-much.html');
  add(checks, 'Five relevant Learn pages provide contextual inbound discovery links', learnPages.every(file => fs.readFileSync(path.join(sourceRoot,'draw004.github.io',file),'utf8').includes('href="/emergency-fund-runway-calculator.html"')));
  add(checks, 'New Learn runway CTAs use the established mobile-wrapping related-guide contract', learnPages.every(file => /<p class="guide-note seo-related-guides"><strong>Calculate your runway:<\/strong>\s*<a class="text-link" href="\/emergency-fund-runway-calculator\.html">/.test(fs.readFileSync(path.join(sourceRoot,'draw004.github.io',file),'utf8'))));

  const browserSpec = fs.readFileSync(path.join(qaRoot,qaRel.browserSpec),'utf8');
  add(checks, 'Browser QA protects privacy reports discovery and 1280/768/412/390/360 responsive layouts', /financial inputs remain local/i.test(browserSpec) && /exact three-page PDF/i.test(browserSpec) && /nine-core homepage/i.test(browserSpec) && /\[1280,768,412,390,360\]/.test(browserSpec));

  const qaConfig = fs.readFileSync(path.join(qaRoot,qaRel.qaConfig),'utf8');
  add(checks, 'Central QA public-page expectation advances to 134 pages and includes the runway tool', /search1ExpectedPublicPages\s*=\s*134/.test(qaConfig) && /emergency-fund-runway-calculator\.html/.test(qaConfig));

  return checks;
}
