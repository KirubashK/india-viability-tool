"use client";

import React, { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useProductStore } from "@/store/productStore";
import { ValueChainInputs, FreightMode, Currency } from "@/types/product";
import { getDutyRates } from "@/lib/dutyEngine";
import { COUNTRIES, HS_CODES } from "@/data/hsCodes";
import { EXCHANGE_RATES } from "@/data/benchmarks";
import { Info, RotateCcw, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const CURRENCIES: Currency[] = ["USD", "EUR", "GBP", "AUD", "JPY", "CNY"];
const FREIGHT_MODES: { value: FreightMode; label: string }[] = [
  { value: "AIR", label: "✈️ Air Freight (3-7 days)" },
  { value: "SEA", label: "🚢 Sea Freight (20-40 days)" },
];

interface FormRow {
  label: string;
  children: React.ReactNode;
  tooltip?: string;
}

function FormRow({ label, children, tooltip }: FormRow) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
        {tooltip && (
          <span title={tooltip}>
            <Info className="h-3 w-3 text-slate-400" />
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all";
const selectCls = cn(inputCls, "appearance-none cursor-pointer");

export function ValueChainForm() {
  const { valueChain, setValueChain, setProduct, product, resetOverrides } = useProductStore();
  const { register, control, watch, setValue, reset } = useForm<ValueChainInputs>({
    defaultValues: valueChain,
  });

  const watchedHs = watch("hsCode");
  const watchedCountry = watch("countryOfOrigin");
  const watchedCurrency = watch("currency");
  const autoRates = getDutyRates(watchedHs ?? "3304", watchedCountry ?? "USA");

  // Sync form → store on every change
  const formValues = watch();
  useEffect(() => {
    const sub = setTimeout(() => setValueChain(formValues), 100);
    return () => clearTimeout(sub);
  }, [JSON.stringify(formValues)]);

  // Update exchange rate when currency changes
  useEffect(() => {
    if (watchedCurrency) {
      setValue("exchangeRate", EXCHANGE_RATES[watchedCurrency] ?? 83.5);
    }
  }, [watchedCurrency]);

  const fobInr = (watch("fobPrice") ?? 0) * (watch("exchangeRate") ?? 83.5);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
          Value Chain / Landed Cost
        </h3>
        <button
          onClick={() => resetOverrides()}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
        >
          <RotateCcw className="h-3 w-3" />
          Reset Overrides
        </button>
      </div>

      {/* FOB Price + Currency */}
      <div className="grid grid-cols-2 gap-4">
        <FormRow label="FOB Price" tooltip="Ex-works or FOB price per unit">
          <div className="flex gap-2">
            <div className="relative w-28 shrink-0">
              <select
                {...register("currency")}
                className={cn(selectCls, "pr-6")}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>
            <input
              type="number"
              step="0.01"
              {...register("fobPrice", { valueAsNumber: true, min: 0 })}
              className={inputCls}
              placeholder="0.00"
            />
          </div>
          <p className="text-xs text-slate-400">
            ≈ ₹{fobInr.toLocaleString("en-IN", { maximumFractionDigits: 0 })} @ ₹
            {watch("exchangeRate")?.toFixed(1)}/{watch("currency")}
          </p>
        </FormRow>

        <FormRow label="Exchange Rate" tooltip="₹ per 1 unit of foreign currency">
          <input
            type="number"
            step="0.01"
            {...register("exchangeRate", { valueAsNumber: true })}
            className={inputCls}
          />
        </FormRow>
      </div>

      {/* Freight */}
      <div className="grid grid-cols-2 gap-4">
        <FormRow label="Freight Mode">
          <div className="relative">
            <select {...register("freightMode")} className={cn(selectCls, "pr-6")}>
              {FREIGHT_MODES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-3.5 w-3.5 text-slate-400" />
          </div>
        </FormRow>

        <FormRow label="Freight Cost (₹)" tooltip="Total freight cost for this shipment in INR">
          <input
            type="number"
            {...register("freightCost", { valueAsNumber: true })}
            className={inputCls}
          />
        </FormRow>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormRow label="Insurance (%)" tooltip="Insurance as % of FOB value">
          <input
            type="number"
            step="0.1"
            {...register("insurancePercent", { valueAsNumber: true })}
            className={inputCls}
          />
        </FormRow>

        <FormRow label="Country of Origin">
          <div className="relative">
            <select {...register("countryOfOrigin")} className={cn(selectCls, "pr-6")}>
              {Object.entries(COUNTRIES).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-3.5 w-3.5 text-slate-400" />
          </div>
          {autoRates.isPreferential && (
            <p className="text-xs text-emerald-600 font-medium">
              ✓ FTA available — preferential duty may apply
            </p>
          )}
        </FormRow>
      </div>

      {/* HS Code */}
      <FormRow label="HS Code (4-digit)">
        <div className="relative">
          <select {...register("hsCode")} className={cn(selectCls, "pr-6")}>
            {HS_CODES.map((h) => (
              <option key={h.code} value={h.code}>
                {h.code} — {h.description}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-3.5 w-3.5 text-slate-400" />
        </div>
      </FormRow>

      {/* Auto-fetched duty rates + overrides */}
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Duty Rates — Auto-detected (override if needed)
        </p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "BCD (%)", field: "bcdOverride" as const, auto: autoRates.bcd },
            { label: "SWS (% of BCD)", field: "swsOverride" as const, auto: autoRates.sws },
            { label: "IGST (%)", field: "igstOverride" as const, auto: autoRates.igst },
          ].map(({ label, field, auto }) => (
            <FormRow key={field} label={label}>
              <input
                type="number"
                step="0.5"
                placeholder={String(auto)}
                {...register(field, { valueAsNumber: true })}
                className={cn(inputCls, "placeholder:text-slate-400")}
              />
              <p className="text-xs text-slate-400">Auto: {auto}%</p>
            </FormRow>
          ))}
        </div>
      </div>
    </div>
  );
}
