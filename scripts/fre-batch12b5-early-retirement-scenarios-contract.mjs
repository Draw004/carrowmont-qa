import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);

export function runFreBatch12B5EarlyRetirementScenariosContract(root){
  const checks=[];const add=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail});
  const read=rel=>{const p=path.join(root,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const corePath=path.join(root,'financial-independence/core.js');
  add('existing FI core exposes early-retirement scenario helpers',fs.existsSync(corePath));
  if(!fs.existsSync(corePath))return checks;
  const E=require(corePath);
  const base={currentAge:35,targetAge:50,planningMode:'sustainable',planUntilAge:95,monthlySpending:100000,spendingPct:100,monthlyIncome:0,withdrawalRate:4,inflation:5,currentAssets:1500000,monthlyContribution:30000,payFrequency:'monthly',investmentFrequency:'monthly',annualReturn:10,annualStepUp:5};
  const r=E.earlyRetirementCompare(base,{earlierYears:5,bridgeIncome:20000,spendingPct:90});
  add('comparison keeps the selected target central and models five years earlier',r.earlier.age===45&&r.base.age===50&&r.oneMore.age===51,JSON.stringify({earlier:r.earlier.age,base:r.base.age,oneMore:r.oneMore.age}));
  add('one-more-year path adds accumulation time under the same assumptions',r.oneMore.portfolio>r.base.portfolio&&r.oneMoreDelta.portfolio>0);
  add('earlier retirement requires no less starting contribution than the same plan at the selected target',r.earlier.requiredContribution>=r.base.requiredContribution);
  add('user-entered bridge income and lower spending reduce portfolio-funded need without preset FIRE percentages',r.adjusted.portfolioMonthlyNeed===70000&&r.adjusted.target<r.earlier.target,JSON.stringify({need:r.adjusted.portfolioMonthlyNeed,target:r.adjusted.target,earlier:r.earlier.target}));
  const noChange=E.earlyRetirementCompare(base,{earlierYears:5,bridgeIncome:0,spendingPct:100});
  add('neutral scenario inputs reproduce the plain earlier scenario exactly',Math.abs(noChange.adjusted.target-noChange.earlier.target)<1e-6&&Math.abs(noChange.adjusted.requiredContribution-noChange.earlier.requiredContribution)<1e-6);
  const near=E.earlyRetirementCompare({...base,currentAge:49,targetAge:50},{earlierYears:10,bridgeIncome:0,spendingPct:100});
  add('early-age clamp never moves the scenario below one year from current age',near.earlier.age===50);
  const until=E.earlyRetirementCompare({...base,planningMode:'until_age',targetAge:70,planUntilAge:72},{earlierYears:5,bridgeIncome:0,spendingPct:100});
  add('Plan Until Age mode keeps one-more-year scenario inside the selected planning horizon',until.oneMore.age===71&&until.oneMore.age<until.state.planUntilAge);
  const src=read('financial-independence/core.js');
  add('scenario engine has no network, persistence or live-rate calls',!/(fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB)/.test(src));

  const html=read('financial-independence/index.html'),app=read('financial-independence/app.js'),css=read('financial-independence/styles.css');
  add('FI tool exposes one anchored early-retirement scenario module without a new public URL',app.includes("section.id='early-retirement-scenarios'")&&app.includes('EARLY-RETIREMENT SCENARIOS')&&app.includes('injectEarlyRetirementSection()'));
  add('scenario-only inputs are explicitly marked and excluded from My Carrowmont touch/save state',app.includes('data-scenario-only=\"true\"')&&app.includes("if(!i.matches('[data-scenario-only]'))mycmTouched=true"));
  add('FI save bridge computes its result before reading modelled FI summary fields',/getPlan\(\)\{[\s\S]*?const s=state\(\);[\s\S]*?const r=C\.result\(s\);[\s\S]*?modelledFIAge:r\.modelledFI/.test(app));
  add('empty main-plan state shows a useful early-retirement prompt instead of a blank comparison',app.includes('Add your FI details above')&&app.includes('early-retirement-empty')&&css.includes('.early-retirement-empty{grid-column:1/-1'));
  add('UI compares earlier, current target, one more year and user-adjusted earlier path',app.includes("'Earlier'")&&app.includes("'Current target'")&&app.includes("'One more year'")&&app.includes("'Earlier + your changes'"));
  add('one-more-year copy is explicitly arithmetic rather than a recommendation',app.includes('This is arithmetic, not a recommendation to keep working.'));
  add('risk boundaries explicitly cover sequence risk, healthcare, tax and pension gaps',app.includes('First-years market risk')&&app.includes('Healthcare, tax and pension gaps')&&app.includes('does not simulate bad market returns'));
  add('FIRE labels are treated as shorthand rather than fixed lifestyle presets',app.includes('Why no fixed FIRE labels?')&&app.includes('does not assume a Lean/Fat FIRE percentage'));
  add('responsive rules collapse scenario cards and controls on smaller screens',css.includes('@media(max-width:980px)')&&css.includes('.early-retirement-grid{grid-template-columns:1fr}'));

  const guide=read('draw004.github.io/early-retirement-planning.html');
  add('existing early-retirement guide deep-links directly to the scenario module',guide.includes('/financial-independence/#early-retirement-scenarios')&&guide.includes('Compare early-retirement scenarios'));
  add('guide review metadata is refreshed without changing its canonical URL',guide.includes('dateModified":"2026-11-22"')&&guide.includes('<link rel="canonical" href="https://carrowmont.com/early-retirement-planning.html"/>'));
  const pages=JSON.parse(read('draw004.github.io/data/carrowmont-search-pages.json'));
  const fi=pages.entries.find(e=>e.url==='/financial-independence/');
  add('search discovery includes real-language early-retirement questions and one-more-year intent',fi?.aliases?.includes('can i retire at 50')&&fi?.aliases?.includes('when can i retire early')&&fi?.aliases?.includes('one more year retirement')&&fi?.aliases?.includes('part time income retirement'));
  const tools=read('draw004.github.io/tools.html'),sitemap=read('draw004.github.io/sitemap.xml');
  add('release preserves the reviewed 23-tool and 145-URL public inventory',/"numberOfItems"\s*:\s*23/.test(tools)&&(tools.match(/class="directory-tool-card/g)||[]).length===23&&pages.entries.length===145&&(sitemap.match(/<loc>/g)||[]).length===145&&!sitemap.includes('early-retirement-scenarios.html'));
  add('early-retirement guide sitemap date is reconciled',sitemap.includes('<loc>https://carrowmont.com/early-retirement-planning.html</loc><lastmod>2026-11-22</lastmod>'));
  return checks;
}
