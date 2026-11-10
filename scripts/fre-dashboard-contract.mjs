import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);

export function runFreDashboardContract(root){
  const checks=[]; const add=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail});
  const main=path.join(root,'draw004.github.io');
  const storeFile=path.join(main,'assets/fre/dashboard-store.js');
  const pageFile=path.join(main,'my-carrowmont.html');
  const uiFile=path.join(main,'assets/dashboard/my-carrowmont.js');
  add('Batch 6 dashboard store and public page exist',fs.existsSync(storeFile)&&fs.existsSync(pageFile)&&fs.existsSync(uiFile));
  if(!fs.existsSync(storeFile)) return checks;
  const Store=require(storeFile);
  let profile=Store.create({region:'NZ',currency:'NZD',now:'2026-11-10T00:00:00Z'});
  profile=Store.setFact(profile,'cashFlow.takeHomeIncome',6000,{source:'contract'});
  profile=Store.setFact(profile,'resilience.emergencySavings',12000,{source:'contract'});
  add('dashboard fact contract supports add read ignore and remove',Store.getFact(profile,'cashFlow.takeHomeIncome')?.value===6000 && Store.getFact(Store.setExcluded(profile,'cashFlow.takeHomeIncome',true),'cashFlow.takeHomeIncome')===null && !Store.hasFact(Store.removeFact(profile,'resilience.emergencySavings'),'resilience.emergencySavings'));

  function fakeStorage(){const map=new Map();return{getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k),clear:()=>map.clear(),dump:()=>Object.fromEntries(map)};}
  const sessionStorage=fakeStorage(),localStorage=fakeStorage();
  const browser=Store.createBrowserStore({sessionStorage,localStorage});
  let saved=browser.save(profile,'session');
  add('dashboard persistence defaults can remain session-only',saved.mode==='session'&&Boolean(sessionStorage.getItem(Store.SESSION_KEY))&&!localStorage.getItem(Store.LOCAL_KEY));
  saved=browser.save(saved,'local');
  add('Remember on this device moves the profile to local storage and removes the session copy',saved.mode==='local'&&Boolean(localStorage.getItem(Store.LOCAL_KEY))&&!sessionStorage.getItem(Store.SESSION_KEY));
  saved=browser.save(saved,'session');
  add('switching back to session-only removes the persistent copy',saved.mode==='session'&&Boolean(sessionStorage.getItem(Store.SESSION_KEY))&&!localStorage.getItem(Store.LOCAL_KEY));
  browser.clear();
  add('Clear dashboard removes both guest storage keys',!sessionStorage.getItem(Store.SESSION_KEY)&&!localStorage.getItem(Store.LOCAL_KEY));

  const mpFacts={monthlyIncome:6000,essentialExpenses:2500,flexibleExpenses:1000,monthlyDebtPayments:400,emergencySavings:1000,emergencyTargetMonths:3,debtBalance:5000,highestDebtAprPct:18,assumedLongTermReturnPct:5,retirementSavings:10000,retirementMonthlyContribution:0,goalTargetAmount:12000,goalCurrentSavings:2000,goalYearsAway:2,goalMonthlyContribution:200};
  const imported=Store.captureAskJourney(Store.create(),'money-priorities',mpFacts,{locale:{region:'US',currency:'USD'},currency:'USD'});
  add('Money Priorities import maps compatible facts only after an explicit capture call',Store.getFact(imported,'cashFlow.takeHomeIncome')?.value===6000&&Store.getFact(imported,'debt.highestAprPct')?.value===18&&Store.getFact(imported,'goal.targetAmount')?.value===12000&&imported.lastImport?.intent==='money-priorities');

  const page=fs.readFileSync(pageFile,'utf8'),ui=fs.readFileSync(uiFile,'utf8'),storeSource=fs.readFileSync(storeFile,'utf8'),ask=fs.readFileSync(path.join(main,'assets/ask/ask-carrowmont.js'),'utf8'),askHtml=fs.readFileSync(path.join(main,'ask-carrowmont.html'),'utf8');
  add('dashboard exposes eight roadmap summary cards', ['mycmCashFlowCard','mycmEmergencyCard','mycmDebtCard','mycmBorrowingCard','mycmRetirementCard','mycmGoalCard','mycmFiCard','mycmPrioritiesCard'].every(id=>page.includes(`id="${id}"`)));
  add('dashboard exposes What Carrowmont knows plus edit remove ignore and clear controls',page.includes('What Carrowmont knows about you')&&ui.includes('data-mycm-influence')&&ui.includes('data-mycm-remove')&&ui.includes('data-mycm-edit')&&page.includes('id="mycmClear"'));
  add('dashboard defaults to session storage and local persistence requires explicit user choice',storeSource.includes("mode:MODES.includes(options.mode)?options.mode:'session'")&&page.includes('Remember on this device')&&ui.includes("e.target.checked?'local':'session'"));
  add('dashboard calculation layer reuses deterministic engines and makes no network calls',ui.includes('CarrowmontBudgetCore.calculate')&&ui.includes('CarrowmontEmergencyFundCore.calculate')&&ui.includes('CarrowmontBorrowingHealthCore.calculate')&&ui.includes('CarrowmontGoalCore.calculate')&&ui.includes('CarrowmontFICore.result')&&ui.includes('CarrowmontMoneyPriorities.create')&&!/(?:\bfetch\s*\(|XMLHttpRequest|WebSocket)/.test(ui+'\n'+storeSource));
  add('Ask Carrowmont dashboard persistence is explicit rather than automatic',askHtml.includes('Use these answers in My Carrowmont')&&ask.includes('saveToDashboard')&&ask.includes('captureAskJourney')&&ask.includes('captureAskJourney(current,lastResult.intent,state.facts'));
  add('Ask trust copy states that results are not saved automatically',askHtml.includes('Not saved automatically')&&askHtml.includes('My Carrowmont saves only when you choose it'));
  const privacy=fs.readFileSync(path.join(main,'privacy.html'),'utf8');
  add('privacy policy documents session default local opt-in and user controls',privacy.includes('My Carrowmont guest dashboard')&&privacy.includes('current browser session')&&privacy.includes('Remember on this device')&&privacy.includes('edit or remove individual values'));
  const pages=JSON.parse(fs.readFileSync(path.join(main,'data/carrowmont-search-pages.json'),'utf8'));
  const index=JSON.parse(fs.readFileSync(path.join(main,'data/carrowmont-search-index.json'),'utf8'));
  const sitemap=fs.readFileSync(path.join(main,'sitemap.xml'),'utf8');
  add('My Carrowmont is reviewed public page 138 without adding a calculator',pages.entries?.length===138&&index.entries?.length===138&&pages.entries?.some(e=>e.url==='/my-carrowmont.html'&&e.type==='carrowmont')&&sitemap.includes('<loc>https://carrowmont.com/my-carrowmont.html</loc>')&&/"numberOfItems"\s*:\s*23/.test(fs.readFileSync(path.join(main,'tools.html'),'utf8')));
  const site=fs.readFileSync(path.join(main,'site.js'),'utf8');
  add('My Carrowmont is a first-level desktop and mobile destination while About/Learn remain available secondarily',site.includes("var order = ['/','/my-carrowmont.html','/tools.html','/ask-carrowmont.html','/learn.html','/research.html','/search.html']")&&site.includes("{ key: 'my', label: 'My Money', href: '/my-carrowmont.html' }")&&site.includes('<span>Learn</span>')&&site.includes('<span>About</span>')&&site.includes("['/my-carrowmont.html','My Carrowmont']"));
  const registry=JSON.parse(fs.readFileSync(path.join(main,'docs/CARROWMONT_FRE_ENGINE_REGISTRY_V12.json'),'utf8'));
  add('Engine Registry V12 records guest/local dashboard boundaries',registry.schema_version===12&&registry.version==='V12'&&registry.fre_batch6?.public_url==='/my-carrowmont.html'&&registry.fre_batch6?.public_tool_count===23&&registry.fre_batch6?.search_public_page_count===138);
  add('Batch 6 documentation and 14-dimension acceptance ledger exist',fs.existsSync(path.join(main,'docs/CARROWMONT_FRE_BATCH6_MY_CARROWMONT_DASHBOARD.md'))&&/14-dimension change-impact matrix/.test(fs.readFileSync(path.join(main,'docs/CARROWMONT_FRE_BATCH6_ACCEPTANCE_LEDGER.md'),'utf8')));
  return checks;
}
