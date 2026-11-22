import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

export function runFreBatch12B3MortgageChoiceContract(root){
  const checks=[]; const add=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail});
  const read=rel=>{const p=path.join(root,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';};
  const main=path.join(root,'draw004.github.io');
  const mortgage=path.join(root,'mortgage-payoff-calculator');
  const core=read('mortgage-payoff-calculator/recast-refinance-prepayment-core.js');
  const hub=read('mortgage-payoff-calculator/decision-centre.html');
  const hubJs=read('mortgage-payoff-calculator/decision-centre.js');
  const payoff=read('mortgage-payoff-calculator/index.html');
  const payoffJs=read('mortgage-payoff-calculator/app.js');
  const guide=read('draw004.github.io/mortgage-refinance-break-even.html');
  const sitemap=read('draw004.github.io/sitemap.xml');
  const tools=read('draw004.github.io/tools.html');
  const pages=JSON.parse(read('draw004.github.io/data/carrowmont-search-pages.json')||'{"entries":[]}');
  const status=read('draw004.github.io/docs/CARROWMONT_CURRENT_PROJECT_STATUS.md');
  const roadmap=read('draw004.github.io/docs/CARROWMONT_FRE_MASTER_ROADMAP_STATUS.md');

  add('composite engine is present and composes existing mortgage and refinance engines without replacing their formulas',core.includes('CarrowmontMortgageCore')&&core.includes('CarrowmontMdc1bCore')&&core.includes('M.calculate')&&core.includes('R.calculate')&&!core.includes('Math.pow('));
  add('Decision Centre exposes the anchored three-path comparison without adding a fifth decision card',hubJs.includes('id="prepay-recast-refinance"')&&hubJs.includes('Prepay, lower the payment or refinance?')&&(hub.match(/class="decision-card"/g)||[]).length===4);
  add('comparison loads the existing core engines before the thin 12B-3 composite engine',hubJs.includes("loadScript('core.js','CarrowmontMortgageCore')")&&hubJs.includes("loadScript('refinance-break-even-core.js','CarrowmontMdc1bCore')")&&hubJs.includes("loadScript('recast-refinance-prepayment-core.js','CarrowmontFre12b3MortgageChoiceCore')"));
  add('same lump sum and explicit lender-limit wording are visible',hubJs.includes('The same entered lump sum is applied')&&hubJs.includes('mathematical re-amortization illustration')&&hubJs.includes('Carrowmont does not invent lender penalties')&&hubJs.includes('does not fetch live lender rates or determine eligibility'));
  add('saved mortgage facts require an explicit Apply action and scenario-specific inputs are not stored',hubJs.includes('id="useProfileComparisonBtn"')&&hubJs.includes('applyProfileToThreePath')&&!core.includes('localStorage')&&!core.includes('sessionStorage')&&!hubJs.includes("write(threePath"));
  add('country terminology distinguishes EMI, recast, overpayment and extra-repayment language',hubJs.includes("recastPath:'Lower EMI illustration'")&&hubJs.includes("recastPath:'Recast / lower-payment illustration'")&&hubJs.includes("prepayPath:'Overpay and finish sooner'")&&hubJs.includes("prepayPath:'Make an extra repayment and finish sooner'"));
  add('payoff calculator deep-links into the comparison and the refinance Learn guide links back to the same anchor',payoffJs.includes('decision-centre.html#prepay-recast-refinance')&&guide.includes('/mortgage-payoff-calculator/decision-centre.html#prepay-recast-refinance'));
  add('refinance guide freshness is updated without adding a public URL',guide.includes('Updated 21 Nov 2026')&&guide.includes('property="article:modified_time"')&&guide.includes('content="2026-11-21"')&&sitemap.includes('<loc>https://carrowmont.com/mortgage-refinance-break-even.html</loc><lastmod>2026-11-21</lastmod>'));
  add('public inventory remains locked at 23 tools and 145 URLs',/"numberOfItems"\s*:\s*23/.test(tools)&&(tools.match(/class="directory-tool-card/g)||[]).length===23&&pages.entries?.length===145&&(sitemap.match(/<loc>/g)||[]).length===145&&!sitemap.includes('recast-refinance-prepayment.html'));
  add('status documents preserve deployed 12B-3 while keeping branch cleanup deferred and Batch 13 deferred',/12B-3[^\n]+deployed/i.test(status)&&/branch cleanup[^\n]+deferred/i.test(status)&&/Batch 13[^\n]+deferred/i.test(status)&&/12B-3[^\n]+shipped/i.test(roadmap));

  try{
    const context={window:{},console,Date};context.window.window=context.window;context.window.console=console;vm.createContext(context);
    for(const rel of ['mortgage-payoff-calculator/core.js','mortgage-payoff-calculator/refinance-break-even-core.js','mortgage-payoff-calculator/recast-refinance-prepayment-core.js']) vm.runInContext(read(rel),context,{filename:rel});
    const C=context.window.CarrowmontFre12b3MortgageChoiceCore;
    const base={country:'IN',currency:'INR',balance:5000000,currentRatePct:8.5,remainingYears:15,remainingMonths:0,paymentFrequency:'monthly',lumpSumAmount:500000,prepaymentCharge:0,newRatePct:7.75,proposedYears:15,proposedMonths:0,switchingFees:25000,exitCharge:0,cashback:0,feePaymentMode:'upfront',startDate:'2026-11-21'};
    const a=C.calculate(base);
    add('deterministic India fixture produces all three valid paths',a.ok&&a.prepay&&a.recast&&a.refinance,a.error||'');
    add('prepay path keeps scheduled repayment and shortens the modeled payoff',a.ok&&Math.abs(a.prepay.payment-a.baseline.payment)<0.01&&a.prepay.periodsSaved===32&&a.prepay.payoffPeriods===148);
    add('recast path preserves the original payoff horizon and lowers modeled repayment',a.ok&&a.recast.payoffPeriods===a.baseline.payoffPeriods&&a.recast.payment<a.prepay.payment&&Math.abs(a.recast.payment-44299.6329779679)<0.02);
    add('default refinance fixture warns when lower payment comes from a longer path with no durable break-even',a.ok&&a.refinance.durableBreakEvenMonths===null&&a.refinance.lowerPaymentHigherLifetimeCost&&a.refinance.termChangePeriodsVsPrepayPathAfterLump>0);
    add('same-lump comparison identifies prepay as the lowest borrowing-cost path in the default fixture without turning that into a recommendation',a.ok&&a.comparison.sameLumpSumAcrossPaths&&a.comparison.refinanceStartsAfterLump&&a.comparison.lowestBorrowingCostPath==='prepay'&&hubJs.includes('That is a cost comparison, not a recommendation'));

    const us=C.calculate({...base,country:'US',currency:'USD',balance:300000,currentRatePct:7,remainingYears:25,lumpSumAmount:30000,newRatePct:6,proposedYears:20,switchingFees:5000,cashback:1000,startDate:'2026-11-21'});
    add('representative refinance-friendly fixture reaches durable break-even and can legitimately have the lowest modeled borrowing cost',us.ok&&us.refinance.durableBreakEvenMonths===19&&us.comparison.lowestBorrowingCostPath==='refinance');
    const charged=C.calculate({...base,prepaymentCharge:50000,startDate:'2026-11-21'});
    add('entered prepayment/recast charge increases both lump-sum path borrowing costs without being invented automatically',charged.ok&&Math.abs((charged.prepay.borrowingCost-a.prepay.borrowingCost)-50000)<0.01&&Math.abs((charged.recast.borrowingCost-a.recast.borrowingCost)-50000)<0.01);
    const financed=C.calculate({...base,feePaymentMode:'financed',startDate:'2026-11-21'});
    add('financed refinance fees change proposed economics while remaining an entered switching cost',financed.ok&&financed.refinance.borrowingCost!==a.refinance.borrowingCost&&financed.refinance.payment!==a.refinance.payment);
    const cashback=C.calculate({...base,cashback:10000,startDate:'2026-11-21'});
    add('cashback reduces net refinance switching cost deterministically',cashback.ok&&Math.abs((a.refinance.netSwitchingCost-cashback.refinance.netSwitchingCost)-10000)<0.01);
    add('full-settlement-sized lump sums are rejected because recast/refinance is no longer the relevant decision',C.calculate({...base,lumpSumAmount:5000000,startDate:'2026-11-21'}).error==='lump-sum');
  }catch(err){add('deterministic 12B-3 fixtures execute',false,String(err?.stack||err));}

  return checks;
}
