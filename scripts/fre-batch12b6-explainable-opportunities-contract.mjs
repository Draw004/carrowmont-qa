import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function runFreBatch12B6ExplainableOpportunitiesContract(root){
  const checks=[];const add=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail});
  const read=rel=>{const p=path.join(root,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const qaRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const readQa=rel=>{const p=path.join(qaRoot,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const plan=read('draw004.github.io/assets/account/carrowmont-financial-plan.js');
  const html=read('draw004.github.io/my-carrowmont.html');
  const css=read('draw004.github.io/assets/dashboard/my-carrowmont.css');
  const spec=read('draw004.github.io/docs/CARROWMONT_FRE12B6_EXPLAINABLE_OPPORTUNITIES.md');
  const pages=JSON.parse(read('draw004.github.io/data/carrowmont-search-pages.json')||'{"entries":[]}');
  const index=JSON.parse(read('draw004.github.io/data/carrowmont-search-index.json')||'{"entries":[]}');
  const sitemap=read('draw004.github.io/sitemap.xml');
  add('12B-6 reuses existing Progress and Money Priorities engines instead of adding a new recommendation score',plan.includes('CarrowmontProgress')&&plan.includes('CarrowmontMoneyPriorities')&&plan.includes('priorityMoves')&&!plan.includes('opportunityScore'));
  add('12B-6 renders explainable prompt types and a reason surface',plan.includes('Explainable opportunities')&&plan.includes("Why you're seeing this")&&plan.includes('Needs attention')&&plan.includes('Worth reviewing')&&plan.includes('Opportunity')&&plan.includes('On track'));
  add('12B-6 exposes deterministic evidence and what-could-change factors when available',plan.includes('EVIDENCE_LABELS')&&plan.includes('evidenceFromNumbers')&&plan.includes('What could change this:'));
  add('12B-6 routes prompts to an action surface and a Learn explanation',plan.includes('STAGE_DESTINATIONS')&&plan.includes('learnRoute')&&plan.includes('Explore this →')&&plan.includes('Learn why →'));
  add('12B-6 Not now is presentation-only local storage with fingerprint reappearance and no saved-plan mutation',plan.includes("PROMPT_SNOOZE_KEY='carrowmont_mycm_opportunity_snoozes_v1'")&&plan.includes('fingerprint=hashText')&&plan.includes('snoozePrompt(move)')&&plan.includes('restorePrompts(model.moves)')&&!plan.includes('Store.setFact')&&!plan.includes('financial_plan'));
  add('12B-6 Trust copy states that Not now never updates a plan',html.includes('Choosing “Not now” hides only that prompt on this device until its saved inputs change.')&&plan.includes('It never changes, deletes or marks a saved plan complete.'));
  add('12B-6 keeps the existing three-move cap for calm dashboard behavior',plan.includes('moves.length>=3')&&plan.includes('return moves.slice(0,3)'));
  add('12B-6 mobile CSS keeps evidence and actions stacked without overflow',css.includes('.mycm-opportunity-evidence')&&css.includes('@media(max-width:660px)')&&css.includes('.mycm-opportunity-actions{align-items:flex-start;flex-direction:column'));
  add('12B-6 implementation contract preserves no-push/no-schema/no-invented-data boundaries',spec.includes('No push, email or recurring notifications are created.')&&spec.includes('not financial data or a Supabase schema change')&&spec.includes('Do not invent missing financial data'));
  add('12B-6 preserves public inventory at 23 tools / 145 indexed URLs',pages.entries?.length===145&&index.entries?.length===145&&((html.match(/<meta name="robots" content="index,follow">/)||[]).length===1)&&sitemap.includes('<loc>https://carrowmont.com/my-carrowmont.html</loc>')&&/"numberOfItems"\s*:\s*23/.test(read('draw004.github.io/tools.html')));
  const browser=readQa('tests/97-fre12b6-explainable-opportunities.spec.js');
  const common=readQa('helpers/common.js');
  add('12B-6 browser QA covers reason, evidence, routes, Not now persistence, unrelated-change stability, relevant-change reappearance, restore and mobile geometry',browser.includes("Why you're seeing this")&&browser.includes('mycm-opportunity-evidence')&&browser.includes('Not now')&&browser.includes('unrelated saved inputs stay snoozed')&&browser.includes('relevant saved inputs make the prompt eligible again')&&browser.includes("profile({emergency:90000})")&&browser.includes("profile({emergency:90000,flexible:11000})")&&browser.includes('Show it again')&&browser.includes('assertNoHorizontalOverflow'));
  add('12B-6 clean-navigation QA preserves the local-only prompt snooze key across reloads',common.includes("const opportunitySnoozeKey = 'carrowmont_mycm_opportunity_snoozes_v1'")&&common.includes('const opportunitySnoozes = localStorage.getItem(opportunitySnoozeKey)')&&common.includes('if (opportunitySnoozes) localStorage.setItem(opportunitySnoozeKey, opportunitySnoozes)'));
  return checks;
}
