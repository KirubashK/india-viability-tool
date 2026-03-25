"use client";

import React from "react";
import { useScenarioStore, SavedScenario } from "@/store/scenarioStore";
import { VerdictBadge } from "./VerdictBadge";
import { formatInr } from "@/lib/utils";
import { X, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScenarioCompareModalProps {
  onClose: () => void;
}

function delta(a: number, b: number): { diff: number; icon: React.ReactNode; color: string } {
  const diff = a - b;
  if (Math.abs(diff) < 0.01) return { diff, icon: <Minus className="h-3 w-3" />, color: "text-slate-400" };
  if (diff > 0) return { diff, icon: <TrendingUp className="h-3 w-3" />, color: "text-emerald-600" };
  return { diff, icon: <TrendingDown className="h-3 w-3" />, color: "text-red-500" };
}

interface MetricRowProps {
  label: string;
  values: Array<{ raw: number; display: string }>;
  higherIsBetter?: boolean;
}

function MetricRow({ label, values, higherIsBetter = true }: MetricRowProps) {
  const nums = values.map((v) => v.raw);
  const best = higherIsBetter ? Math.max(...nums) : Math.min(...nums);

  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-3 pr-4 text-xs font-medium text-slate-500 whitespace-nowrap">{label}</td>
      {values.map((v, i) => {
        const isBest = v.raw === best && nums.filter((n) => n === best).length < nums.length;
        return (
          <td key={i} className={cn("px-4 py-3 text-center", isBest && "rounded-lg bg-emerald-50")}>
            <span className={cn("font-mono text-sm font-bold", isBest ? "text-emerald-700" : "text-slate-700")}>
              {v.display}
            </span>
            {isBest && (
              <span className="ml-1 text-xs text-emerald-500">★</span>
            )}
          </td>
        );
      })}
    </tr>
  );
}

export function ScenarioCompareModal({ onClose }: ScenarioCompareModalProps) {
  const { scenarios, compareIds, clearCompare } = useScenarioStore();
  const selected = compareIds
    .map((id) => scenarios.find((s) => s.id === id))
    .filter((s): s is SavedScenario => s !== undefined);

  if (selected.length < 2) return null;

  const metrics = [
    {
      label: "Landed Cost",
      values: selected.map((s) => ({
        raw: s.landedCost.totalLandedCost,
        display: formatInr(s.landedCost.totalLandedCost, true),
      })),
      higherIsBetter: false,
    },
    {
      label: "Selling Price (MRP)",
      values: selected.map((s) => ({
        raw: s.product.sellingPrice,
        display: formatInr(s.product.sellingPrice, true),
      })),
      higherIsBetter: true,
    },
    {
      label: "Net Profit",
      values: selected.map((s) => ({
        raw: s.unitEconomics.profit,
        display: formatInr(s.unitEconomics.profit, true),
      })),
      higherIsBetter: true,
    },
    {
      label: "Margin %",
      values: selected.map((s) => ({
        raw: s.unitEconomics.margin,
        display: `${s.unitEconomics.margin.toFixed(1)}%`,
      })),
      higherIsBetter: true,
    },
    {
      label: "Break-Even Price",
      values: selected.map((s) => ({
        raw: s.unitEconomics.breakEvenPrice,
        display: `₹${s.unitEconomics.breakEvenPrice.toFixed(0)}`,
      })),
      higherIsBetter: false,
    },
    {
      label: "Effective Duty Rate",
      values: selected.map((s) => ({
        raw: s.landedCost.effectiveDutyRate,
        display: `${s.landedCost.effectiveDutyRate.toFixed(1)}%`,
      })),
      higherIsBetter: false,
    },
    {
      label: "Marketing Cost",
      values: selected.map((s) => ({
        raw: s.unitEconomics.marketingCost,
        display: formatInr(s.unitEconomics.marketingCost, true),
      })),
      higherIsBetter: false,
    },
    {
      label: "Logistics Cost",
      values: selected.map((s) => ({
        raw: s.unitEconomics.logisticsCost,
        display: formatInr(s.unitEconomics.logisticsCost, true),
      })),
      higherIsBetter: false,
    },
    {
      label: "Viability Score",
      values: selected.map((s) => ({
        raw: s.verdict.score,
        display: `${s.verdict.score}/100`,
      })),
      higherIsBetter: true,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Scenario Comparison</h2>
            <p className="text-xs text-slate-400">★ marks the best value in each row</p>
          </div>
          <button
            onClick={() => { clearCompare(); onClose(); }}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scenario headers */}
        <div className="px-6 pt-6">
          <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${selected.length}, 1fr)` }}>
            <div /> {/* spacer */}
            {selected.map((s) => (
              <div key={s.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="font-bold text-slate-800 text-sm leading-tight">{s.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {s.product.productName || "—"}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {s.product.marketplace} · {s.product.category}
                </p>
                <div className="mt-3">
                  <VerdictBadge verdict={s.verdict.verdict} score={s.verdict.score} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Metrics table */}
        <div className="px-6 pb-6 pt-4">
          <table className="w-full">
            <tbody>
              {metrics.map((m) => (
                <MetricRow
                  key={m.label}
                  label={m.label}
                  values={m.values}
                  higherIsBetter={m.higherIsBetter}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Cost structure comparison bar */}
        <div className="border-t border-slate-100 px-6 pb-6 pt-4">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Cost Structure Comparison (% of MRP)
          </p>
          <div className="space-y-4">
            {selected.map((s) => {
              const mrp = s.product.sellingPrice;
              const pieces = [
                { label: "Landed", pct: (s.landedCost.totalLandedCost / mrp) * 100, color: "#6366f1" },
                { label: "Mkt Fees", pct: (s.unitEconomics.marketplaceFees / mrp) * 100, color: "#8b5cf6" },
                { label: "Logistics", pct: (s.unitEconomics.logisticsCost / mrp) * 100, color: "#ec4899" },
                { label: "Marketing", pct: (s.unitEconomics.marketingCost / mrp) * 100, color: "#f59e0b" },
                { label: "Profit", pct: Math.max(0, s.unitEconomics.margin), color: "#10b981" },
              ];
              return (
                <div key={s.id}>
                  <p className="mb-1.5 text-xs font-medium text-slate-600">{s.name}</p>
                  <div className="flex h-7 w-full overflow-hidden rounded-lg">
                    {pieces.map((p) => (
                      <div
                        key={p.label}
                        title={`${p.label}: ${p.pct.toFixed(1)}%`}
                        className="flex items-center justify-center text-xs font-bold text-white transition-all"
                        style={{ width: `${Math.max(p.pct, 0)}%`, backgroundColor: p.color }}
                      >
                        {p.pct > 9 && `${p.pct.toFixed(0)}%`}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {[
              { label: "Landed Cost", color: "#6366f1" },
              { label: "Mkt. Fees", color: "#8b5cf6" },
              { label: "Logistics", color: "#ec4899" },
              { label: "Marketing", color: "#f59e0b" },
              { label: "Profit", color: "#10b981" },
            ].map((p) => (
              <span key={p.label} className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
                {p.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
