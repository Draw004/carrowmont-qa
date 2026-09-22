export function sipFutureValue({ currentSavings, monthlySIP, years, annualReturnPct, annualStepUpPct = 0 }) {
  const annualReturn = annualReturnPct / 100;
  const step = annualStepUpPct / 100;
  const rm = annualReturn === 0 ? 0 : Math.pow(1 + annualReturn, 1 / 12) - 1;
  const months = Math.round(years * 12);
  let portfolio = currentSavings;
  for (let m = 1; m <= months; m++) {
    portfolio *= 1 + rm;
    const yearIndex = Math.floor(Math.max(0, m - 1) / 12);
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
