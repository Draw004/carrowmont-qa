import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';

const root=process.env.SOURCE_ROOT?path.resolve(process.env.SOURCE_ROOT):null;
if(!root)throw new Error('SOURCE_ROOT is required');
const require=createRequire(import.meta.url);
const C=require(path.join(root,'draw004.github.io/assets/account/carrowmont-ask-context.js'));

const fact=(value,lastUpdated='2026-11-16T00:00:00Z',unit='USD',source='Saved plan')=>({value,lastUpdated,unit,source,excluded:false});
const profile={locale:{region:'US',currency:'USD'},facts:{
  'cashFlow.essentialExpenses':fact(3000),
  'resilience.emergencySavings':fact(12000,'2026-01-01T00:00:00Z'),
  'debt.mortgageBalance':fact(250000),
  'debt.mortgageRatePct':fact(5.5,'2026-11-16T00:00:00Z','pct'),
  'assumptions.longTermReturnPct':fact(6,'2026-11-16T00:00:00Z','pct')
}};

const emergency=C.resolve({profile,intent:'emergency-runway',locale:{currency:'USD'},now:'2026-11-17T00:00:00Z'});
assert.equal(emergency.fresh.length,1);
assert.equal(emergency.fresh[0].key,'essentialExpenses');
assert.equal(emergency.stale.length,1);
assert.equal(emergency.stale[0].key,'emergencySavings');
assert.equal(emergency.stale[0].stale,true);

const mismatch=C.resolve({profile,intent:'emergency-runway',locale:{currency:'NZD'},now:'2026-11-17T00:00:00Z'});
assert.equal(mismatch.currencyMismatch,true);
assert.equal(mismatch.items.length,0);

const scenarios=[{journey:'mortgage-payoff',label:'Mortgage plan',updated_at:'2026-11-16T00:00:00Z',scenario:{input:{currency:'USD',remainingYears:18,remainingMonths:4}}}];
const mortgage=C.resolve({profile,scenarios,intent:'mortgage-prepay-vs-invest',locale:{currency:'USD'},now:'2026-11-17T00:00:00Z'});
assert.deepEqual(mortgage.fresh.map(x=>x.key).sort(),['assumedInvestmentReturnPct','mortgageBalance','mortgageRatePct','remainingYears'].sort());
assert.equal(mortgage.fresh.find(x=>x.key==='remainingYears').value,18);

const oldMortgage=C.resolve({profile,scenarios:[{...scenarios[0],updated_at:'2026-01-01T00:00:00Z'}],intent:'mortgage-prepay-vs-invest',locale:{currency:'USD'},now:'2026-11-17T00:00:00Z'});
assert.equal(oldMortgage.stale.some(x=>x.key==='remainingYears'),true);

assert.equal(C.DEFAULT_FACT_FRESH_DAYS,180);
assert.equal(C.LONG_TERM_FACT_FRESH_DAYS,365);
assert.equal(C.PROFILE_MAPS['money-priorities'].monthlyIncome,'cashFlow.takeHomeIncome');
assert.equal(C.PROFILE_MAPS['borrowing-health'].grossMonthlyIncome,'cashFlow.grossIncome');
assert.equal(C.PROFILE_MAPS['home-affordability'].existingMonthlyDebtPayments,'debt.monthlyPayments');
assert.equal(C.PROFILE_MAPS['debt-payoff'].debtAprPct,'debt.highestAprPct');
assert.equal(C.PROFILE_MAPS['credit-card-payoff'].cardMinimumPayment,'debt.creditCardMinimums');
assert.equal(C.PROFILE_MAPS['retirement-readiness'].retirementCurrentSavings,'retirement.currentSavings');
assert.equal(C.PROFILE_MAPS['goal-funding'].goalTargetAmount,'goal.targetAmount');
console.log('FRE10B account-aware Ask unit checks passed');
