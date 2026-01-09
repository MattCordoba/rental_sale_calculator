"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  type CurrentPropertyInputs,
  type NewPropertyInputs,
  calculateComparison,
} from "@/lib/calculations";
import { NoopStorage, type AppState } from "@/lib/storage";

const defaultExpenses = {
  taxes: 0,
  insurance: 0,
  maintenanceMonthly: 0,
  maintenancePercent: 0,
  managementPercent: 0,
  utilities: 0,
  hoa: 0,
  reserves: 0,
};

const defaultCurrent: CurrentPropertyInputs = {
  rent: 0,
  otherIncome: 0,
  vacancyPercent: 5,
  expenses: { ...defaultExpenses },
  loanBalance: 0,
  interestRate: 6.5,
  monthlyPayment: 0,
  salePrice: 0,
  sellingCostPercent: 7,
};

const defaultNext: NewPropertyInputs = {
  purchasePrice: 0,
  closingCosts: 0,
  closingCostsPercent: 2.5,
  rehab: 0,
  downPaymentPercent: 25,
  interestRate: 6.75,
  loanTermYears: 30,
  rent: 0,
  otherIncome: 0,
  vacancyPercent: 5,
  expenses: { ...defaultExpenses },
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const currencyFine = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const percent = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 2,
});

const StepPill = ({ active, label }: { active: boolean; label: string }) => (
  <div
    className={`px-4 py-2 rounded-full text-xs uppercase tracking-[0.2em] border transition ${
      active
        ? "bg-lupin-black text-white border-lupin-black"
        : "border-white/30 text-white/60"
    }`}
  >
    {label}
  </div>
);

const Field = ({
  label,
  value,
  suffix,
  onChange,
  step = 1,
  hint,
  required,
  invalid,
}: {
  label: string;
  value: number;
  suffix?: string;
  step?: number;
  hint?: string;
  required?: boolean;
  invalid?: boolean;
  onChange: (value: number) => void;
}) => (
  <label className="flex flex-col gap-2 text-sm text-white/80">
    <span className="flex items-center justify-between">
      <span className="font-medium text-white">
        {label}
        {required ? <span className="ml-1 text-lupin-accent">*</span> : null}
      </span>
      {hint ? <span className="text-xs text-white/50">{hint}</span> : null}
    </span>
    <div
      className={`flex items-center gap-2 rounded-2xl border px-4 py-3 shadow-inner transition ${
        invalid ? "border-lupin-accent bg-white/10" : "border-white/15 bg-white/5"
      }`}
    >
      <input
        className="w-full bg-transparent text-lg text-white placeholder-white/40 outline-none"
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(parseFloat(event.target.value) || 0)}
      />
      {suffix ? <span className="text-xs text-white/50">{suffix}</span> : null}
    </div>
    {invalid ? (
      <span className="text-xs text-lupin-accent/90">Required for this step.</span>
    ) : null}
  </label>
);

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.8)]">
    <h3 className="text-lg font-semibold text-white">{title}</h3>
    <div className="mt-5 grid gap-4 md:grid-cols-2">{children}</div>
  </section>
);

const SummaryStat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
    <p className="text-xs uppercase tracking-[0.25em] text-white/40">{label}</p>
    <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
  </div>
);

