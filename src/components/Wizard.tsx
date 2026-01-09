"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import ComparisonChart from "@/components/ComparisonChart";
import { calculateDecision, type DecisionInputs } from "@/lib/sellDecision";
import { NoopStorage, type AppState } from "@/lib/storage";

const defaultInputs: DecisionInputs = {
  currentPropertyValue: 10_000_000,
  currentPropertyAcb: 2_000_000,
  currentMortgageBalance: 1_000_000,
  currentCapRate: 2,
  currentGrowthRate: 4,
  newCapRate: 2,
  newGrowthRate: 4,
  marginalTaxRate: 50,
  capitalGainsInclusionRate: 66.6667,
  realtorFeesPercent: 2,
  propertyTransferTaxPercent: 2.8,
  investmentAccountRoi: 5,
  loanRate: 5,
  loanAmortizationYears: 25,
  clientAge: 70,
  planningAge: 90,
  newLoanToValue: 10,
  decisionMarginPercent: 2,
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
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
}) => {
  const [inputValue, setInputValue] = useState(
    Number.isFinite(value) && value !== 0 ? String(value) : ""
  );

  useEffect(() => {
    const nextValue = Number.isFinite(value) && value !== 0 ? String(value) : "";
    if (nextValue !== inputValue) {
      setInputValue(nextValue);
    }
  }, [inputValue, value]);

  return (
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
          value={inputValue}
          onFocus={() => {
            if (inputValue === "0") {
              setInputValue("");
            }
          }}
          onChange={(event) => {
            const nextRaw = event.target.value;
            setInputValue(nextRaw);
            const parsed = parseFloat(nextRaw);
            onChange(Number.isFinite(parsed) ? parsed : 0);
          }}
          onBlur={() => {
            if (inputValue.trim() === "") {
              onChange(0);
            }
          }}
        />
        {suffix ? <span className="text-xs text-white/50">{suffix}</span> : null}
      </div>
      {invalid ? (
        <span className="text-xs text-lupin-accent/90">Required for this step.</span>
      ) : null}
    </label>
  );
};

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.8)]">
    <h3 className="text-lg font-semibold text-white">{title}</h3>
    <div className="mt-5 grid gap-4 md:grid-cols-2">{children}</div>
  </section>
);

const SummaryStat = ({
  label,
  value,
  tone = "dark",
}: {
  label: string;
  value: string;
  tone?: "dark" | "light";
}) => (
  <div
    className={`rounded-2xl border p-4 ${
      tone === "light" ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"
    }`}
  >
    <p
      className={`text-xs uppercase tracking-[0.25em] ${
        tone === "light" ? "text-slate-500" : "text-white/40"
      }`}
    >
      {label}
    </p>
    <p className={`mt-2 text-2xl font-semibold ${tone === "light" ? "text-slate-900" : "text-white"}`}>
      {value}
    </p>
  </div>
);

