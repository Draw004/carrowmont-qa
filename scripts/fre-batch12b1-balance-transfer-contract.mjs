import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

export function runFreBatch12B1BalanceTransferContract(root) {
  const checks = [];
  const add = (name, ok, detail = '') => checks.push({name, ok: !!ok, detail});
  const read = rel => fs.readFileSync(path.join(root,rel),'utf8');
  const tool = read('budget-cash-flow-planner/credit-card-payoff-calculator.html');
  const app = read('budget-cash-flow-planner/balance-transfer-decision.js');
  const coreSource = read('budget-cash-flow-planner/balance-transfer-decision-core.js');
  const mainTools = read('draw004.github.io/tools.html');
  const guide = read('draw004.github.io/balance-transfer-credit-card.html');
  const sitemap = read('draw004.github.io/sitemap.xml');
  const inventory = JSON.parse(read('draw004.github.io/data/carrowmont-search-pages.json'));
  const index = JSON.parse(read('draw004.github.io/data/carrowmont-search-index.json'));
  const anchor = '/budget-cash-flow-planner/credit-card-payoff-calculator.html#balance-transfer';

  add('The new decision is accessible from the existing, canonical credit-card payoff URL',
    tool.includes('id="balance-transfer"') && tool.includes('id="btForm"') &&
    tool.includes('balance-transfer-decision-core.js') && tool.includes('balance-transfer-decision.js') &&
    tool.includes('debt-payoff-core.js') && tool.includes('id="tab-transfer"'));
  add('Learn and Tools route directly into the comparison without introducing a duplicate guide',
    mainTools.includes(`href="${anchor}"`) && guide.includes(`href="${anchor}"`) &&
    !sitemap.includes('balance-transfer-decision.html') && inventory.entries.length === 151 &&
    index.entries.length === 151 && mainTools.includes('credit-card-payoff-comparison'));
  add('Balance Transfer is a selected, compact decision mode with responsive results',
    tool.includes('id="tab-transfer"') && tool.includes('role="tabpanel"') &&
    tool.includes('id="btForm"') &&
    read('budget-cash-flow-planner/credit-card-decision-ux.js').includes("location.hash === '#balance-transfer'") &&
    read('budget-cash-flow-planner/credit-card-decision-ux.css').includes('max-width:650px'));
  add('No balance-transfer what-if values are sent to or auto-saved in an account',
    !/(?:localStorage|sessionStorage|fetch\s*\(|XMLHttpRequest|CarrowmontPlanSave|saveProfile|supabase)/i.test(app + coreSource));
  add('Term and fee assumptions are visible alongside output, with end-of-offer risks',
    tool.includes('APR after the promotion') && tool.includes('Transfer fee') &&
    tool.includes('fee is added') && tool.includes('id="btPromoBalance"') &&
    tool.includes('id="btWarnings"') && tool.includes('Monthly interest is calculated'));

  const sandbox = {};
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read('budget-cash-flow-planner/debt-payoff-core.js'),sandbox);
  vm.runInContext(coreSource,sandbox);
  const C = sandbox.CarrowmontBalanceTransferDecisionCore;
  const approx = (a,b,tol=0.01) => Number.isFinite(a)&&Math.abs(a-b)<=tol;
  const sample = {balance:5000,currentAprPct:24,monthlyPayment:300,introAprPct:0,introMonths:12,postAprPct:24,transferFeePct:3,fixedFee:0,feeTreatment:'financed'};
  const r = C.calculate(sample);
  add('Normal offer: current path delegates to tested Debt Core, and transfer fee adds to debt',
    r.status === 'ok' && r.version === 'FRE12B1-1.0' && r.current.status === 'paid_off' &&
    approx(r.fee,150) && approx(r.transfer.financedFee,150) &&
    approx(r.current.totalPaid,6143.33656) && approx(r.transfer.totalOutlay,5253.11546) &&
    approx(r.comparison.savings,890.22110) && approx(r.transfer.atIntroEnd,1550));
  add('Promotional clear-payment solves the 12-month target with rounding up',
    approx(r.promoClearPayment,429.1667) &&
    C.simulateTransfer(r.inputs,r.promoClearPayment,r.fee).months === 12 &&
    C.simulateTransfer(r.inputs,r.promoClearPayment - 0.01,r.fee).months > 12 &&
    app.includes('fmtPaymentCeiling') && app.includes('currencyDigits'));
  const noFeeZero = C.calculate({...sample,balance:1200,currentAprPct:0,monthlyPayment:100,introAprPct:0,postAprPct:0,transferFeePct:0});
  add('Zero APR / zero fee yields identical total outlay and no invented benefit',
    noFeeZero.comparison.comparable && approx(noFeeZero.comparison.savings,0) && approx(noFeeZero.transfer.totalOutlay,1200));
  const feeLoss = C.calculate({...sample,balance:1200,currentAprPct:0,monthlyPayment:100,introAprPct:0,postAprPct:0,transferFeePct:3});
  add('Fee-heavy transfer can be worse and is not described as a saving',
    feeLoss.comparison.comparable && approx(feeLoss.comparison.savings,-36));
  const upfront = C.calculate({...sample,feeTreatment:'upfront'});
  add('Cash-paid fee is included in total outlay but not in financed balance',
    approx(upfront.fee,150) && upfront.transfer.financedFee === 0 &&
    approx(upfront.transfer.upfrontFee,150) &&
    approx(upfront.transfer.atIntroEnd,1400) &&
    approx(upfront.transfer.totalOutlay,upfront.transfer.totalInterest+upfront.fee+upfront.inputs.balance));
  const afterCliff = C.calculate({...sample,postAprPct:60});
  add('After-promotion APR affects the remaining balance rather than claiming 0% forever',
    afterCliff.transfer.atIntroEnd === r.transfer.atIntroEnd &&
    afterCliff.transfer.totalInterest > r.transfer.totalInterest);
  const noOffer = C.calculate({...sample,introMonths:0,introAprPct:0});
  add('Zero promotional months apply post-promotion APR immediately',
    noOffer.status === 'ok' && approx(noOffer.transfer.atIntroEnd,5150) &&
    noOffer.warnings.some(s=>s.includes('No promotional months')) && noOffer.promoClearPayment === null);
  const notAffordable = C.calculate({...sample,monthlyPayment:10});
  add('Inadequate payment never returns misleading savings if either path does not repay',
    !notAffordable.comparison.comparable && notAffordable.comparison.savings === null &&
    notAffordable.warnings.length > 0);
  const invalid = [
    {...sample,balance:0}, {...sample,currentAprPct:-1}, {...sample,postAprPct:110},
    {...sample,introMonths:2.5}, {...sample,monthlyPayment:0}, {...sample,fixedFee:-1},
    {...sample,introAprPct:''}, {...sample,feeTreatment:'invalid'}
  ];
  add('Invalid balances, rates, durations, payments, fees and missing terms are rejected',
    invalid.every(i=>C.calculate(i).status==='invalid'));
  const searchSandbox={}; searchSandbox.globalThis=searchSandbox; vm.createContext(searchSandbox);
  vm.runInContext(read('draw004.github.io/search-core.js'), searchSandbox);
  const search=searchSandbox.CarrowmontSearchCore;
  const aliases=JSON.parse(read('draw004.github.io/data/carrowmont-search-aliases.json'));
  add('Ambiguous balance-transfer terms respect card vs home-loan intent',
    search.search(index.entries,aliases,'balance transfer calculator',{region:'US'})[0]?.url==='/budget-cash-flow-planner/credit-card-payoff-calculator.html' &&
    search.search(index.entries,aliases,'home loan balance transfer calculator',{region:'IN'})[0]?.url==='/mortgage-payoff-calculator/refinance-break-even.html');
  add('Month-by-month loan accounting balances principal, interest and fee consistently',
    [r,noFeeZero,feeLoss,upfront].every(c=>
      c.transfer.status === 'paid_off' && c.current.status === 'paid_off' &&
      approx(c.current.totalPaid,c.inputs.balance+c.current.totalInterest,0.02) &&
      approx(c.transfer.totalOutlay,c.inputs.balance+c.transfer.totalInterest+c.fee,0.02) &&
      approx(c.comparison.savings,c.current.totalInterest-c.transfer.totalInterest-c.fee,0.02)));
  return checks;
}
