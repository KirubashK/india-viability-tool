"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useProductStore } from "@/store/productStore";
import { UnitEconomicsInputs, Marketplace, SellingPriceMode } from "@/types/product";
import { MARKETPLACE_LABELS, MARKETPLACES } from "@/data/marketplaces";
import { getMarketplaceFees } from "@/lib/commissionEngine";
import { ChevronDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all";
const selectCls = cn(inputCls, "appearance-none cursor-pointer pr-6");

interface FormFieldProps {
  label: string;
  tooltip?: string;
  children: React.ReactNode;
  hint?: string;
}

function FormField({ label, tooltip, children, hint }: FormFieldProps) {
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
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function UnitEconomicsForm() {
  const { unitEconomics, setUnitEconomics, setMarketplace, product } = useProductStore();
  const { register, watch, setValue } = useForm<UnitEconomicsInputs>({
    defaultValues: unitEconomics,
  });

  const watchedMarketplace = watch("marketplace");
  const watchedCategory = watch("category");
  const autoFees = watchedMarketplace && watchedCategory
    ? getMarketplaceFees(watchedMarketplace, watchedCategory)
    : null;

  const allValues = watch();
  useEffect(() => {
    const t = setTimeout(() => {
      setUnitEconomics(allValues);
      if (allValues.marketplace) setMarketplace(allValues.marketplace);
    }, 100);
    return () => clearTimeout(t);
  }, [JSON.stringify(allValues)]);

  const watchedMode = watch("sellingPriceMode") as SellingPriceMode;

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
        Unit Economics
      </h3>

      {/* Selling price mode toggle */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Selling Price</p>
        <div className="flex gap-2">
          {([
            { value: "KNOWN" as SellingPriceMode, label: "I know my price" },
            { value: "RECOMMEND" as SellingPriceMode, label: "Recommend price" },
          ]).map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setValue("sellingPriceMode", value)}
              className={cn(
                "flex-1 rounded-lg border py-2 text-xs font-semibold transition-all",
                watchedMode === value
                  ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {watchedMode === "KNOWN" || !watchedMode ? (
          <FormField label="Selling Price (MRP ₹)" tooltip="Inclusive of GST">
            <input
              type="number"
              {...register("sellingPrice", { valueAsNumber: true })}
              className={inputCls}
            />
          </FormField>
        ) : (
          <FormField
            label="Target Margin %"
            tooltip="Net margin as % of ex-GST revenue. We will calculate the minimum MRP needed."
            hint="The recommended MRP will appear in results after running the analysis."
          >
            <input
              type="number"
              step="1"
              min="1"
              max="80"
              {...register("targetMarginPercent", { valueAsNumber: true })}
              className={inputCls}
              placeholder="e.g. 30"
            />
          </FormField>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Marketplace">
          <div className="relative">
            <select {...register("marketplace")} className={selectCls}>
              {MARKETPLACES.map((m) => (
                <option key={m} value={m}>{MARKETPLACE_LABELS[m]}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-3.5 w-3.5 text-slate-400" />
          </div>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Marketing %"
          tooltip="As % of MRP"
          hint={`Category default: ${unitEconomics.marketingPercent}%`}
        >
          <input
            type="number"
            step="0.5"
            {...register("marketingPercent", { valueAsNumber: true })}
            className={inputCls}
          />
        </FormField>

        <FormField
          label="Return Rate %"
          tooltip="Expected % of orders returned"
          hint="Impacts reverse logistics cost"
        >
          <input
            type="number"
            step="0.5"
            {...register("returnRate", { valueAsNumber: true })}
            className={inputCls}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Weight (kg)">
          <input
            type="number"
            step="0.05"
            {...register("weight", { valueAsNumber: true })}
            className={inputCls}
          />
        </FormField>

        <FormField label="Landed Cost (₹)" tooltip="Auto-filled from Value Chain calculation">
          <input
            type="number"
            {...register("landedCost", { valueAsNumber: true })}
            className={cn(inputCls, "bg-slate-50 text-slate-500")}
          />
        </FormField>
      </div>

      {/* Marketplace fees display */}
      {autoFees && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {MARKETPLACE_LABELS[watchedMarketplace]} Fees — Auto-detected (override if needed)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Commission %"
              hint={`Auto: ${autoFees.commissionPercent}%`}
            >
              <input
                type="number"
                step="0.5"
                placeholder={String(autoFees.commissionPercent)}
                {...register("commissionOverride", { valueAsNumber: true })}
                className={cn(inputCls, "placeholder:text-slate-400")}
              />
            </FormField>

            <FormField
              label="Last-Mile Override (₹)"
              hint="Leave blank to use auto-calculated"
            >
              <input
                type="number"
                placeholder="Auto"
                {...register("logisticsOverride", { valueAsNumber: true })}
                className={cn(inputCls, "placeholder:text-slate-400")}
              />
            </FormField>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Payment Fee", value: `${autoFees.paymentFeePercent}%` },
              { label: "Closing Fee", value: `₹${autoFees.closingFee}` },
              { label: "Total Fees", value: `${autoFees.totalFeePercent.toFixed(1)}%` },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg bg-white p-2 text-xs">
                <p className="text-slate-400">{label}</p>
                <p className="font-bold text-slate-700">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Competitor prices */}
      <CompetitorPriceInput />
    </div>
  );
}

function CompetitorPriceInput() {
  const { competitorPrices, setCompetitorPrices } = useProductStore();
  const [input, setInput] = React.useState("");

  const addPrice = () => {
    const val = parseFloat(input.trim());
    if (!isNaN(val) && val > 0) {
      setCompetitorPrices([...competitorPrices, val]);
      setInput("");
    }
  };

  const removePrice = (i: number) => {
    setCompetitorPrices(competitorPrices.filter((_, idx) => idx !== i));
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        Competitor MRPs (₹) — for market positioning
      </label>
      <div className="flex gap-2">
        <input
          type="number"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addPrice()}
          placeholder="e.g. 1299"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
        />
        <button
          onClick={addPrice}
          className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
        >
          Add
        </button>
      </div>
      {competitorPrices.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {competitorPrices.map((p, i) => (
            <span
              key={i}
              className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
            >
              ₹{p.toLocaleString("en-IN")}
              <button
                onClick={() => removePrice(i)}
                className="text-slate-400 hover:text-red-500"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