export default function Wizard() {
  const [step, setStep] = useState(0);
  const [inputs, setInputs] = useState<DecisionInputs>(defaultInputs);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const storage = useMemo(() => new NoopStorage(), []);

  useEffect(() => {
    storage.load().then((data) => {
      if (!data) return;
      setInputs(data.inputs);
    });
  }, [storage]);

  useEffect(() => {
    const state: AppState = { inputs };
    storage.save(state);
  }, [inputs, storage]);

  const decision = useMemo(() => calculateDecision(inputs), [inputs]);

  const steps = ["Current", "Assumptions", "New", "Results"];
  const [showErrors, setShowErrors] = useState(false);

  const requiredMap = useMemo(() => {
    return [
      {
        currentValue: inputs.currentPropertyValue > 0,
        currentAcb: inputs.currentPropertyAcb > 0,
        clientAge: inputs.clientAge > 0,
      },
      {
        growthRate: inputs.currentGrowthRate > 0,
        taxRate: inputs.marginalTaxRate > 0,
      },
      {
        ltv: inputs.newLoanToValue >= 0,
      },
      {},
    ];
  }, [
    inputs.clientAge,
    inputs.currentGrowthRate,
    inputs.currentPropertyAcb,
    inputs.currentPropertyValue,
    inputs.marginalTaxRate,
    inputs.newLoanToValue,
  ]);

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

  const planningDelta =
    decision.newAtPlanning.strategyValue - decision.currentAtPlanning.strategyValue;

  const getSnapshotAtAge = (ageOffset: number) => {
    const age = Math.round(inputs.clientAge + ageOffset);
    const current = decision.currentSeries.find((item) => item.age === age);
    const next = decision.newSeries.find((item) => item.age === age);
    return { age, current, next };
  };

  const year1 = getSnapshotAtAge(1);
  const year10 = getSnapshotAtAge(10);
  const year20 = getSnapshotAtAge(20);

  return (
    <div className="flex flex-col gap-10">
      <div className="print-hide flex flex-col gap-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-white/50">Rental Sale Calculator</p>
            <h1 className="mt-3 text-4xl font-semibold text-white md:text-5xl">
              Should you sell your rental property?
            </h1>
            <p className="mt-4 max-w-2xl text-base text-white/70">
              Compare keeping your current rental versus selling and purchasing a new property. The
              decision is based on estate value at your planning age, with optional peak-delta
              analysis.
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
              <Section title="Current Property">
                <Field
                  label="Current property value"
                  value={inputs.currentPropertyValue}
                  onChange={(value) => setInputs({ ...inputs, currentPropertyValue: value })}
                  suffix="USD"
                  required
                  invalid={showErrors && !requiredMap[0].currentValue}
                />
                <Field
                  label="Adjusted cost base (ACB)"
                  value={inputs.currentPropertyAcb}
                  onChange={(value) => setInputs({ ...inputs, currentPropertyAcb: value })}
                  suffix="USD"
                  required
                  invalid={showErrors && !requiredMap[0].currentAcb}
                />
                <Field
                  label="Current mortgage balance"
                  value={inputs.currentMortgageBalance}
                  onChange={(value) => setInputs({ ...inputs, currentMortgageBalance: value })}
                  suffix="USD"
                />
                <Field
                  label="Current cap rate"
                  value={inputs.currentCapRate}
                  onChange={(value) => setInputs({ ...inputs, currentCapRate: value })}
                  suffix="%"
                  step={0.1}
                />
                <Field
                  label="Current growth rate"
                  value={inputs.currentGrowthRate}
                  onChange={(value) => setInputs({ ...inputs, currentGrowthRate: value })}
                  suffix="%"
                  step={0.1}
                  required
                  invalid={showErrors && !requiredMap[1].growthRate}
                />
                <Field
                  label="Client age"
                  value={inputs.clientAge}
                  onChange={(value) => setInputs({ ...inputs, clientAge: value })}
                  suffix="years"
                  step={1}
                  required
                  invalid={showErrors && !requiredMap[0].clientAge}
                />
              </Section>
            </div>
          )}

        {step === 1 && (
          <div className="flex flex-col gap-6">
            <Section title="Market & Tax Assumptions">
              <Field
                label="Marginal tax rate"
                value={inputs.marginalTaxRate}
                onChange={(value) => setInputs({ ...inputs, marginalTaxRate: value })}
                suffix="%"
                step={0.1}
                required
                invalid={showErrors && !requiredMap[1].taxRate}
              />
              <Field
                label="Capital gains inclusion rate"
                value={inputs.capitalGainsInclusionRate}
                onChange={(value) =>
                  setInputs({ ...inputs, capitalGainsInclusionRate: value })
                }
                suffix="%"
                step={0.1}
              />
              <Field
                label="Realtor fees"
                value={inputs.realtorFeesPercent}
                onChange={(value) => setInputs({ ...inputs, realtorFeesPercent: value })}
                suffix="%"
                step={0.1}
              />
              <Field
                label="Property transfer tax"
                value={inputs.propertyTransferTaxPercent}
                onChange={(value) =>
                  setInputs({ ...inputs, propertyTransferTaxPercent: value })
                }
                suffix="%"
                step={0.1}
              />
              <Field
                label="Investment account ROI"
                value={inputs.investmentAccountRoi}
                onChange={(value) => setInputs({ ...inputs, investmentAccountRoi: value })}
                suffix="%"
                step={0.1}
              />
              <Field
                label="Loan rate"
                value={inputs.loanRate}
                onChange={(value) => setInputs({ ...inputs, loanRate: value })}
                suffix="%"
                step={0.01}
              />
              <Field
                label="Loan amortization"
                value={inputs.loanAmortizationYears}
                onChange={(value) => setInputs({ ...inputs, loanAmortizationYears: value })}
                suffix="years"
                step={1}
              />
              <Field
                label="Planning age"
                value={inputs.planningAge}
                onChange={(value) => setInputs({ ...inputs, planningAge: value })}
                suffix="years"
                step={1}
              />
              <Field
                label="Decision margin"
                value={inputs.decisionMarginPercent}
                onChange={(value) => setInputs({ ...inputs, decisionMarginPercent: value })}
                suffix="%"
                step={0.1}
                hint="Default 2%"
              />
            </Section>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-6">
            <Section title="New Property Strategy">
              <Field
                label="Target cap rate"
                value={inputs.newCapRate}
                onChange={(value) => setInputs({ ...inputs, newCapRate: value })}
                suffix="%"
                step={0.1}
              />
              <Field
                label="Target growth rate"
                value={inputs.newGrowthRate}
                onChange={(value) => setInputs({ ...inputs, newGrowthRate: value })}
                suffix="%"
                step={0.1}
              />
              <Field
                label="Loan-to-value (LTV)"
                value={inputs.newLoanToValue}
                onChange={(value) => setInputs({ ...inputs, newLoanToValue: value })}
                suffix="%"
                step={0.1}
              />
            </Section>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-6">
            <div
              className={`rounded-3xl border p-6 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.8)] ${
                decision.decision === "YES"
                  ? "border-emerald-400/30 bg-emerald-500/10"
                  : "border-rose-400/30 bg-rose-500/10"
              }`}
            >
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Decision</p>
              <h2 className="mt-2 text-3xl font-semibold text-white">
                {decision.decision === "YES" ? "YES — Sell" : "NO — Keep"}
              </h2>
              <p className="mt-2 text-sm text-white/70">{decision.decisionReason}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-white/60">
                <span>Planning age: {decision.planningAge}</span>
                <span>Margin: {percent.format(decision.marginPercent / 100)}</span>
                {decision.breakEvenAge ? <span>Break-even: age {decision.breakEvenAge}</span> : null}
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-black transition hover:scale-[1.02]"
                  onClick={() => window.print()}
                >
                  Download report (PDF)
                </button>
              </div>
            </div>

            <Section title="Planning Age Snapshot">
              <SummaryStat
                label="Current strategy value"
                value={currency.format(decision.currentAtPlanning.strategyValue)}
              />
              <SummaryStat
                label="New strategy value"
                value={currency.format(decision.newAtPlanning.strategyValue)}
              />
              <SummaryStat label="Delta" value={currency.format(planningDelta)} />
              <SummaryStat
                label="After-tax cash flow"
                value={currency.format(decision.newAtPlanning.cashFlow)}
              />
            </Section>

            <ComparisonChart data={decision.series} />

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">After-tax cash flow check-in</h3>
                  <p className="mt-1 text-xs text-white/50">
                    Yearly cash flow snapshots at ages {year1.age}, {year10.age}, {year20.age}.
                  </p>
                </div>
                <button
                  className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                    showAdvanced
                      ? "border-white/60 text-white"
                      : "border-white/20 text-white/70"
                  }`}
                  onClick={() => setShowAdvanced((value) => !value)}
                >
                  Advanced
                </button>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {[year1, year10, year20].map((snapshot) => (
                  <div key={snapshot.age} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/40">Age {snapshot.age}</p>
                    <p className="mt-3 text-sm text-white/70">
                      Current: {snapshot.current ? currency.format(snapshot.current.cashFlow) : "—"}
                    </p>
                    <p className="text-sm text-white/70">
                      New: {snapshot.next ? currency.format(snapshot.next.cashFlow) : "—"}
                    </p>
                  </div>
                ))}
              </div>

              {showAdvanced ? (
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <SummaryStat
                    label="Peak delta"
                    value={currency.format(decision.peakDeltaValue)}
                  />
                  <SummaryStat
                    label="Peak delta age"
                    value={decision.peakDeltaAge ? String(decision.peakDeltaAge) : "—"}
                  />
                </div>
              ) : null}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
              <p className="text-white font-semibold">Decision logic</p>
              <p className="mt-2">
                The recommendation compares net strategy values at the planning age. If the new
                strategy is at least {inputs.decisionMarginPercent}% higher, the decision turns to
                sell. Toggle Advanced to see the peak delta within the timeline.
              </p>
              <p className="mt-3 text-xs text-white/50">
                These estimates are for illustration only and ignore depreciation, tax law
                exceptions, or property-specific costs.
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
            Note: Capital gains taxes are modeled on the current property only, and sale proceeds are
            reduced by realtor fees and transfer tax before purchasing the new property.
          </p>
          <p className="mt-2">
            Investment account growth assumes after-tax ROI on the prior balance plus current year
            cash flow.
          </p>
        </div>

        <div className="flex items-center justify-between text-xs text-white/50">
          <div className="flex items-center gap-2">
            <Image src="/assets/lupin-logo.png" alt="Lupin logo" width={28} height={28} />
            <span>Rental Sale Calculator</span>
          </div>
          <span>© Lupin</span>
        </div>
      </div>

      <div className="print-only">
        <div className="mx-auto max-w-4xl p-8">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Report</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">
                Sell vs Keep Recommendation
              </h1>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p>Planning age: {decision.planningAge}</p>
              <p>Margin: {percent.format(decision.marginPercent / 100)}</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Decision</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              {decision.decision === "YES" ? "YES — Sell" : "NO — Keep"}
            </h2>
            <p className="mt-2 text-sm text-slate-600">{decision.decisionReason}</p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <SummaryStat
              label="Current strategy value"
              value={currency.format(decision.currentAtPlanning.strategyValue)}
              tone="light"
            />
            <SummaryStat
              label="New strategy value"
              value={currency.format(decision.newAtPlanning.strategyValue)}
              tone="light"
            />
            <SummaryStat label="Delta" value={currency.format(planningDelta)} tone="light" />
          </div>

          <div className="mt-6">
            <ComparisonChart data={decision.series} tone="light" />
          </div>
        </div>
      </div>
    </div>
  );
}
