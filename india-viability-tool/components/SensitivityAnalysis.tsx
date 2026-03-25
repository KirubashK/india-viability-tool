"use client";

import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { calculateLandedCost, calculateUnitEconomics } from "@/lib/calculations";
import { useProductStore } from "@/store/productStore";
import { cn } from "@/lib/utils";

type SensitivityAxis = "sellingPrice" | "fobPrice" | "marketingPercent" | "freightCost";

interface SensitivityAnalysisProps {
  axis: SensitivityAxis;
}

const AXIS_CONFIG: Record<SensitivityAxis, {
  label: string;
  unit: string;
  steps: number;
  range: number; // ±% from base
  format: (v: number) => string;
}> = {
  sellingPrice: { label: "Selling Price (MRP ₹)", unit: "₹", steps: 11, range: 40, format: (v) => `₹${v.toLocaleString("en-IN")}` },
  fobPrice: { label: "FOB Price", unit: "", steps: 11, range: 40, format: (v) => `${v.toFixed(2)}` },
  marketingPercent: { label: "Marketing %", unit: "%", steps: 11, range: 80, format: (v) => `${v.toFixed(1)}%` },
  freightCost: { label: "Freight Cost (₹)", unit: "₹", steps: 11, range: 60, format: (v) => `₹${(v / 1000).toFixed(0)}k` },
};

export function SensitivityAnalysis() {
  const { valueChain, unitEconomics, product } = useProductStore();
  const [axis, setAxis] = React.useState<SensitivityAxis>("sellingPrice");

  const cfg = AXIS_CONFIG[axis];

  const chartData = useMemo(() => {
    const base = axis === "sellingPrice" ? product.sellingPrice
      : axis === "fobPrice" ? valueChain.fobPrice
      : axis === "marketingPercent" ? unitEconomics.marketingPercent
      : valueChain.freightCost;

    return Array.from({ length: cfg.steps }, (_, i) => {
      const factor = 1 - cfg.range / 100 + (i * 2 * cfg.range) / 100 / (cfg.steps - 1);
      const value = base * factor;

      try {
        const vc = axis === "fobPrice"
          ? { ...valueChain, fobPrice: value }
          : axis === "freightCost"
          ? { ...valueChain, freightCost: value }
          : valueChain;

        const landed = calculateLandedCost(vc);

        const ue = axis === "sellingPrice"
          ? { ...unitEconomics, sellingPrice: value, landedCost: landed.totalLandedCost }
          : axis === "marketingPercent"
          ? { ...unitEconomics, marketingPercent: value, landedCost: landed.totalLandedCost }
          : { ...unitEconomics, landedCost: landed.totalLandedCost };

        const result = calculateUnitEconomics(ue);

        return {
          xLabel: cfg.format(value),
          xValue: value,
          margin: parseFloat(result.margin.toFixed(2)),
          profit: parseFloat(result.profit.toFixed(0)),
          breakEven: parseFloat(result.breakEvenPrice.toFixed(0)),
          isBase: Math.abs(factor - 1) < 0.001,
        };
      } catch {
        return { xLabel: cfg.format(value), xValue: value, margin: 0, profit: 0, breakEven: 0, isBase: false };
      }
    });
  }, [axis, valueChain, unitEconomics, product]);

  const basePoint = chartData.find((d) => d.isBase);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xl text-xs">
          <p className="font-semibold text-slate-700 mb-2">{label}</p>
          {payload.map((p: any) => (
            <div key={p.dataKey} className="flex items-center justify-between gap-6">
              <span style={{ color: p.color }}>{p.name}</span>
              <span className="font-mono font-bold" style={{ color: p.color }}>
                {p.dataKey === "margin" ? `${p.value.toFixed(1)}%` : `₹${p.value.toLocaleString("en-IN")}`}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-700">Sensitivity Analysis</h3>
        <p className="text-xs text-slate-400">How margin responds to ±{cfg.range}% change in key variable</p>
      </div>

      {/* Axis selector */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(AXIS_CONFIG) as SensitivityAxis[]).map((key) => (
          <button
            key={key}
            onClick={() => setAxis(key)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              axis === key
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {AXIS_CONFIG[key].label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="xLabel"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            interval={Math.floor(cfg.steps / 5)}
          />
          <YAxis
            yAxisId="left"
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 10, fill: "#10b981" }}
            domain={["auto", "auto"]}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={(v) => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`}
            tick={{ fontSize: 10, fill: "#6366f1" }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: "11px" }} />
          <ReferenceLine yAxisId="left" y={0} stroke="#f43f5e" strokeDasharray="4 2" strokeWidth={1.5} label={{ value: "Break-even", position: "right", fontSize: 10, fill: "#f43f5e" }} />
          {basePoint && (
            <ReferenceLine
              yAxisId="left"
              x={basePoint.xLabel}
              stroke="#94a3b8"
              strokeDasharray="4 2"
              label={{ value: "Base", position: "top", fontSize: 10, fill: "#94a3b8" }}
            />
          )}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="margin"
            name="Margin %"
            stroke="#10b981"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: "#10b981" }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="profit"
            name="Net Profit (₹)"
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
            strokeDasharray="6 2"
            activeDot={{ r: 5, fill: "#6366f1" }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Insight callout */}
      {basePoint && (
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-600 mb-1">Current Base Values</p>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
            <span><strong className="text-slate-700">{cfg.label}:</strong> {basePoint.xLabel}</span>
            <span><strong className="text-emerald-600">{basePoint.margin.toFixed(1)}%</strong> margin</span>
            <span><strong className="text-indigo-600">₹{basePoint.profit.toLocaleString("en-IN")}</strong> profit/unit</span>
          </div>
        </div>
      )}
    </div>
  );
}
