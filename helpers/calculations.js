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

export function fiToday(monthlySpending, spendingPct, monthlyIncome, withdrawalRatePct) {
  const need = Math.max(0, monthlySpending * (spendingPct / 100) - monthlyIncome);
  return need * 12 / (withdrawalRatePct / 100);
}

export function fiAtAge(todayTarget, inflationPct, years) {
  return todayTarget * Math.pow(1 + inflationPct / 100, years);
}
