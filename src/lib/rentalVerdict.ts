export type PaymentFrequency =
  | "monthly"
  | "semi-monthly"
  | "bi-weekly"
  | "weekly"
  | "accelerated-bi-weekly"
  | "accelerated-weekly";

export type MortgageInputs = {
  mortgageAmount: number;
  interestRate: number;
  amortizationYears: number;
  paymentFrequency: PaymentFrequency;
  termYears: number;
};

export type RentRange = {
  low: number;
  median: number;
  high: number;
  source: "web-estimate" | "provider-estimate" | "manual";
};

export type ExpenseInputs = {
  vacancyPercent: number;
  maintenancePercent: number;
  managementPercent: number;
  reservesPercent: number;
  insuranceAnnual: number;
  utilitiesAnnual: number;
  hoaMonthly: number;
  propertyTaxAnnual: number;
};

export type InvestmentMetrics = {
  noiAnnual: number;
  capRate: number;
  cashFlowAnnual: number;
  dscr: number;
  verdict: "Excellent" | "Good" | "Weak";
};

const safeNumber = (value: number) => (Number.isFinite(value) ? value : 0);

const paymentsPerYear = (frequency: PaymentFrequency) => {
  switch (frequency) {
    case "weekly":
    case "accelerated-weekly":
      return 52;
    case "bi-weekly":
    case "accelerated-bi-weekly":
      return 26;
    case "semi-monthly":
      return 24;
    case "monthly":
    default:
      return 12;
  }
};

const periodicRate = (annualRate: number, frequency: PaymentFrequency) => {
  const rate = safeNumber(annualRate) / 100;
  const perYear = paymentsPerYear(frequency);
  if (rate <= 0) return 0;
  const compoundPerYear = 2;
  return Math.pow(1 + rate / compoundPerYear, compoundPerYear / perYear) - 1;
};

export const calculateMortgage = (input: MortgageInputs) => {
  const principal = Math.max(0, safeNumber(input.mortgageAmount));
  const perYear = paymentsPerYear(input.paymentFrequency);
  const periods = Math.max(1, Math.round(safeNumber(input.amortizationYears) * perYear));
  const rate = periodicRate(input.interestRate, input.paymentFrequency);
  if (principal === 0) {
    return { payment: 0, totalInterestTerm: 0, balanceAfterTerm: 0 };
  }

  const basePayment =
    rate === 0 ? principal / periods : (principal * rate) / (1 - Math.pow(1 + rate, -periods));

  const payment =
    input.paymentFrequency === "accelerated-bi-weekly"
      ? basePayment / 2
      : input.paymentFrequency === "accelerated-weekly"
        ? basePayment / 4
        : basePayment;

  const termPeriods = Math.max(1, Math.round(safeNumber(input.termYears) * perYear));
  let balance = principal;
  let totalInterest = 0;

  for (let i = 0; i < termPeriods; i += 1) {
    const interest = balance * rate;
    const principalPaid = Math.max(0, payment - interest);
    totalInterest += interest;
    balance = Math.max(0, balance - principalPaid);
    if (balance === 0) break;
  }

  return { payment, totalInterestTerm: totalInterest, balanceAfterTerm: balance };
};

export const calculateInvestment = (
  price: number,
  rentRange: RentRange,
  expenses: ExpenseInputs,
  mortgagePaymentAnnual: number
): InvestmentMetrics => {
  const medianRent = safeNumber(rentRange.median);
  const grossAnnual = medianRent * 12;
  const vacancyLoss = grossAnnual * (safeNumber(expenses.vacancyPercent) / 100);
  const effectiveIncome = grossAnnual - vacancyLoss;

  const management = effectiveIncome * (safeNumber(expenses.managementPercent) / 100);
  const maintenance = effectiveIncome * (safeNumber(expenses.maintenancePercent) / 100);
  const reserves = effectiveIncome * (safeNumber(expenses.reservesPercent) / 100);
  const hoa = safeNumber(expenses.hoaMonthly) * 12;

  const operatingExpenses =
    management +
    maintenance +
    reserves +
    safeNumber(expenses.insuranceAnnual) +
    safeNumber(expenses.utilitiesAnnual) +
    safeNumber(expenses.propertyTaxAnnual) +
    hoa;

  const noi = effectiveIncome - operatingExpenses;
  const capRate = price > 0 ? noi / price : 0;
  const cashFlow = noi - mortgagePaymentAnnual;
  const dscr = mortgagePaymentAnnual > 0 ? noi / mortgagePaymentAnnual : 0;

  const verdict =
    capRate >= 0.045 ? "Excellent" : capRate >= 0.03 ? "Good" : "Weak";

  return { noiAnnual: noi, capRate, cashFlowAnnual: cashFlow, dscr, verdict };
};
