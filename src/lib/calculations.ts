export type ExpenseInputs = {
  taxes: number;
  insurance: number;
  maintenanceMonthly: number;
  maintenancePercent: number;
  managementPercent: number;
  utilities: number;
  hoa: number;
  reserves: number;
};

export type CurrentPropertyInputs = {
  rent: number;
  otherIncome: number;
  vacancyPercent: number;
  expenses: ExpenseInputs;
  loanBalance: number;
  interestRate: number;
  monthlyPayment: number;
  salePrice: number;
  sellingCostPercent: number;
};

export type NewPropertyInputs = {
  purchasePrice: number;
  closingCosts: number;
  closingCostsPercent: number;
  rehab: number;
  downPaymentPercent: number;
  interestRate: number;
  loanTermYears: number;
  rent: number;
  otherIncome: number;
  vacancyPercent: number;
  expenses: ExpenseInputs;
};

export type PropertyMetrics = {
  grossMonthlyIncome: number;
  vacancyLossMonthly: number;
  effectiveMonthlyIncome: number;
  operatingExpensesMonthly: number;
  noiMonthly: number;
  noiAnnual: number;
  debtServiceMonthly: number;
  cashFlowMonthly: number;
  cashFlowAnnual: number;
  capRate: number;
  cashInvested: number;
  cashOnCash: number;
};

export type ComparisonMetrics = {
  current: PropertyMetrics;
  next: PropertyMetrics;
  saleNetProceeds: number;
  newLoanAmount: number;
  newMonthlyPayment: number;
};

const safeNumber = (value: number) => (Number.isFinite(value) ? value : 0);

const maintenanceExpense = (rent: number, expenses: ExpenseInputs) => {
  const percentCost = (safeNumber(expenses.maintenancePercent) / 100) * rent;
  return safeNumber(expenses.maintenanceMonthly) + safeNumber(percentCost);
};

const managementExpense = (grossIncome: number, managementPercent: number) =>
  (safeNumber(managementPercent) / 100) * grossIncome;

const calculateDebtService = (loanAmount: number, annualRate: number, termYears: number) => {
  const principal = safeNumber(loanAmount);
  if (principal <= 0) return 0;
  const months = Math.max(1, Math.round(safeNumber(termYears) * 12));
  const monthlyRate = safeNumber(annualRate) / 100 / 12;
  if (monthlyRate <= 0) return principal / months;
  const factor = Math.pow(1 + monthlyRate, months);
  return (principal * monthlyRate * factor) / (factor - 1);
};

export const calculateCurrentMetrics = (input: CurrentPropertyInputs): PropertyMetrics => {
  const rent = safeNumber(input.rent);
  const otherIncome = safeNumber(input.otherIncome);
  const grossIncome = rent + otherIncome;
  const vacancyLoss = (safeNumber(input.vacancyPercent) / 100) * grossIncome;
  const effectiveIncome = grossIncome - vacancyLoss;

  const expenses = input.expenses;
  const operatingExpenses =
    safeNumber(expenses.taxes) +
    safeNumber(expenses.insurance) +
    maintenanceExpense(rent, expenses) +
    managementExpense(grossIncome, expenses.managementPercent) +
    safeNumber(expenses.utilities) +
    safeNumber(expenses.hoa) +
    safeNumber(expenses.reserves);

  const noiMonthly = effectiveIncome - operatingExpenses;
  const noiAnnual = noiMonthly * 12;
  const debtService = safeNumber(input.monthlyPayment);
  const cashFlowMonthly = noiMonthly - debtService;
  const cashFlowAnnual = cashFlowMonthly * 12;

  const value = safeNumber(input.salePrice);
  const capRate = value > 0 ? noiAnnual / value : 0;

  const sellingCosts = (safeNumber(input.sellingCostPercent) / 100) * safeNumber(input.salePrice);
  const cashInvested = Math.max(
    0,
    safeNumber(input.salePrice) - sellingCosts - safeNumber(input.loanBalance)
  );
  const cashOnCash = cashInvested > 0 ? cashFlowAnnual / cashInvested : 0;

  return {
    grossMonthlyIncome: grossIncome,
    vacancyLossMonthly: vacancyLoss,
    effectiveMonthlyIncome: effectiveIncome,
    operatingExpensesMonthly: operatingExpenses,
    noiMonthly,
    noiAnnual,
    debtServiceMonthly: debtService,
    cashFlowMonthly,
    cashFlowAnnual,
    capRate,
    cashInvested,
    cashOnCash,
  };
};