export default function Wizard() {
  const [step, setStep] = useState(0);
  const [current, setCurrent] = useState<CurrentPropertyInputs>(defaultCurrent);
  const [next, setNext] = useState<NewPropertyInputs>(defaultNext);

  const storage = useMemo(() => new NoopStorage(), []);

  useEffect(() => {
    storage.load().then((data) => {
      if (!data) return;
      setCurrent(data.current);
      setNext(data.next);
    });
  }, [storage]);

  useEffect(() => {
    const state: AppState = { current, next };
    storage.save(state);
  }, [current, next, storage]);

  const comparison = useMemo(() => calculateComparison(current, next), [current, next]);

  const steps = ["Current", "Sale", "New", "Results"];
  const [showErrors, setShowErrors] = useState(false);

  const requiredMap = useMemo(() => {
    return [
      {
        currentRent: current.rent > 0,
      },
      {
        salePrice: current.salePrice > 0,
      },
      {
        purchasePrice: next.purchasePrice > 0,
        downPayment: next.downPaymentPercent > 0,
        newRent: next.rent > 0,
      },
      {},
    ];
  }, [current.rent, current.salePrice, next.downPaymentPercent, next.purchasePrice, next.rent]);

  const isStepValid = useMemo(() => {
    const map = requiredMap[step] ?? {};
    return Object.values(map).every(Boolean);
  }, [requiredMap, step]);

  const handleNext = () => {
    if (step >= steps.length - 1) return;
    if (!isStepValid) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    setStep((value) => Math.min(steps.length - 1, value + 1));
  };

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-white/50">Rental Sale Calculator</p>
          <h1 className="mt-3 text-4xl font-semibold text-white md:text-5xl">
            Should you sell your rental and trade up for stronger cash flow?
          </h1>
          <p className="mt-4 max-w-2xl text-base text-white/70">
            Walk through each section to compare cash flow, cap rate, and cash-on-cash return between
            your current rental and a new property.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {steps.map((label, index) => (
            <StepPill key={label} label={label} active={index === step} />
          ))}
        </div>
      </div>

      <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-8">
        {step === 0 && (
          <div className="flex flex-col gap-6">
            <Section title="Current Rental Income">
              <Field
                label="Monthly rent"
                value={current.rent}
                onChange={(value) => setCurrent({ ...current, rent: value })}
                suffix="USD"
                required
                invalid={showErrors && !requiredMap[0].currentRent}
              />
              <Field
                label="Other income"
                value={current.otherIncome}
                onChange={(value) => setCurrent({ ...current, otherIncome: value })}
                suffix="USD"
              />
              <Field
                label="Vacancy/credit loss"
                value={current.vacancyPercent}
                onChange={(value) => setCurrent({ ...current, vacancyPercent: value })}
                suffix="%"
                step={0.1}
              />
            </Section>
            <Section title="Operating Expenses (Monthly)">
              <Field
                label="Property taxes"
                value={current.expenses.taxes}
                onChange={(value) =>
                  setCurrent({ ...current, expenses: { ...current.expenses, taxes: value } })
                }
                suffix="USD"
              />
              <Field
                label="Insurance"
                value={current.expenses.insurance}
                onChange={(value) =>
                  setCurrent({ ...current, expenses: { ...current.expenses, insurance: value } })
                }
                suffix="USD"
              />
              <Field
                label="Maintenance/repairs"
                value={current.expenses.maintenanceMonthly}
                onChange={(value) =>
                  setCurrent({
                    ...current,
                    expenses: { ...current.expenses, maintenanceMonthly: value },
                  })
                }
                suffix="USD"
                hint="+ % below"
              />
              <Field
                label="Maintenance % of rent"
                value={current.expenses.maintenancePercent}
                onChange={(value) =>
                  setCurrent({
                    ...current,
                    expenses: { ...current.expenses, maintenancePercent: value },
                  })
                }
                suffix="%"
                step={0.1}
              />
              <Field
                label="Management fee"
                value={current.expenses.managementPercent}
                onChange={(value) =>
                  setCurrent({
                    ...current,
                    expenses: { ...current.expenses, managementPercent: value },
                  })
                }
                suffix="%"
                step={0.1}
              />
              <Field
                label="Owner-paid utilities"
                value={current.expenses.utilities}
                onChange={(value) =>
                  setCurrent({ ...current, expenses: { ...current.expenses, utilities: value } })
                }
                suffix="USD"
              />
              <Field
                label="HOA / misc"
                value={current.expenses.hoa}
                onChange={(value) =>
                  setCurrent({ ...current, expenses: { ...current.expenses, hoa: value } })
                }
                suffix="USD"
              />
              <Field
                label="Reserves / capex"
                value={current.expenses.reserves}
                onChange={(value) =>
                  setCurrent({ ...current, expenses: { ...current.expenses, reserves: value } })
                }
                suffix="USD"
              />
            </Section>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-6">
            <Section title="Current Financing">
              <Field
                label="Remaining loan balance"
                value={current.loanBalance}
                onChange={(value) => setCurrent({ ...current, loanBalance: value })}
                suffix="USD"
              />
              <Field
                label="Interest rate"
                value={current.interestRate}
                onChange={(value) => setCurrent({ ...current, interestRate: value })}
                suffix="%"
                step={0.01}
              />
              <Field
                label="Monthly payment"
                value={current.monthlyPayment}
                onChange={(value) => setCurrent({ ...current, monthlyPayment: value })}
                suffix="USD"
              />
            </Section>
            <Section title="Sale Assumptions">
              <Field
                label="Expected sale price"
                value={current.salePrice}
                onChange={(value) => setCurrent({ ...current, salePrice: value })}
                suffix="USD"
                required
                invalid={showErrors && !requiredMap[1].salePrice}
              />
              <Field
                label="Selling costs"
                value={current.sellingCostPercent}
                onChange={(value) => setCurrent({ ...current, sellingCostPercent: value })}
                suffix="%"
                step={0.1}
              />
            </Section>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-6">
            <Section title="New Property Purchase">
              <Field
                label="Purchase price"
                value={next.purchasePrice}
                onChange={(value) => setNext({ ...next, purchasePrice: value })}
                suffix="USD"
                required
                invalid={showErrors && !requiredMap[2].purchasePrice}
              />
              <Field
                label="Down payment"
                value={next.downPaymentPercent}
                onChange={(value) => setNext({ ...next, downPaymentPercent: value })}
                suffix="%"
                step={0.1}
                required
                invalid={showErrors && !requiredMap[2].downPayment}
              />
              <Field
                label="Closing costs"
                value={next.closingCosts}
                onChange={(value) => setNext({ ...next, closingCosts: value })}
                suffix="USD"
                hint="or % below"
              />
              <Field
                label="Closing costs %"
                value={next.closingCostsPercent}
                onChange={(value) => setNext({ ...next, closingCostsPercent: value })}
                suffix="%"
                step={0.1}
              />
              <Field
                label="Rehab / make-ready"
                value={next.rehab}
                onChange={(value) => setNext({ ...next, rehab: value })}
                suffix="USD"
                hint="optional"
              />
            </Section>

            <Section title="Financing">
              <Field
                label="Interest rate"
                value={next.interestRate}
                onChange={(value) => setNext({ ...next, interestRate: value })}
                suffix="%"
                step={0.01}
              />
              <Field
                label="Loan term"
                value={next.loanTermYears}
                onChange={(value) => setNext({ ...next, loanTermYears: value })}
                suffix="years"
                step={1}
              />
            </Section>

            <Section title="Projected Income">
              <Field
                label="Monthly rent"
                value={next.rent}
                onChange={(value) => setNext({ ...next, rent: value })}
                suffix="USD"
                required
                invalid={showErrors && !requiredMap[2].newRent}
              />
              <Field
                label="Other income"
                value={next.otherIncome}
                onChange={(value) => setNext({ ...next, otherIncome: value })}
                suffix="USD"
              />
              <Field
                label="Vacancy/credit loss"
                value={next.vacancyPercent}
                onChange={(value) => setNext({ ...next, vacancyPercent: value })}
                suffix="%"
                step={0.1}
              />
            </Section>

            <Section title="Operating Expenses (Monthly)">
              <Field
                label="Property taxes"
                value={next.expenses.taxes}
                onChange={(value) => setNext({ ...next, expenses: { ...next.expenses, taxes: value } })}
                suffix="USD"
              />
              <Field
                label="Insurance"
                value={next.expenses.insurance}
                onChange={(value) =>
                  setNext({ ...next, expenses: { ...next.expenses, insurance: value } })
                }
                suffix="USD"
              />
              <Field
                label="Maintenance/repairs"
                value={next.expenses.maintenanceMonthly}
                onChange={(value) =>
                  setNext({
                    ...next,
                    expenses: { ...next.expenses, maintenanceMonthly: value },
                  })
                }
                suffix="USD"
                hint="+ % below"
              />
              <Field
                label="Maintenance % of rent"
                value={next.expenses.maintenancePercent}
                onChange={(value) =>
                  setNext({
                    ...next,
                    expenses: { ...next.expenses, maintenancePercent: value },
                  })
                }
                suffix="%"
                step={0.1}
              />
              <Field
                label="Management fee"
                value={next.expenses.managementPercent}
                onChange={(value) =>
                  setNext({
                    ...next,
                    expenses: { ...next.expenses, managementPercent: value },
                  })
                }
                suffix="%"
                step={0.1}
              />
              <Field
                label="Owner-paid utilities"
                value={next.expenses.utilities}
                onChange={(value) =>
                  setNext({ ...next, expenses: { ...next.expenses, utilities: value } })
                }
                suffix="USD"
              />
              <Field
                label="HOA / misc"
                value={next.expenses.hoa}
                onChange={(value) => setNext({ ...next, expenses: { ...next.expenses, hoa: value } })}
                suffix="USD"
              />
              <Field
                label="Reserves / capex"
                value={next.expenses.reserves}
                onChange={(value) =>
                  setNext({ ...next, expenses: { ...next.expenses, reserves: value } })
                }
                suffix="USD"
              />
            </Section>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-6">
            <Section title="Comparison Summary">
              <div className="col-span-full grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-white/15 bg-black/30 p-5">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/40">Current Rental</p>
                  <h4 className="mt-3 text-xl font-semibold text-white">Cash Flow & Returns</h4>
                  <div className="mt-4 space-y-2 text-sm text-white/70">
                    <p>Monthly cash flow: <span className="text-white">{currency.format(comparison.current.cashFlowMonthly)}</span></p>
                    <p>Annual cash flow: <span className="text-white">{currency.format(comparison.current.cashFlowAnnual)}</span></p>
                    <p>Cap rate: <span className="text-white">{percent.format(comparison.current.capRate)}</span></p>
                    <p>Cash-on-cash: <span className="text-white">{percent.format(comparison.current.cashOnCash)}</span></p>
                  </div>
                </div>
                <div className="rounded-3xl border border-white/15 bg-black/30 p-5">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/40">New Property</p>
                  <h4 className="mt-3 text-xl font-semibold text-white">Cash Flow & Returns</h4>
                  <div className="mt-4 space-y-2 text-sm text-white/70">
                    <p>Monthly cash flow: <span className="text-white">{currency.format(comparison.next.cashFlowMonthly)}</span></p>
                    <p>Annual cash flow: <span className="text-white">{currency.format(comparison.next.cashFlowAnnual)}</span></p>
                    <p>Cap rate: <span className="text-white">{percent.format(comparison.next.capRate)}</span></p>
                    <p>Cash-on-cash: <span className="text-white">{percent.format(comparison.next.cashOnCash)}</span></p>
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Capital & Financing Snapshot">
              <SummaryStat
                label="Net sale proceeds"
                value={currency.format(comparison.saleNetProceeds)}
              />
              <SummaryStat
                label="Estimated new loan amount"
                value={currency.format(comparison.newLoanAmount)}
              />
              <SummaryStat
                label="Estimated monthly payment"
                value={currencyFine.format(comparison.newMonthlyPayment)}
              />
              <SummaryStat
                label="Cash invested (new)"
                value={currency.format(comparison.next.cashInvested)}
              />
            </Section>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
              <p className="text-white font-semibold">Decision signal</p>
              <p className="mt-2">
                Focus on higher annual cash flow and stronger cash-on-cash return. If the new
                property also improves cap rate while staying within your available equity, it is
                likely a better cash-flow swap.
              </p>
              <p className="mt-3 text-xs text-white/50">
                These estimates are simplified for v1. Taxes, financing fees, and depreciation are
                not included.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="text-sm text-white/60">
          Step {step + 1} of {steps.length}
        </div>
        <div className="flex flex-col items-end gap-2">
          {showErrors && !isStepValid ? (
            <span className="text-xs text-lupin-accent">Complete the required fields to continue.</span>
          ) : null}
          <div className="flex gap-3">
          <button
            className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white/80 transition hover:border-white/50 hover:text-white disabled:opacity-40"
            onClick={() => {
              setShowErrors(false);
              setStep((value) => Math.max(0, value - 1));
            }}
            disabled={step === 0}
          >
            Back
          </button>
          <button
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]"
            onClick={handleNext}
            disabled={step === steps.length - 1}
          >
            {step === steps.length - 1 ? "Done" : "Continue"}
          </button>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-black/50 p-6 text-xs text-white/50">
        <p>
          Note: Cash-on-cash uses equity from the current sale as invested capital for comparison.
          Closing costs default to the percent value if a dollar amount is not provided.
        </p>
        <p className="mt-2">
          Preview values: New loan payment is estimated using the loan term and rate inputs.
        </p>
      </div>

      <div className="flex items-center justify-between text-xs text-white/50">
        <div className="flex items-center gap-2">
          <img src="/assets/lupin-logo.png" alt="Lupin logo" className="h-7 w-7" />
          <span>Rental Sale Calculator</span>
        </div>
        <span>© Lupin</span>
      </div>
    </div>
  );
}
