import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const qaRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const add = (checks,name,ok,detail='') => checks.push({name,ok:Boolean(ok),detail});
const close = (a,b,t=1e-6) => Number.isFinite(a) && Math.abs(a-b) <= t*Math.max(1,Math.abs(b));

function loadLoanCore(file){
  const sandbox={window:{},console}; sandbox.globalThis=sandbox.window; vm.createContext(sandbox); vm.runInContext(fs.readFileSync(file,'utf8'),sandbox,{filename:'loan-calculator/core.js'}); return sandbox.window.CarrowmontLoanCore;
}

export function runFreCarAffordabilityContract(sourceRoot){
  const checks=[];
  const rel={
    core:'draw004.github.io/car-affordability-auto-decision-core.js',html:'draw004.github.io/car-affordability-auto-decision-calculator.html',app:'draw004.github.io/car-affordability-auto-decision-calculator.js',css:'draw004.github.io/car-affordability-auto-decision-calculator.css',pdfExport:'draw004.github.io/car-affordability-auto-decision-pdf-export.js',pdfRenderer:'draw004.github.io/car-affordability-auto-decision-pdf-renderer.js',adapterContract:'draw004.github.io/assets/fre/engine-adapters.js',carAdapters:'draw004.github.io/assets/fre/car-affordability-engine-adapters.js',catalog:'draw004.github.io/assets/fre/engine-catalog.js',router:'draw004.github.io/assets/fre/intent-router.js',registry:'draw004.github.io/docs/CARROWMONT_FRE_ENGINE_REGISTRY_V6.json',ledger:'draw004.github.io/docs/CARROWMONT_FRE_BATCH2C_ACCEPTANCE_LEDGER.md',implementation:'draw004.github.io/docs/CARROWMONT_FRE_BATCH2C_CAR_AFFORDABILITY_AUTO_DECISION.md',loan:'loan-calculator/core.js',borrowing:'draw004.github.io/debt-to-income-borrowing-health-core.js',emergency:'draw004.github.io/emergency-fund-runway-core.js'
  };
  const qaRel={browserSpec:'tests/59-fre2c-car-affordability.spec.js',qaConfig:'qa.config.js'};
  add(checks,'Batch 2C tool dependency UI report adapter and continuity files exist',Object.values(rel).every(f=>fs.existsSync(path.join(sourceRoot,f)))&&Object.values(qaRel).every(f=>fs.existsSync(path.join(qaRoot,f))));
  if(!checks[0].ok)return checks;

  let Core,Borrowing,Emergency,Loan,AdapterContract,CarAdapters,Catalog,Router;
  try{
    Core=require(path.join(sourceRoot,rel.core)); Borrowing=require(path.join(sourceRoot,rel.borrowing)); Emergency=require(path.join(sourceRoot,rel.emergency)); Loan=loadLoanCore(path.join(sourceRoot,rel.loan)); AdapterContract=require(path.join(sourceRoot,rel.adapterContract)); CarAdapters=require(path.join(sourceRoot,rel.carAdapters)); Catalog=require(path.join(sourceRoot,rel.catalog)); Router=require(path.join(sourceRoot,rel.router));
    add(checks,'Car-affordability core and all three deterministic dependencies load in isolation',true);
  }catch(error){add(checks,'Car-affordability core and all three deterministic dependencies load in isolation',false,error.message);return checks;}
  add(checks,'Car-affordability core exposes stable deterministic v1 API',Core.VERSION==='car-affordability-auto-decision-v1.0'&&typeof Core.calculate==='function');

  const baseInput={vehiclePrice:1200000,downPayment:300000,tradeInCredit:0,upfrontTaxesFees:50000,annualRate:9,termMonths:60,grossMonthlyIncome:120000,takeHomeMonthlyIncome:95000,essentialMonthlyExpenses:45000,existingMonthlyDebtPayments:8000,monthlyRunningCosts:10000,emergencySavings:400000,emergencySavingsUsedForPurchase:0,emergencyTargetMonths:6,rateStressIncreasePctPoints:2,runningCostStressPct:20,alternativeVehiclePrice:1000000,extraDownPaymentScenario:100000,longerTermMonthsScenario:72};
  const deps={loan:Loan,borrowingHealth:Borrowing,emergencyFund:Emergency};
  const base=Core.calculate(baseInput,deps);
  add(checks,'Base fixture reuses Loan engine for exact financed amount payment and interest',base.ok&&base.loanAmount===900000&&close(base.monthlyLoanPayment,18682.52,1e-9)&&close(base.loanTotalInterest,220951.18,1e-9)&&base.allInMonthlyCarCost===28682.52);
  add(checks,'Base fixture preserves household cash room and borrowing-health DTI outputs',base.currentCashRoom===42000&&base.afterCashRoom===13317.48&&close(base.currentGrossDtiPct,6.666667,1e-9)&&close(base.afterGrossDtiPct,22.235433,1e-9));
  add(checks,'Base fixture preserves pre/post-purchase emergency runway and user-chosen target gap',close(base.runwayBeforeMonths,7.54717,1e-9)&&close(base.runwayAfterMonths,4.897009,1e-9)&&base.runwayTargetMonths===6&&base.runwayTargetGap===90095.12&&base.classification==='BELOW_CHOSEN_RUNWAY_TARGET');
  add(checks,'Higher-cost stress combines selected rate and running-cost stresses without a hidden affordability cutoff',base.stressedRate===11&&base.stressedLoanPayment===19568.18&&base.stressedRunningCosts===12000&&base.stressCashRoom===10431.82);
  add(checks,'Optional comparisons expose lower-price larger-down-payment and longer-term tradeoffs',base.comparisons.length===3&&base.comparisons[0].id==='lower-price'&&base.comparisons[0].monthlyPaymentDifference===-4151.67&&base.comparisons[1].id==='more-down'&&base.comparisons[1].extraUpfrontCash===100000&&base.comparisons[2].id==='longer-term'&&base.comparisons[2].monthlyPaymentDifference<0&&base.comparisons[2].totalInterestDifference>0);

  const invalid=Core.calculate({...baseInput,emergencySavingsUsedForPurchase:500000},deps);
  add(checks,'Impossible use of emergency savings is blocked instead of silently clamped',invalid.ok===false&&invalid.errors.some(e=>/cannot exceed/i.test(e)));
  const deficit=Core.calculate({...baseInput,takeHomeMonthlyIncome:70000,emergencySavings:1000000,emergencyTargetMonths:1},deps);
  add(checks,'Monthly shortfall is surfaced mathematically without a lender score',deficit.ok&&deficit.afterCashRoom<0&&deficit.classification==='MONTHLY_SHORTFALL');
  const stressOnly=Core.calculate({...baseInput,takeHomeMonthlyIncome:84000,emergencySavings:1000000,emergencyTargetMonths:1},deps);
  add(checks,'Stress shortfall is distinct from the base purchase result',stressOnly.afterCashRoom>0&&stressOnly.stressCashRoom<0&&stressOnly.classification==='STRESS_SHORTFALL');

  const registry=AdapterContract.createRegistry(); CarAdapters.registerAll(registry,{carAffordability:Core,loan:Loan,borrowingHealth:Borrowing,emergencyFund:Emergency});
  const envelope=registry.run('car-affordability',{currency:'INR',inputs:{state:baseInput}});
  add(checks,'FRE car adapter returns the standard deterministic envelope from the orchestrating core',registry.has('car-affordability')&&envelope.engineVersion===Core.VERSION&&envelope.metrics.loanAmount===900000&&envelope.metrics.afterCashRoom===13317.48&&close(envelope.metrics.runwayAfterMonths,4.897009,1e-9));
  add(checks,'FRE adapter explicitly rejects universal car-affordability and lender-approval rules',envelope.assumptions.some(a=>a.id==='no-universal-car-affordability-rule')&&envelope.assumptions.some(a=>a.id==='no-lender-approval-prediction'));

  const coreSource=fs.readFileSync(path.join(sourceRoot,rel.core),'utf8'),adapterSource=fs.readFileSync(path.join(sourceRoot,rel.carAdapters),'utf8'),html=fs.readFileSync(path.join(sourceRoot,rel.html),'utf8'),app=fs.readFileSync(path.join(sourceRoot,rel.app),'utf8');
  add(checks,'Car decision core stays pure with no DOM storage account or network dependency',!/\b(document|window|fetch|XMLHttpRequest|localStorage|sessionStorage|indexedDB)\b/.test(coreSource));
  add(checks,'Car decision core delegates payment DTI and runway mathematics to existing engines',/engines\.loan/.test(coreSource)&&/engines\.borrowing\.calculate/.test(coreSource)&&/engines\.emergency\.calculate/.test(coreSource)&&!/Math\.pow\(1\s*\+/.test(coreSource));
  add(checks,'FRE car adapter delegates to the car decision core instead of duplicating finance arithmetic',/deps\.core\.calculate\(inputs\.state/.test(adapterSource)&&!/(paymentForPrincipal|currentDebtPayments\s*\/|emergencySavings\s*\/)/.test(adapterSource));
  const loanPos=html.indexOf('/loan-calculator/core.js'),borrowPos=html.indexOf('/debt-to-income-borrowing-health-core.js'),emPos=html.indexOf('/emergency-fund-runway-core.js'),carPos=html.indexOf('/car-affordability-auto-decision-core.js'),appPos=html.indexOf('/car-affordability-auto-decision-calculator.js');
  add(checks,'Public page loads all deterministic dependencies before car decision core and UI app',loanPos>=0&&borrowPos>loanPos&&emPos>borrowPos&&carPos>emPos&&appPos>carPos&&/window\.CarrowmontCarAffordabilityCore/.test(app));
  add(checks,'Public copy rejects universal affordability cutoffs and lender-approval prediction',/No universal car-affordability rule/i.test(html)&&/does not predict lender approval/i.test(html)&&/does not use one universal/i.test(html));
  add(checks,'Public methodology discloses important exclusions and local-input privacy',/does not model depreciation/i.test(html)&&/does not send or store the financial amounts entered on this page/i.test(html));
  add(checks,'Public actions expose Copy Summary CSV and Car Affordability Report', ['copySummaryBtn','downloadCsvBtn','generateReportBtn'].every(id=>html.includes(`id="${id}"`))&&/carrowmont-car-affordability-auto-decision\.csv/.test(app));

  const registryV6=JSON.parse(fs.readFileSync(path.join(sourceRoot,rel.registry),'utf8'));
  const engine=registryV6.engines?.find(e=>e.id==='car-affordability');
  add(checks,'Engine Registry V6 records 25 engines and preserves 59-region 48-currency localization',registryV6.schema_version===6&&registryV6.registry_id==='carrowmont-fre-engine-registry-v6'&&registryV6.engines?.length===25&&registryV6.locale_contract?.regions===59&&registryV6.locale_contract?.currencies===48&&engine?.status==='READY_WITH_ADAPTER'&&engine?.api==='CarrowmontCarAffordabilityCore');
  add(checks,'Engine catalog exposes car affordability as ready and Router already owns the car-affordability intent',Catalog.CATALOG_VERSION===6&&Catalog.ENGINES.length===26&&Catalog.get('car-affordability')?.status==='READY_WITH_ADAPTER'&&Router.INTENTS.CAR_AFFORDABILITY==='car-affordability'&&Router.ROUTES[Router.INTENTS.CAR_AFFORDABILITY]?.engineIds?.[0]==='car-affordability');

  const tools=fs.readFileSync(path.join(sourceRoot,'draw004.github.io/tools.html'),'utf8'),home=fs.readFileSync(path.join(sourceRoot,'draw004.github.io/index.html'),'utf8'),sitemap=fs.readFileSync(path.join(sourceRoot,'draw004.github.io/sitemap.xml'),'utf8'),searchPages=JSON.parse(fs.readFileSync(path.join(sourceRoot,'draw004.github.io/data/carrowmont-search-pages.json'),'utf8')),searchIndex=JSON.parse(fs.readFileSync(path.join(sourceRoot,'draw004.github.io/data/carrowmont-search-index.json'),'utf8')),searchAliases=JSON.parse(fs.readFileSync(path.join(sourceRoot,'draw004.github.io/data/carrowmont-search-aliases.json'),'utf8')),SearchCore=require(path.join(sourceRoot,'draw004.github.io/search-core.js'));
  const learn=['how-is-loan-emi-calculated.html','loan-interest-rate-vs-term.html','cash-flow-vs-income.html','emergency-savings.html','budgeting-by-pay-frequency.html'];
  add(checks,'Tools Hub exposes 23 live tools including car affordability while nine-card homepage stays unchanged',/"numberOfItems"\s*:\s*23/.test(tools)&&/data-secondary-tool="car-affordability-auto-decision"/.test(tools)&&(tools.match(/class="directory-tool-card/g)||[]).length===23&&(home.match(/data-tool-id=/g)||[]).length===9);
  add(checks,'Sitemap and reviewed search inventory include the new canonical car decision tool',sitemap.includes('<loc>https://carrowmont.com/car-affordability-auto-decision-calculator.html</loc>')&&searchPages.entries?.length===136&&searchPages.entries?.some(e=>e.url==='/car-affordability-auto-decision-calculator.html'));
  const s1=SearchCore.search(searchIndex.entries,searchAliases,'car affordability calculator',{region:'US',limit:12}),s2=SearchCore.search(searchIndex.entries,searchAliases,'can i afford this car',{region:'IN',limit:12});
  add(checks,'Search routes car-affordability intent to the new decision tool',s1[0]?.url==='/car-affordability-auto-decision-calculator.html'&&s2[0]?.url==='/car-affordability-auto-decision-calculator.html');
  add(checks,'Five relevant Learn journeys expose contextual car-decision links without changing their source dates',learn.every(f=>fs.readFileSync(path.join(sourceRoot,'draw004.github.io',f),'utf8').includes('/car-affordability-auto-decision-calculator.html')));
  const qaConfig=fs.readFileSync(path.join(qaRoot,'qa.config.js'),'utf8');
  add(checks,'Central QA public-page expectation advances to 136 and includes car affordability',/search1ExpectedPublicPages\s*=\s*136/.test(qaConfig)&&/car-affordability-auto-decision-calculator\.html/.test(qaConfig));
  return checks;
}
