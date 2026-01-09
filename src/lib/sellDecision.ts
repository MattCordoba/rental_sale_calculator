export type DecisionInputs = {
  currentPropertyValue: number;
  currentPropertyAcb: number;
  currentMortgageBalance: number;
  currentCapRate: number;
  currentGrowthRate: number;
  newCapRate: number;
  newGrowthRate: number;
  marginalTaxRate: number;
  capitalGainsInclusionRate: number;
  realtorFeesPercent: number;
  propertyTransferTaxPercent: number;
  investmentAccountRoi: number;
  loanRate: number;
  loanAmortizationYears: number;
  clientAge: number;
  planningAge: number;
  newLoanToValue: number;
  decisionMarginPercent: number;
};

export type YearlySnapshot = {
  age: number;
  propertyValue: number;
  mortgageBalance: number;
  netIncome: number;
  taxPayable: number;
  cashFlow: number;
  investmentAccount: number;
  strategyValue: number;
  capitalGainsTax: number;
};

export type DecisionResult = {
  decision: "YES" | "NO";
  decisionReason: string;
  marginPercent: number;
  planningAge: number;
  currentAtPlanning: YearlySnapshot;
  newAtPlanning: YearlySnapshot;
  breakEvenAge: number | null;
  peakDeltaAge: number | null;
  peakDeltaValue: number;
  currentSeries: YearlySnapshot[];
  newSeries: YearlySnapshot[];
  series: {
    age: number;
    currentValue: number;
    newValue: number;
    delta: number;
  }[];
};

const safeNumber = (value: number) => (Number.isFinite(value) ? value : 0);

const calculateMonthlyPayment = (loanAmount: number, annualRate: number, termYears: number) => {
  const principal = safeNumber(loanAmount);
  if (principal <= 0) return 0;
  const months = Math.max(1, Math.round(safeNumber(termYears) * 12));
  const monthlyRate = safeNumber(annualRate) / 100 / 12;
  if (monthlyRate <= 0) return principal / months;
  const factor = Math.pow(1 + monthlyRate, months);
  return (principal * monthlyRate * factor) / (factor - 1);
};

const futureValue = (
  annualRate: number,
  years: number,
  annualPayment: number,
  presentValue: number,
  type: 0 | 1
) => {
  const rate = safeNumber(annualRate) / 100;
  if (years === 0) return -presentValue;
  if (rate === 0) return -(presentValue + annualPayment * years);
  const factor = Math.pow(1 + rate, years);
  return -(
    presentValue * factor +
    annualPayment * (1 + rate * type) * ((factor - 1) / rate)
  );
};

const buildMortgageBalances = (
  startingBalance: number,
  annualRate: number,
  termYears: number,
  years: number
) => {
  const balances: number[] = [];
  const balance = Math.max(0, safeNumber(startingBalance));
  const monthlyPayment = calculateMonthlyPayment(balance, annualRate, termYears);
  const annualPayment = monthlyPayment * 12;

  for (let year = 0; year < years; year += 1) {
    const nextBalance = -futureValue(annualRate, year, -annualPayment, balance, 1);
    balances.push(Math.max(0, nextBalance));
  }

  return { balances, annualDebtService: annualPayment };
};

const capitalGainsTax = (
  value: number,
  acb: number,
  inclusionRate: number,
  taxRate: number
) => {
  const gain = safeNumber(value) - safeNumber(acb);
  return gain * (safeNumber(inclusionRate) / 100) * (safeNumber(taxRate) / 100);
};

