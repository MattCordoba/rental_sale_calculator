"use client";

import { useMemo, useState, useEffect } from "react";
import {
  calculateInvestment,
  calculateMortgage,
  type ExpenseInputs,
  type MortgageInputs,
  type PaymentFrequency,
  type RentRange,
} from "@/lib/rentalVerdict";
import type { ConfidenceLevel, ListingExtract } from "@/lib/listingExtract";

const currency = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

const currencyFine = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 2,
});

const percent = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 2,
});

const cities = [
  { label: "Vancouver", taxRatePercent: 0.311827 },
  { label: "Coquitlam", taxRatePercent: 0.319627 },
  { label: "Port Moody", taxRatePercent: 0.2566 },
  { label: "Port Coquitlam", taxRatePercent: 0.35148 },
];

const estimateRentRange = (price: number): RentRange => {
  const base = price > 0 ? price * 0.003 : 0;
  return {
    low: base * 0.88,
    median: base,
    high: base * 1.12,
    source: "web-estimate",
  };
};

const formatSourceBadge = (source: RentRange["source"]) => {
  switch (source) {
    case "provider-estimate":
      return "Provider estimate";
    case "web-estimate":
      return "Web estimate";
    default:
      return undefined;
  }
};

const confidenceBadge = (level?: ConfidenceLevel) => {
  if (!level) return undefined;
  if (level === "high") return "High confidence";
  if (level === "medium") return "Medium confidence";
  return "Low confidence";
};

