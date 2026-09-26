export const sipFrequencyPeriods = Object.freeze({
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  fourweekly: 13,
  monthly: 12
});

export function sipFutureValue({ currentSavings, monthlySIP, years, annualReturnPct, annualStepUpPct = 0, contributionFrequency = 'monthly' }) {
  const annualReturn = annualReturnPct / 100;
  const step = annualStepUpPct / 100;
  const periodsPerYear = sipFrequencyPeriods[contributionFrequency] || 12;
  const periodicRate = annualReturn === 0 ? 0 : Math.pow(1 + annualReturn, 1 / periodsPerYear) - 1;
  const periods = Math.round(years * periodsPerYear);
  let portfolio = currentSavings;
  for (let p = 1; p <= periods; p++) {
    portfolio *= 1 + periodicRate;
    const yearIndex = Math.floor(Math.max(0, p - 1) / periodsPerYear);
    portfolio += monthlySIP * Math.pow(1 + step, yearIndex);
  }
  return portfolio;
}

export function inflationFutureValue(amount, ratePct, years) {
  return amount * Math.pow(1 + ratePct / 100, years);
}

export function goalFutureCost(amountToday, inflationPct, years) {
  return amountToday * Math.pow(1 + inflationPct / 100, years);
}

export const goalFrequencyPeriods = sipFrequencyPeriods;

export function goalRecurringFutureValue({ contribution, years, annualReturnPct, contributionFrequency = 'monthly' }) {
  const periodsPerYear = goalFrequencyPeriods[contributionFrequency] || 12;
  const annualReturn = annualReturnPct / 100;
  const periodicRate = annualReturn === 0 ? 0 : Math.pow(1 + annualReturn, 1 / periodsPerYear) - 1;
  const periods = Math.round(years * periodsPerYear);
  if (periodicRate === 0) return contribution * periods;
  return contribution * ((Math.pow(1 + periodicRate, periods) - 1) / periodicRate);
}

export const retirementFrequencyPeriods = sipFrequencyPeriods;

export function retirementContributionFutureValue({ contribution, years, annualReturnPct, contributionFrequency = 'monthly' }) {
  const periodsPerYear = retirementFrequencyPeriods[contributionFrequency] || 12;
  const annualReturn = annualReturnPct / 100;
  const periodicRate = annualReturn === 0 ? 0 : Math.pow(1 + annualReturn, 1 / periodsPerYear) - 1;
  const periods = Math.round(years * periodsPerYear);
  if (periodicRate === 0) return contribution * periods;
  return contribution * ((Math.pow(1 + periodicRate, periods) - 1) / periodicRate);
}


export function fiToday(monthlySpending, spendingPct, monthlyIncome, withdrawalRatePct) {
  const need = Math.max(0, monthlySpending * (spendingPct / 100) - monthlyIncome);
  return need * 12 / (withdrawalRatePct / 100);
}

export function fiAtAge(todayTarget, inflationPct, years) {
  return todayTarget * Math.pow(1 + inflationPct / 100, years);
}

export function fiPlanUntilRequiredPortfolio({
  monthlyPortfolioNeedToday,
  currentAge,
  startAge,
  planUntilAge,
  inflationPct,
  annualReturnPct
}) {
  const months = Math.max(0, Math.round((planUntilAge - startAge) * 12));
  if (months === 0 || monthlyPortfolioNeedToday <= 0) return 0;
  const annualReturn = annualReturnPct / 100;
  const inflation = inflationPct / 100;
  const monthlyReturn = annualReturn === 0 ? 0 : Math.pow(1 + annualReturn, 1 / 12) - 1;
  const monthlyInflation = inflation === 0 ? 0 : Math.pow(1 + inflation, 1 / 12) - 1;
  const firstWithdrawal = monthlyPortfolioNeedToday * Math.pow(1 + inflation, startAge - currentAge);
  let needed = 0;
  for (let m = months - 1; m >= 0; m--) {
    const withdrawal = firstWithdrawal * Math.pow(1 + monthlyInflation, m);
    needed = withdrawal + needed / (1 + monthlyReturn);
  }
  return needed;
}

export function fiPlanUntilProjection({
  startingBalance,
  monthlyPortfolioNeedToday,
  currentAge,
  startAge,
  planUntilAge,
  inflationPct,
  annualReturnPct
}) {
  const months = Math.max(0, Math.round((planUntilAge - startAge) * 12));
  const annualReturn = annualReturnPct / 100;
  const inflation = inflationPct / 100;
  const monthlyReturn = annualReturn === 0 ? 0 : Math.pow(1 + annualReturn, 1 / 12) - 1;
  const monthlyInflation = inflation === 0 ? 0 : Math.pow(1 + inflation, 1 / 12) - 1;
  const firstWithdrawal = monthlyPortfolioNeedToday * Math.pow(1 + inflation, startAge - currentAge);
  let balance = Math.max(0, startingBalance);
  for (let m = 0; m < months; m++) {
    const withdrawal = firstWithdrawal * Math.pow(1 + monthlyInflation, m);
    if (balance + 1e-9 < withdrawal) {
      return { lasts: false, depletionAge: startAge + m / 12, finalBalance: 0 };
    }
    balance -= withdrawal;
    balance *= 1 + monthlyReturn;
  }
  return { lasts: true, depletionAge: null, finalBalance: balance };
}
