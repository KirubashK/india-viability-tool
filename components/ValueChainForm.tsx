"use client";

import React, { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useProductStore } from "@/store/productStore";
import { ValueChainInputs, CostType, Currency } from "@/types/product";
import { getDutyRates } from "@/lib/dutyEngine";
import { getImportFreightPerUnit } from "@/lib/logisticsEngine";
import { getOriginCostPercent } from "@/lib/originCostEngine";
import { COUNTRIES } from "@/data/hsCodes";
import { EXCHANGE_RATES } from "@/data/benchmarks";
import { HsCodeSelector } from "@/components/HsCodeSelector";
import { Info, RotateCcw, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const CURRENCIES: Currency[] = ["USD", "EUR", "GBP", "AUD", "JPY", "CNY", "RUB"];

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all";
const selectCls = cn(inputCls, "appearance-none cursor-pointer pr-7");

function Label({ text, tooltip }: { text: string; tooltip?: string }) {
  return (
    <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
      {text}
      {tooltip && (
        <span title={tooltip}>
          <Info className="h-3 w-3 text-slate-400" />
        </span>
      )}
    </label>
  );
}

function Field({ label, tooltip, children }: { label: string; tooltip?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label text={label} tooltip={tooltip} />
      {children}
    </div>
  );
}

function SelectWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-3.5 w-3.5 text-slate-400" />
    </div>
  );
}