export const calculateNewMetrics = (input: NewPropertyInputs): PropertyMetrics => {
  const rent = safeNumber(input.rent);
  const otherIncome = safeNumber(input.otherIncome);
  const grossIncome = rent + otherIncome;
  const vacancyLoss = (safeNumber(input.vacancyPercent) / 100) * grossIncome;
  const effectiveIncome = grossIncome - vacancyLoss;

  const expenses = input.expenses;
  const operatingExpenses =
    safeNumber(expenses.taxes) +
    safeNumber(expenses.insurance) +
    maintenanceExpense(rent, expenses) +
    managementExpense(grossIncome, expenses.managementPercent) +
    safeNumber(expenses.utilities) +
    safeNumber(expenses.hoa) +
    safeNumber(expenses.reserves);

  const noiMonthly = effectiveIncome - operatingExpenses;
  const noiAnnual = noiMonthly * 12;

  const downPayment = (safeNumber(input.downPaymentPercent) / 100) * safeNumber(input.purchasePrice);
  const loanAmount = Math.max(0, safeNumber(input.purchasePrice) - downPayment);
  const debtService = calculateDebtService(loanAmount, input.interestRate, input.loanTermYears);

  const cashFlowMonthly = noiMonthly - debtService;
  const cashFlowAnnual = cashFlowMonthly * 12;

  const value = safeNumber(input.purchasePrice);
  const capRate = value > 0 ? noiAnnual / value : 0;

  const closingCosts =
    safeNumber(input.closingCosts) > 0
      ? safeNumber(input.closingCosts)
      : (safeNumber(input.closingCostsPercent) / 100) * safeNumber(input.purchasePrice);
  const cashInvested = Math.max(0, downPayment + closingCosts + safeNumber(input.rehab));
  const cashOnCash = cashInvested > 0 ? cashFlowAnnual / cashInvested : 0;

  return {
    grossMonthlyIncome: grossIncome,
    vacancyLossMonthly: vacancyLoss,
    effectiveMonthlyIncome: effectiveIncome,
    operatingExpensesMonthly: operatingExpenses,
    noiMonthly,
    noiAnnual,
    debtServiceMonthly: debtService,
    cashFlowMonthly,
    cashFlowAnnual,
    capRate,
    cashInvested,
    cashOnCash,
  };
};

export const calculateComparison = (
  currentInput: CurrentPropertyInputs,
  newInput: NewPropertyInputs
): ComparisonMetrics => {
  const current = calculateCurrentMetrics(currentInput);
  const next = calculateNewMetrics(newInput);

  const sellingCosts =
    (safeNumber(currentInput.sellingCostPercent) / 100) * safeNumber(currentInput.salePrice);
  const saleNetProceeds = Math.max(
    0,
    safeNumber(currentInput.salePrice) - sellingCosts - safeNumber(currentInput.loanBalance)
  );

  const downPayment = (safeNumber(newInput.downPaymentPercent) / 100) * safeNumber(newInput.purchasePrice);
  const newLoanAmount = Math.max(0, safeNumber(newInput.purchasePrice) - downPayment);
  const newMonthlyPayment = calculateDebtService(newLoanAmount, newInput.interestRate, newInput.loanTermYears);

  return { current, next, saleNetProceeds, newLoanAmount, newMonthlyPayment };
};
