import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function runFreBatch8hPlannerFormPolishContract(root){
  const checks=[];const add=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail});
  const read=rel=>{const p=path.join(root,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const qaRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const readQa=rel=>{const p=path.join(qaRoot,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};

  const compoundHtml=read('compound-interest-calculator/index.html');
  const compoundCss=read('compound-interest-calculator/styles.css');
  const budgetHtml=read('budget-cash-flow-planner/index.html');
  const budgetCss=read('budget-cash-flow-planner/styles.css');
  const retirementLanding=read('retirement-calculator/index.html');
  const retirementPlanner=read('retirement-calculator/planner.html');
  const searchPages=JSON.parse(read('draw004.github.io/data/carrowmont-search-pages.json')||'{"entries":[]}');
  const searchIndex=JSON.parse(read('draw004.github.io/data/carrowmont-search-index.json')||'{"entries":[]}');

  add('8H compound advanced assumptions are open by default while inflation remains opt-in',
    compoundHtml.includes('<details class="advanced" id="advancedAssumptions" open>')&&
    compoundHtml.includes('<input id="inflationEnabled" type="checkbox" />')&&
    compoundHtml.includes('id="inflationRate"')&&compoundHtml.includes('disabled'));
  add('8H compound regular contributions remain visible but unchecked and disabled by default',
    compoundHtml.includes('<input id="contributionEnabled" type="checkbox" />')&&
    ['contributionAmount','contributionFrequency','contributionTiming'].every(id=>compoundHtml.includes(`id="${id}"`))&&
    compoundHtml.includes('id="contributionFields" aria-disabled="true"'));
  add('8H compound three-column controls share one fixed control row and wrapper height',
    compoundCss.includes('.fields-3 .field{grid-template-rows:auto 48px auto;align-content:start}')&&
    compoundCss.includes('.money-input,.input-suffix{height:48px}')&&
    compoundCss.includes('.money-input input,.input-suffix input{height:46px}'));
  add('8H compound stylesheet cache key is refreshed',compoundHtml.includes('styles.css?v=20261114-fre8h'));

  const qaFixtures=readQa('helpers/fixtures.js');
  const compoundQa=readQa('tests/29-core8-compound-interest.spec.js');
  add('8H QA treats the boolean details open property correctly for Compound Interest',
    qaFixtures.includes("advanced.evaluate(el => el.open)")&&
    compoundQa.includes("advanced.evaluate(el => el.open)")&&
    !compoundQa.includes("advanced.getAttribute('open')"));

  add('8H budget setup gives every visible setup field a helper row for stable alignment',
    budgetHtml.includes('Choose the month you want to plan.')&&
    budgetHtml.includes('Used to place income and bills within the selected pay cycle.')&&
    budgetHtml.includes('Used for the pay-cycle view. Each income row can still have its own frequency.')&&
    budgetHtml.includes('Optional. Used to compare upcoming bills with cash already available before payday.'));
  add('8H budget setup controls share 42px geometry including currency wrapper',
    budgetCss.includes('.plan-meta-grid .field{grid-template-rows:auto 42px minmax(32px,auto);align-content:start}')&&
    budgetCss.includes('.plan-meta-grid .field>input,.plan-meta-grid .field>select,.plan-meta-grid .field>.money-input{height:42px;min-height:42px}')&&
    budgetCss.includes('.plan-meta-grid .money-input input{height:40px;min-height:40px}'));
  add('8H budget mobile layout removes reserved helper height after fields stack',
    budgetCss.includes('@media(max-width:720px){.plan-meta-grid .field{grid-template-rows:auto 42px auto}.plan-meta-grid .field small{min-height:0}}'));
  add('8H budget stylesheet cache key is refreshed',budgetHtml.includes('styles.css?v=20261114-fre8h'));

  const plannerLinks=[...retirementLanding.matchAll(/href="(planner\.html[^"]*)"/g)].map(m=>m[1]);
  add('8H retirement landing planner actions deep-link directly to the working assumptions section',
    plannerLinks.length>=4&&plannerLinks.every(href=>href==='planner.html#planner')&&retirementPlanner.includes('id="planner"'));
  add('8H retirement canonical landing and detailed planner remain separate public pages',
    retirementLanding.includes('rel="canonical" href="https://carrowmont.com/retirement-calculator/"')&&
    retirementPlanner.includes('rel="canonical" href="https://carrowmont.com/retirement-calculator/planner.html"'));

  add('8H creates no new public URL or search inventory entry',
    searchPages.entries?.length===138&&searchIndex.entries?.length===138);
  return checks;
}