export function ValueChainForm() {
  const { valueChain, setValueChain, product, resetOverrides } = useProductStore();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showFreightOverride, setShowFreightOverride] = useState(false);

  const { register, watch, setValue, control, reset } = useForm<ValueChainInputs>({
    defaultValues: valueChain,
  });

  const formValues = watch();
  const watchedCurrency = watch("currency");
  const watchedCountry = watch("countryOfOrigin");
  const watchedHs = watch("hsCode");
  const watchedMode = watch("freightMode");
  const watchedSeaType = watch("seaShippingType");
  const watchedCostType = watch("costType");
  const watchedWeight = watch("weight");
  const watchedExchangeRate = watch("exchangeRate");

  // useWatch subscribes directly to RHF's internal field registry per path.
  // Unlike watch(), it reliably returns updated values for nested dot-notation
  // fields (e.g. "dimensions.length") even when the parent object reference
  // is unchanged — which is exactly the case that was causing stale dims.
  const dimL = Number(useWatch({ control, name: "dimensions.length" })) || 0;
  const dimW = Number(useWatch({ control, name: "dimensions.width" })) || 0;
  const dimH = Number(useWatch({ control, name: "dimensions.height" })) || 0;

  // Sync store → form: reset RHF whenever Zustand valueChain changes so
  // useWatch always reads from the current store state, not stale defaults.
  useEffect(() => {
    reset(valueChain);
  }, [valueChain, reset]);

  // Sync form → store (debounced, guarded).
  // The guard prevents a feedback loop: reset(valueChain) → formValues changes →
  // setValueChain fires → valueChain changes → reset fires again.
  useEffect(() => {
    const t = setTimeout(() => {
      setValueChain((prev: typeof valueChain) => {
        if (JSON.stringify(prev) === JSON.stringify(formValues)) return prev;
        return formValues;
      });
    }, 120);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(formValues)]);

  // Update exchange rate when currency changes
  useEffect(() => {
    if (watchedCurrency) {
      setValue("exchangeRate", EXCHANGE_RATES[watchedCurrency] ?? 83.5);
    }
  }, [watchedCurrency, setValue]);

  // Keep countryOfOrigin in sync with Product Master (user changes country there, not here)
  useEffect(() => {
    if (valueChain.countryOfOrigin && valueChain.countryOfOrigin !== watch("countryOfOrigin")) {
      setValue("countryOfOrigin", valueChain.countryOfOrigin);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueChain.countryOfOrigin]);

  // Compute freight preview directly — no useMemo.
  // watch() already re-renders the component on every keystroke, so this always
  // runs with the latest typed values. dimL/W/H come from useWatch (reliable).
  const freightPreview = (() => {
    const dims = { length: dimL, width: dimW, height: dimH };
    const w = Number(watchedWeight) || 0.3;
    const usdRate = watchedCurrency === "USD"
      ? (watchedExchangeRate || EXCHANGE_RATES["USD"] || 83.5)
      : (EXCHANGE_RATES["USD"] || 83.5);
    return getImportFreightPerUnit(
      (formValues.freightMode ?? "AIR"),
      (formValues.seaShippingType ?? "FCL"),
      watchedCountry ?? "USA",
      w,
      dims,
      usdRate,
      undefined
    );
  })();

  const autoRates = getDutyRates(watchedHs ?? "3304", watchedCountry ?? "USA");
  // Use the actual watched exchange rate (user-editable), not the static table.
  const effectiveRate = watchedExchangeRate || EXCHANGE_RATES[watchedCurrency ?? "USD"] || 83.5;
  const baseCostInr = (Number(watch("baseCost")) || 0) * effectiveRate;
  const autoOriginPct = getOriginCostPercent(watchedCountry ?? "USA");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
          Value Chain & Landed Cost
        </h3>
        <button
          type="button"
          onClick={() => { resetOverrides(); setShowFreightOverride(false); }}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      </div>

      {/* Cost Type toggle */}
      <Field label="Cost Basis">
        <div className="flex gap-2">
          {(["FOB", "EXW"] as CostType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setValue("costType", t)}
              className={cn(
                "flex-1 rounded-lg border py-2 text-sm font-semibold transition-all",
                formValues.costType === t
                  ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
              )}
            >
              {t}
            </button>
          ))}
        </div>
        {watchedCostType === "EXW" && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-md px-2 py-1.5 leading-relaxed">
            Origin costs (inland transport, export docs) will be added automatically based on country.
          </p>
        )}
      </Field>

      {/* EXW origin cost override — shown only in EXW mode */}
      {watchedCostType === "EXW" && (
        <Field
          label="Origin Cost % override"
          tooltip="Overrides the auto country-based origin cost. E.g. enter 6 for 6%. Leave blank to use country default."
        >
          <input
            type="number"
            step="0.5"
            min="0"
            max="25"
            placeholder={`Auto (${(autoOriginPct * 100).toFixed(0)}% for ${watch("countryOfOrigin")})`}
            {...register("originCostOverridePercent", { valueAsNumber: true })}
            className={cn(inputCls, "placeholder:text-slate-400")}
          />
          <p className="text-xs text-slate-400">
            Country default: {(autoOriginPct * 100).toFixed(0)}% · EXW→FOB adds ₹{Math.round(baseCostInr * autoOriginPct).toLocaleString("en-IN")}
          </p>
        </Field>
      )}

      {/* Currency + Cost */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Currency">
          <SelectWrap>
            <select {...register("currency")} className={selectCls}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </SelectWrap>
        </Field>
        <Field
          label={watchedCostType === "EXW" ? "EXW Cost / unit" : "FOB Cost / unit"}
          tooltip={watchedCostType === "EXW" ? "Ex-works price — origin costs added automatically" : "FOB price per unit"}
        >
          <input type="number" step="0.01" min="0" {...register("baseCost", { valueAsNumber: true })} className={inputCls} placeholder="0.00" />
        </Field>
      </div>
      <p className="text-xs text-slate-400">≈ ₹{Math.round(baseCostInr).toLocaleString("en-IN")} @ ₹{effectiveRate.toFixed(1)}/{watchedCurrency}</p>

      {/* Editable exchange rate — allows user to override the static FX table */}
      <Field label="Exchange Rate (₹ per 1 unit)" tooltip="Edit to use live or custom FX rate">
        <input
          type="number"
          step="0.01"
          min="0.01"
          {...register("exchangeRate", { valueAsNumber: true })}
          className={inputCls}
        />
      </Field>

      {/* Country + HS — country is set in Product Master and read here for context */}
      <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
        <span className="text-slate-400">Country of Origin: </span>
        <span className="font-semibold text-slate-700">{COUNTRIES[watchedCountry ?? ""] ?? watchedCountry ?? "—"}</span>
        {autoRates.isPreferential && (
          <span className="ml-2 text-emerald-600 font-medium">✓ FTA — preferential duty applies</span>
        )}
        <span className="ml-2 text-slate-400">(set in Product Master)</span>
      </div>

      <Field label="HS Code">
        <HsCodeSelector
          value={watch("hsCode") ?? "3304"}
          onChange={(code) => setValue("hsCode", code)}
        />
      </Field>

      {/* Dimensions + Weight */}
      <div className="grid grid-cols-4 gap-2">
        <Field label="L (cm)">
          <input type="number" min="0" {...register("dimensions.length", { valueAsNumber: true })} className={inputCls} />
        </Field>
        <Field label="W (cm)">
          <input type="number" min="0" {...register("dimensions.width", { valueAsNumber: true })} className={inputCls} />
        </Field>
        <Field label="H (cm)">
          <input type="number" min="0" {...register("dimensions.height", { valueAsNumber: true })} className={inputCls} />
        </Field>
        <Field label="Wt (kg)">
          <input type="number" step="0.05" min="0" {...register("weight", { valueAsNumber: true })} className={inputCls} />
        </Field>
      </div>

      {/* Freight Mode + computed preview */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <Label text="Shipping Mode" />
          <div className="flex gap-1.5">
            {(["AIR", "SEA"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setValue("freightMode", m)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-semibold transition-all",
                  formValues.freightMode === m
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300"
                )}
              >
                {m === "AIR" ? "✈ AIR" : "🚢 SEA"}
              </button>
            ))}
          </div>
        </div>

        {/* FCL / LCL sub-toggle — only visible in SEA mode */}
        {watchedMode === "SEA" && (
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold w-fit">
            {(["FCL", "LCL"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setValue("seaShippingType", t)}
                className={cn(
                  "px-3 py-1.5 transition-colors",
                  (watchedSeaType ?? "FCL") === t
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-slate-500 hover:bg-slate-50",
                  t === "LCL" && "border-l border-slate-200"
                )}
              >
                {t === "FCL" ? "📦 FCL" : "🔀 LCL"}
              </button>
            ))}
          </div>
        )}

        {/* Auto-calculated freight display */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">Freight per unit</p>
            <p className="text-base font-bold text-slate-800">
              ₹{Math.round(freightPreview.freightPerUnit).toLocaleString("en-IN")}
            </p>
          </div>
          <span
            title={freightPreview.tooltip}
            className="rounded-full bg-white border border-slate-200 px-2 py-0.5 text-xs text-slate-500 cursor-help"
          >
            {watchedMode === "SEA"
              ? ((watchedSeaType ?? "FCL") === "FCL" ? "FCL ÷ units" : "LCL $/CBM")
              : "Slab ÷5000"} ⓘ
          </span>
        </div>

        {/* Always-visible dimension-sensitive metrics — update live as user types */}
        <div className="grid grid-cols-3 gap-1.5">
          {watchedMode === "AIR" && (
            <>
              <div className="bg-white rounded-lg p-2 text-xs text-center">
                <p className="text-slate-400">Vol. wt (÷5000)</p>
                <p className="font-semibold text-slate-700">
                  {(freightPreview.volumetricWeight ?? 0).toFixed(3)} kg
                </p>
              </div>
              <div className="bg-white rounded-lg p-2 text-xs text-center">
                <p className="text-slate-400">Chargeable wt</p>
                <p className="font-semibold text-slate-700">
                  {(freightPreview.chargeableWeight ?? 0).toFixed(1)} kg
                </p>
              </div>
              <div className="bg-white rounded-lg p-2 text-xs text-center">
                <p className="text-slate-400">Slab rate</p>
                <p className="font-semibold text-slate-700">₹{freightPreview.ratePerKg ?? 0}/kg</p>
              </div>
            </>
          )}
          {watchedMode === "SEA" && (
            <>
              <div className="bg-white rounded-lg p-2 text-xs text-center">
                <p className="text-slate-400">Unit vol (CBM)</p>
                <p className="font-semibold text-slate-700">
                  {(freightPreview.lclUnitVolumeCbm ?? 0).toFixed(4)}
                </p>
              </div>
              <div className="bg-white rounded-lg p-2 text-xs text-center">
                <p className="text-slate-400">Chargeable wt</p>
                <p className="font-semibold text-slate-700">
                  {(freightPreview.seaChargeableWeight ?? 0).toFixed(3)} kg
                </p>
              </div>
              {(watchedSeaType ?? "FCL") === "FCL" ? (
                <div className="bg-white rounded-lg p-2 text-xs text-center">
                  <p className="text-slate-400">Units / FCL</p>
                  <p className="font-semibold text-slate-700">
                    {(freightPreview.unitsPerContainer ?? 0).toLocaleString("en-IN")}
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-lg p-2 text-xs text-center">
                  <p className="text-slate-400">Unit vol (CBM)</p>
                  <p className="font-semibold text-slate-700">
                    {(freightPreview.lclUnitVolumeCbm ?? 0).toFixed(5)}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Advanced toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
        >
          <ChevronRight className={cn("h-3 w-3 transition-transform", showAdvanced && "rotate-90")} />
          {showAdvanced ? "Hide" : "Show"} breakdown
        </button>

        {showAdvanced && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            {watchedMode === "SEA" && (
              <>
                <div className="bg-white rounded-lg p-2 text-xs">
                  <p className="text-slate-400">Unit volume (CBM)</p>
                  <p className="font-semibold text-slate-700">{(freightPreview.lclUnitVolumeCbm ?? 0).toFixed(4)}</p>
                </div>
                <div className="bg-white rounded-lg p-2 text-xs">
                  <p className="text-slate-400">Chargeable weight</p>
                  <p className="font-semibold text-slate-700">{(freightPreview.seaChargeableWeight ?? 0).toFixed(3)} kg</p>
                </div>
                {(watchedSeaType ?? "FCL") === "FCL" ? (
                  <>
                    <div className="bg-white rounded-lg p-2 text-xs">
                      <p className="text-slate-400">FCL units / container</p>
                      <p className="font-semibold text-slate-700">{(freightPreview.unitsPerContainer ?? 0).toLocaleString("en-IN")}</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 text-xs">
                      <p className="text-slate-400">Container cost (INR)</p>
                      <p className="font-semibold text-slate-700">₹{Math.round(freightPreview.containerCost ?? 0).toLocaleString("en-IN")}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-white rounded-lg p-2 text-xs">
                      <p className="text-slate-400">Unit volume (CBM)</p>
                      <p className="font-semibold text-slate-700">{(freightPreview.lclUnitVolumeCbm ?? 0).toFixed(5)}</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 text-xs">
                      <p className="text-slate-400">LCL cost (USD)</p>
                      <p className="font-semibold text-slate-700">${(freightPreview.lclFreightUSD ?? 0).toFixed(2)}</p>
                    </div>
                  </>
                )}
              </>
            )}
            {watchedMode === "AIR" && freightPreview.volumetricWeight !== undefined && (
              <>
                <div className="bg-white rounded-lg p-2 text-xs">
                  <p className="text-slate-400">Vol. weight (÷5000)</p>
                  <p className="font-semibold text-slate-700">{freightPreview.volumetricWeight?.toFixed(3)} kg</p>
                </div>
                <div className="bg-white rounded-lg p-2 text-xs">
                  <p className="text-slate-400">Chargeable (rounded)</p>
                  <p className="font-semibold text-slate-700">{freightPreview.chargeableWeight?.toFixed(1)} kg</p>
                </div>
                <div className="bg-white rounded-lg p-2 text-xs">
                  <p className="text-slate-400">Slab rate</p>
                  <p className="font-semibold text-slate-700">₹{freightPreview.ratePerKg}/kg</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Override toggle */}
        <button
          type="button"
          onClick={() => {
            setShowFreightOverride(!showFreightOverride);
            if (showFreightOverride) setValue("freightOverride", undefined);
          }}
          className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
        >
          {showFreightOverride ? "Remove override" : "Override freight"}
        </button>

        {showFreightOverride && (
          <Field label="Manual freight per unit (₹)">
            <input
              type="number"
              min="0"
              {...register("freightOverride", { valueAsNumber: true })}
              className={inputCls}
              placeholder="Enter INR amount"
            />
          </Field>
        )}
      </div>

      <Field label="Insurance (%)" tooltip="Insurance as % of FOB value">
        <input type="number" step="0.1" min="0" {...register("insurancePercent", { valueAsNumber: true })} className={inputCls} />
      </Field>

      {/* Duty overrides */}
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Duty Rates — auto-detected · override if needed
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "BCD (%)", field: "bcdOverride" as const, auto: autoRates.bcd },
            { label: "SWS (%)", field: "swsOverride" as const, auto: autoRates.sws },
            { label: "IGST (%)", field: "igstOverride" as const, auto: autoRates.igst },
          ].map(({ label, field, auto }) => (
            <Field key={field} label={label}>
              <input
                type="number"
                step="0.5"
                min="0"
                placeholder={String(auto)}
                {...register(field, { valueAsNumber: true })}
                className={cn(inputCls, "placeholder:text-slate-400")}
              />
              <p className="text-xs text-slate-400">Auto: {auto}%</p>
            </Field>
          ))}
        </div>
      </div>
    </div>
  );
}