export const calculateDecision = (input: DecisionInputs): DecisionResult => {
  const clientAge = Math.round(safeNumber(input.clientAge));
  const planningAge = Math.max(clientAge, Math.round(safeNumber(input.planningAge)));
  const years = planningAge - clientAge + 1;

  const currentBalances = buildMortgageBalances(
    input.currentMortgageBalance,
    input.loanRate,
    input.loanAmortizationYears,
    years
  );

  const initialCapitalGainsTax = capitalGainsTax(
    input.currentPropertyValue,
    input.currentPropertyAcb,
    input.capitalGainsInclusionRate,
    input.marginalTaxRate
  );

  const totalSellCostsPercent =
    safeNumber(input.realtorFeesPercent) + safeNumber(input.propertyTransferTaxPercent);
  const saleCosts = (totalSellCostsPercent / 100) * safeNumber(input.currentPropertyValue);
  const netSaleProceeds = Math.max(
    0,
    safeNumber(input.currentPropertyValue) -
      safeNumber(input.currentMortgageBalance) -
      initialCapitalGainsTax -
      saleCosts
  );

  const newLoanToValue = safeNumber(input.newLoanToValue) / 100;
  const newPropertyValueStart =
    newLoanToValue >= 1 ? 0 : netSaleProceeds / (1 - newLoanToValue);
  const newMortgageStart = Math.max(0, newPropertyValueStart * newLoanToValue);

  const newBalances = buildMortgageBalances(
    newMortgageStart,
    input.loanRate,
    input.loanAmortizationYears,
    years
  );

  const series: DecisionResult["series"] = [];
  const currentSnapshots: YearlySnapshot[] = [];
  const newSnapshots: YearlySnapshot[] = [];

  let currentInvestment = 0;
  let newInvestment = 0;
  const afterTaxRoi =
    (safeNumber(input.investmentAccountRoi) / 100) *
    (1 - safeNumber(input.marginalTaxRate) / 100);
  const investmentGrowth = 1 + afterTaxRoi;

  for (let index = 0; index < years; index += 1) {
    const age = clientAge + index;
    const currentValue =
      safeNumber(input.currentPropertyValue) * Math.pow(1 + safeNumber(input.currentGrowthRate) / 100, index);
    const currentMortgage = currentBalances.balances[index] ?? 0;
    const currentNetIncome = (safeNumber(input.currentCapRate) / 100) * currentValue;
    const currentInterestExpense = currentMortgage * (safeNumber(input.loanRate) / 100);
    const currentTax =
      (currentNetIncome - currentInterestExpense) *
      (safeNumber(input.marginalTaxRate) / 100);
    const currentCashFlow =
      currentNetIncome - currentTax - currentBalances.annualDebtService;
    currentInvestment = currentInvestment * investmentGrowth + currentCashFlow;
    const currentCapitalGainsTax = capitalGainsTax(
      currentValue,
      input.currentPropertyAcb,
      input.capitalGainsInclusionRate,
      input.marginalTaxRate
    );
    const currentStrategyValue =
      currentValue - currentMortgage - currentCapitalGainsTax + currentInvestment;

    const newValue =
      newPropertyValueStart * Math.pow(1 + safeNumber(input.newGrowthRate) / 100, index);
    const newMortgage = newBalances.balances[index] ?? 0;
    const newNetIncome = (safeNumber(input.newCapRate) / 100) * newValue;
    const newInterestExpense = newMortgage * (safeNumber(input.loanRate) / 100);
    const newTax =
      (newNetIncome - newInterestExpense) * (safeNumber(input.marginalTaxRate) / 100);
    const newCashFlow = newNetIncome - newTax - newBalances.annualDebtService;
    newInvestment = newInvestment * investmentGrowth + newCashFlow;
    const newStrategyValue = newValue - newMortgage + newInvestment;

    currentSnapshots.push({
      age,
      propertyValue: currentValue,
      mortgageBalance: currentMortgage,
      netIncome: currentNetIncome,
      taxPayable: currentTax,
      cashFlow: currentCashFlow,
      investmentAccount: currentInvestment,
      strategyValue: currentStrategyValue,
      capitalGainsTax: currentCapitalGainsTax,
    });

    newSnapshots.push({
      age,
      propertyValue: newValue,
      mortgageBalance: newMortgage,
      netIncome: newNetIncome,
      taxPayable: newTax,
      cashFlow: newCashFlow,
      investmentAccount: newInvestment,
      strategyValue: newStrategyValue,
      capitalGainsTax: 0,
    });

    series.push({
      age,
      currentValue: currentStrategyValue,
      newValue: newStrategyValue,
      delta: newStrategyValue - currentStrategyValue,
    });
  }

  const planningIndex = years - 1;
  const currentAtPlanning = currentSnapshots[planningIndex];
  const newAtPlanning = newSnapshots[planningIndex];

  const marginPercent = safeNumber(input.decisionMarginPercent);
  const threshold = currentAtPlanning.strategyValue * (1 + marginPercent / 100);
  const decision = newAtPlanning.strategyValue >= threshold ? "YES" : "NO";
  const deltaAtPlanning = newAtPlanning.strategyValue - currentAtPlanning.strategyValue;

  let breakEvenAge: number | null = null;
  let peakDeltaValue = Number.NEGATIVE_INFINITY;
  let peakDeltaAge: number | null = null;

  series.forEach((point) => {
    if (breakEvenAge === null && point.delta >= 0) {
      breakEvenAge = point.age;
    }
    if (point.delta > peakDeltaValue) {
      peakDeltaValue = point.delta;
      peakDeltaAge = point.age;
    }
  });

  const decisionReason =
    decision === "YES"
      ? `New strategy exceeds current by ${deltaAtPlanning.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        })} at age ${planningAge}.`
      : `Current strategy remains ahead by ${Math.abs(deltaAtPlanning).toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        })} at age ${planningAge}.`;

  return {
    decision,
    decisionReason,
    marginPercent,
    planningAge,
    currentAtPlanning,
    newAtPlanning,
    breakEvenAge,
    peakDeltaAge,
    peakDeltaValue: Number.isFinite(peakDeltaValue) ? peakDeltaValue : 0,
    currentSeries: currentSnapshots,
    newSeries: newSnapshots,
    series,
  };
};