const Field = ({
  label,
  value,
  suffix,
  onChange,
  step = 1,
  hint,
  badge,
}: {
  label: string;
  value: number;
  suffix?: string;
  step?: number;
  hint?: string;
  badge?: string;
  onChange: (value: number) => void;
}) => {
  const safeValue = Number.isFinite(value) ? value : 0;
  return (
    <label className="flex flex-col gap-2 text-sm text-white/80">
      <span className="flex items-center justify-between">
        <span className="font-medium text-white">{label}</span>
        {badge ? (
          <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/60">
            {badge}
          </span>
        ) : hint ? (
          <span className="text-xs text-white/50">{hint}</span>
        ) : null}
      </span>
      <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 shadow-inner">
        <input
          className="w-full bg-transparent text-lg text-white placeholder-white/40 outline-none"
          type="number"
          step={step}
          value={safeValue === 0 ? "" : safeValue}
          onChange={(event) => {
            const parsed = parseFloat(event.target.value);
            onChange(Number.isFinite(parsed) ? parsed : 0);
          }}
        />
        {suffix ? <span className="text-xs text-white/50">{suffix}</span> : null}
      </div>
    </label>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
    <h3 className="text-lg font-semibold text-white">{title}</h3>
    <div className="mt-5 grid gap-4 md:grid-cols-2">{children}</div>
  </section>
);

export default function RentalPurchaseVerdict() {
  const [step, setStep] = useState(0);
  const [city, setCity] = useState(cities[0]);
  const [price, setPrice] = useState(1_100_000);
  const [address, setAddress] = useState("");
  const [bedrooms, setBedrooms] = useState(2);
  const [bathrooms, setBathrooms] = useState(2);
  const [sqft, setSqft] = useState(950);
  const [hoa, setHoa] = useState(350);
  const [listingUrl, setListingUrl] = useState("");
  const [listingHtml, setListingHtml] = useState("");
  const [autoSyncMortgage, setAutoSyncMortgage] = useState(true);
  const [autoFillState, setAutoFillState] = useState<"idle" | "loading">("idle");
  const [autoFillError, setAutoFillError] = useState<string | null>(null);
  const [autoFillConfidence, setAutoFillConfidence] = useState<Partial<ListingExtract["confidence"]>>({});

  const [rentRange, setRentRange] = useState<RentRange>(() => estimateRentRange(1_100_000));
  const [useTaxOverride, setUseTaxOverride] = useState(false);
  const [taxOverride, setTaxOverride] = useState(0);

  const [mortgage, setMortgage] = useState<MortgageInputs>({
    mortgageAmount: 800_000,
    interestRate: 5.2,
    amortizationYears: 25,
    paymentFrequency: "bi-weekly",
    termYears: 5,
  });

  const [expenses, setExpenses] = useState<ExpenseInputs>({
    vacancyPercent: 4,
    maintenancePercent: 5,
    managementPercent: 8,
    reservesPercent: 3,
    insuranceAnnual: 1200,
    utilitiesAnnual: 1200,
    hoaMonthly: 350,
    propertyTaxAnnual: 0,
  });

  const mortgageResult = useMemo(() => calculateMortgage(mortgage), [mortgage]);

  useEffect(() => {
    if (!autoSyncMortgage) return;
    setMortgage((prev) =>
      prev.mortgageAmount === price ? prev : { ...prev, mortgageAmount: price }
    );
  }, [autoSyncMortgage, price]);

  const estimatedTax = useMemo(() => {
    if (price <= 0) return 0;
    return (city.taxRatePercent / 100) * price;
  }, [city.taxRatePercent, price]);

  const effectiveTax = useTaxOverride ? taxOverride : estimatedTax;

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

  const investment = useMemo(() => {
    const annualDebtService = mortgageResult.payment * paymentsPerYear(mortgage.paymentFrequency);
    return calculateInvestment(
      price,
      rentRange,
      {
        ...expenses,
        propertyTaxAnnual: effectiveTax,
        hoaMonthly: hoa,
      },
      annualDebtService
    );
  }, [price, rentRange, expenses, effectiveTax, hoa, mortgage.paymentFrequency, mortgageResult.payment]);

  const frequencyLabel = (frequency: PaymentFrequency) => {
    switch (frequency) {
      case "semi-monthly":
        return "Semi-monthly";
      case "bi-weekly":
        return "Bi-weekly";
      case "weekly":
        return "Weekly";
      case "accelerated-bi-weekly":
        return "Accelerated bi-weekly";
      case "accelerated-weekly":
        return "Accelerated weekly";
      case "monthly":
      default:
        return "Monthly";
    }
  };

  const handlePriceChange = (value: number) => {
    setPrice(value);
    setRentRange(estimateRentRange(value));
    if (autoSyncMortgage) {
      setMortgage((prev) => ({ ...prev, mortgageAmount: value }));
    }
  };

  const applyExtract = (extract: ListingExtract) => {
    setAddress(extract.address);
    setBedrooms(extract.bedrooms);
    setBathrooms(extract.bathrooms);
    setSqft(extract.sqft);
    const selected = cities.find((item) => item.label === extract.city);
    if (selected) setCity(selected);
    handlePriceChange(extract.price);
    setHoa(extract.hoa);
    if (extract.rentRange.median > 0) {
      setRentRange(extract.rentRange);
    }
    setAutoFillConfidence(extract.confidence);
  };

  const handleAutoFill = async () => {
    if (!listingUrl.trim() && !listingHtml.trim()) return;
    setAutoFillState("loading");
    setAutoFillError(null);
    try {
      const response = await fetch("/api/listing-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: listingUrl, html: listingHtml }),
      });
      const payload = (await response.json()) as { data?: ListingExtract; error?: string };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error || "Unable to fetch listing data.");
      }
      applyExtract(payload.data);
      if (payload.data.propertyTaxAnnual) {
        setUseTaxOverride(true);
        setTaxOverride(payload.data.propertyTaxAnnual);
      }
      setStep((value) => Math.min(value + 1, steps.length - 1));
    } catch (error) {
      setAutoFillError(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setAutoFillState("idle");
    }
  };

  const steps = ["URL", "Listing", "Rent", "Mortgage", "Assumptions", "Verdict"];
  const isUrlValid = listingUrl.trim().length > 0 || listingHtml.trim().length > 0;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm uppercase tracking-[0.4em] text-white/50">New Tool</p>
        <h1 className="mt-3 text-4xl font-semibold text-white md:text-5xl">
          Rental Purchase Verdict
        </h1>
        <p className="mt-4 max-w-2xl text-base text-white/70">
          Paste a listing URL, review the rent range estimate, and see whether the cap rate supports
          a strong rental investment.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {steps.map((label, index) => (
            <span
              key={label}
              className={`rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.25em] ${
                index === step
                  ? "border-white/50 bg-white/10 text-white"
                  : "border-white/15 text-white/50"
              }`}
            >
              {label}
            </span>
          ))}
        </div>
        <div className="text-xs text-white/50">
          Step {step + 1} of {steps.length}
        </div>
      </div>

      {step === 0 && (
        <Section title="Listing URL">
          <label className="col-span-full flex flex-col gap-2 text-sm text-white/80">
            <span className="font-medium text-white">Listing URL</span>
            <input
              className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/80 outline-none"
              value={listingUrl}
              onChange={(event) => setListingUrl(event.target.value)}
              placeholder="https://www.remax.ca/listings/..."
            />
          </label>
          <label className="col-span-full flex flex-col gap-2 text-sm text-white/80">
            <span className="font-medium text-white">Listing HTML (optional)</span>
            <textarea
              className="min-h-[140px] rounded-2xl border border-white/15 bg-white/5 p-4 text-sm text-white/80 outline-none"
              value={listingHtml}
              onChange={(event) => setListingHtml(event.target.value)}
              placeholder="Paste the page HTML here to enable parsing without a provider connection."
            />
          </label>
          <div className="col-span-full flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-white/60">
            <span>
              Auto-fill uses provider data when available. If a provider connection is not
              configured yet, you can still complete the fields manually in the next step. For now,
              you can paste page HTML to extract key fields locally.
            </span>
            <button
              className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-black transition hover:scale-[1.02] disabled:opacity-60"
              onClick={handleAutoFill}
              disabled={!isUrlValid || autoFillState === "loading"}
            >
              {autoFillState === "loading" ? "Parsing..." : "Parse listing data"}
            </button>
          </div>
          {autoFillError ? (
            <p className="col-span-full text-xs text-lupin-accent">{autoFillError}</p>
          ) : null}
          <div className="col-span-full flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/60">
            <span>Prefer to enter data manually?</span>
            <button
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white/80 transition hover:border-white/50"
              onClick={() => setStep(1)}
            >
              Skip to manual entry
            </button>
          </div>
        </Section>
      )}

      {step === 1 && (
        <Section title="Listing Snapshot">
          <label className="col-span-full flex flex-col gap-2 text-sm text-white/80">
            <span className="font-medium text-white">Address (optional)</span>
            <input
              className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/80 outline-none"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="1234 Example St"
            />
          </label>
          {autoFillConfidence.address ? (
            <p className="col-span-full text-xs text-white/50">
              Address confidence: {confidenceBadge(autoFillConfidence.address)}
            </p>
          ) : null}
          <div className="col-span-full grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-white/80">
              <span className="font-medium text-white">City</span>
              <select
                className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/80 outline-none"
                value={city.label}
                onChange={(event) => {
                  const selected = cities.find((item) => item.label === event.target.value);
                  if (selected) setCity(selected);
                }}
              >
                {cities.map((item) => (
                  <option key={item.label} value={item.label} className="text-black">
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Listing price"
              value={price}
              onChange={handlePriceChange}
              suffix="CAD"
              badge={confidenceBadge(autoFillConfidence.price)}
            />
            <Field
              label="Bedrooms"
              value={bedrooms}
              onChange={setBedrooms}
              step={1}
              badge={confidenceBadge(autoFillConfidence.bedrooms)}
            />
            <Field
              label="Bathrooms"
              value={bathrooms}
              onChange={setBathrooms}
              step={0.5}
              badge={confidenceBadge(autoFillConfidence.bathrooms)}
            />
            <Field
              label="Square footage"
              value={sqft}
              onChange={setSqft}
              step={1}
              suffix="sqft"
              badge={confidenceBadge(autoFillConfidence.sqft)}
            />
            <Field
              label="HOA / Strata"
              value={hoa}
              onChange={setHoa}
              suffix="CAD / mo"
              badge={confidenceBadge(autoFillConfidence.hoa)}
            />
          </div>
        </Section>
      )}

      {step === 2 && (
        <Section title="Rent Range (Web Estimate)">
          <Field
            label="Low"
            value={rentRange.low}
            onChange={(value) => setRentRange({ ...rentRange, low: value, source: "manual" })}
            suffix="CAD / mo"
            badge={formatSourceBadge(rentRange.source)}
          />
          <Field
            label="Median"
            value={rentRange.median}
            onChange={(value) => setRentRange({ ...rentRange, median: value, source: "manual" })}
            suffix="CAD / mo"
            badge={formatSourceBadge(rentRange.source)}
          />
          <Field
            label="High"
            value={rentRange.high}
            onChange={(value) => setRentRange({ ...rentRange, high: value, source: "manual" })}
            suffix="CAD / mo"
            badge={formatSourceBadge(rentRange.source)}
          />
          <div className="col-span-full text-xs text-white/50">
            {rentRange.source === "provider-estimate"
              ? "Provider rent estimate loaded from the listing source."
              : "Edit any values to override the estimate."}
          </div>
        </Section>
      )}

      {step === 3 && (
        <Section title="Mortgage Calculator">
          <div className="col-span-full flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-white/60">
            <span>Use listing price for mortgage amount</span>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoSyncMortgage}
                onChange={(event) => setAutoSyncMortgage(event.target.checked)}
              />
              Auto sync
            </label>
          </div>
          <Field
            label="Mortgage amount"
            value={mortgage.mortgageAmount}
            onChange={(value) => setMortgage({ ...mortgage, mortgageAmount: value })}
            suffix="CAD"
          />
          <Field
            label="Interest rate"
            value={mortgage.interestRate}
            onChange={(value) => setMortgage({ ...mortgage, interestRate: value })}
            suffix="%"
            step={0.01}
          />
          <Field
            label="Amortization period"
            value={mortgage.amortizationYears}
            onChange={(value) => setMortgage({ ...mortgage, amortizationYears: value })}
            suffix="years"
            step={1}
          />
          <label className="flex flex-col gap-2 text-sm text-white/80">
            <span className="font-medium text-white">Payment frequency</span>
            <select
              className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/80 outline-none"
              value={mortgage.paymentFrequency}
              onChange={(event) =>
                setMortgage({
                  ...mortgage,
                  paymentFrequency: event.target.value as PaymentFrequency,
                })
              }
            >
              <option value="monthly" className="text-black">Monthly</option>
              <option value="semi-monthly" className="text-black">Semi-monthly</option>
              <option value="bi-weekly" className="text-black">Bi-weekly</option>
              <option value="weekly" className="text-black">Weekly</option>
              <option value="accelerated-bi-weekly" className="text-black">Accelerated bi-weekly</option>
              <option value="accelerated-weekly" className="text-black">Accelerated weekly</option>
            </select>
          </label>
          <Field
            label="Term"
            value={mortgage.termYears}
            onChange={(value) => setMortgage({ ...mortgage, termYears: value })}
            suffix="years"
            step={1}
          />
        </Section>
      )}

      {step === 4 && (
        <Section title="Operating Assumptions">
        <Field
          label="Vacancy rate"
          value={expenses.vacancyPercent}
          onChange={(value) => setExpenses({ ...expenses, vacancyPercent: value })}
          suffix="%"
          step={0.1}
        />
        <Field
          label="Maintenance"
          value={expenses.maintenancePercent}
          onChange={(value) => setExpenses({ ...expenses, maintenancePercent: value })}
          suffix="%"
          step={0.1}
        />
        <Field
          label="Management"
          value={expenses.managementPercent}
          onChange={(value) => setExpenses({ ...expenses, managementPercent: value })}
          suffix="%"
          step={0.1}
        />
        <Field
          label="Reserves"
          value={expenses.reservesPercent}
          onChange={(value) => setExpenses({ ...expenses, reservesPercent: value })}
          suffix="%"
          step={0.1}
        />
        <Field
          label="Insurance"
          value={expenses.insuranceAnnual}
          onChange={(value) => setExpenses({ ...expenses, insuranceAnnual: value })}
          suffix="CAD / yr"
        />
        <Field
          label="Utilities"
          value={expenses.utilitiesAnnual}
          onChange={(value) => setExpenses({ ...expenses, utilitiesAnnual: value })}
          suffix="CAD / yr"
        />
        <div className="col-span-full rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
          <div className="flex items-center justify-between">
            <span>Estimated property taxes</span>
            <label className="flex items-center gap-2 text-xs text-white/60">
              <input
                type="checkbox"
                checked={useTaxOverride}
                onChange={(event) => setUseTaxOverride(event.target.checked)}
              />
              Override
            </label>
          </div>
          {useTaxOverride ? (
            <div className="mt-3">
              <Field
                label="Property taxes"
                value={taxOverride}
                onChange={setTaxOverride}
                suffix="CAD / yr"
              />
            </div>
          ) : (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-white">{currency.format(estimatedTax)}</p>
              <p className="text-xs text-white/50">
                {city.taxRatePercent.toFixed(6)}% of price
              </p>
            </div>
          )}
        </div>
        </Section>
      )}

      {step === 5 && (
        <Section title="Verdict">
        <div className="col-span-full grid gap-4 md:grid-cols-2">
          <div
            className={`rounded-3xl border p-6 ${
              investment.verdict === "Excellent"
                ? "border-emerald-400/30 bg-emerald-500/10"
                : investment.verdict === "Good"
                  ? "border-sky-400/30 bg-sky-500/10"
                  : "border-rose-400/30 bg-rose-500/10"
            }`}
          >
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Cap Rate Verdict</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">{investment.verdict}</h2>
            <p className="mt-2 text-sm text-white/70">
              Based on a cap rate of {percent.format(investment.capRate)}
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">Mortgage Summary</p>
            <p className="mt-3 text-white">
              {frequencyLabel(mortgage.paymentFrequency)} payment: {currencyFine.format(mortgageResult.payment)}
            </p>
            <p className="mt-2">
              Term interest: {currency.format(mortgageResult.totalInterestTerm)}
            </p>
            <p className="mt-2">
              Balance after term: {currency.format(mortgageResult.balanceAfterTerm)}
            </p>
          </div>
        </div>
        <div className="col-span-full grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-white/40">NOI</p>
            <p className="mt-2 text-xl font-semibold text-white">{currency.format(investment.noiAnnual)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-white/40">Cap Rate</p>
            <p className="mt-2 text-xl font-semibold text-white">{percent.format(investment.capRate)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-white/40">Cash Flow</p>
            <p className="mt-2 text-xl font-semibold text-white">{currency.format(investment.cashFlowAnnual)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-white/40">DSCR</p>
            <p className="mt-2 text-xl font-semibold text-white">{investment.dscr.toFixed(2)}</p>
          </div>
        </div>
        </Section>
      )}

      <div className="flex items-center justify-between">
        <button
          className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white/80 transition hover:border-white/50 hover:text-white disabled:opacity-40"
          onClick={() => setStep((value) => Math.max(0, value - 1))}
          disabled={step === 0}
        >
          Back
        </button>
        <button
          className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]"
          onClick={() => setStep((value) => Math.min(steps.length - 1, value + 1))}
          disabled={step === steps.length - 1 || (step === 0 && !isUrlValid)}
        >
          {step === steps.length - 1 ? "Done" : "Continue"}
        </button>
      </div>
    </div>
  );
}
