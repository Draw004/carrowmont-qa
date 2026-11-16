import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function runFreBatch9bFinancialPlanContract(root){
  const checks=[];const add=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail});
  const read=rel=>{const p=path.join(root,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const qaRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const readQa=rel=>{const p=path.join(qaRoot,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const main='draw004.github.io/';
  const html=read(main+'my-carrowmont.html');
  const plan=read(main+'assets/account/carrowmont-financial-plan.js');
  const report=read(main+'assets/account/carrowmont-plan-report.js');
  const pdf=read(main+'assets/report/carrowmont-pdf-export.js');
  const dash=read(main+'assets/dashboard/my-carrowmont.js');
  const account=read(main+'assets/account/my-carrowmont-account.js');
  const css=read(main+'assets/dashboard/my-carrowmont.css');
  const spec=read(main+'docs/CARROWMONT_FRE_BATCH9B_YOUR_FINANCIAL_PLAN_VIEW_REPORT.md');
  const ledger=read(main+'docs/CARROWMONT_FRE_BATCH9B_ACCEPTANCE_LEDGER.md');

  add('Batch 9B adds one coherent Your Financial Plan section ahead of the detailed dashboard',html.includes('id="mycmFinancialPlan"')&&html.indexOf('id="mycmFinancialPlan"')<html.indexOf('id="mycmVisualOverview"')&&html.includes('Plan summary'));
  add('Batch 9B consolidated model covers all six roadmap planning areas',[
    'Cash flow','Emergency savings','Debt & home / loans','Retirement','Financial independence','Goals & investing'
  ].every(label=>plan.includes(`label:'${label}'`)));
  add('Batch 9B reuses existing target-based progress and deterministic Money Priorities instead of a second scoring engine',plan.includes('CarrowmontProgress')&&plan.includes('evaluateAll')&&plan.includes('CarrowmontMoneyPriorities')&&plan.includes('priorityMoves'));
  add('Batch 9B does not call a detail-only area on track without a target plan',plan.includes("status='Ready to track'")&&plan.includes('before Carrowmont labels')&&plan.includes('Save a payoff or loan plan'));
  add('Batch 9B exposes source trace, important assumptions, next moves and explicit unsaved what-if boundary',plan.includes('Where this came from')&&plan.includes('Important assumptions')&&plan.includes('Your next three moves')&&plan.includes('Unsaved what-if calculations do not enter this summary'));
  add('Batch 9B report is generated from the same model passed to the on-screen renderer',dash.includes('financialPlanModel=Plan.build')&&dash.includes('Plan.render(section,financialPlanModel')&&dash.includes('Report.generate(model)'));
  add('Batch 9B standardized PDF contains summary, moves/assumptions and source trace pages',report.includes("header(ctx,'Your Financial Plan'")&&report.includes("header(ctx,'Next moves & assumptions'")&&report.includes("header(ctx,'Source trace'")&&report.includes('my-carrowmont-plan-report-'));
  add('Batch 9B uses a local reusable PDF helper and does not add an external reporting dependency',pdf.includes('window.CarrowmontPdfExport')&&pdf.includes('makePdfFromJpegs')&&!pdf.includes('fetch(')&&!pdf.includes('cdn.jsdelivr')&&!pdf.includes('unpkg.com'));
  add('Batch 9B scenario event carries the exact saved rows into the derived view without changing account persistence',account.includes('detail:{journeys:rows.map')&&account.includes(',rows}}')&&!account.includes('financial_plan'));
  add('Batch 9B responsive CSS covers the consolidated section and mobile one-column layout',css.includes('.mycm-financial-plan')&&css.includes('.mycm-plan-area-grid')&&css.includes('@media(max-width:660px)'));
  add('Batch 9B implementation spec and ledger preserve privacy, no-ledger, formula and schema boundaries',spec.includes('Unsaved calculator what-if results remain outside My Carrowmont')&&spec.includes('not a bank feed, transaction ledger')&&ledger.includes('No calculator formula or deterministic engine is changed')&&ledger.includes('No Supabase schema'));
  const browser=readQa('tests/73-fre9b-financial-plan.spec.js');
  add('Batch 9B browser QA covers six-area reconciliation, source trace, next moves, assumptions, report-model parity and mobile geometry',browser.includes('six planning areas')&&browser.includes('Where this came from')&&browser.includes('Your next three moves')&&browser.includes('Important assumptions')&&browser.includes('__batch9bReportModel')&&browser.includes('assertNoHorizontalOverflow'));
  return checks;
}
