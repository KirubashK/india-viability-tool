"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { CostBreakdownItem } from "@/types/calculation";

interface WaterfallChartProps {
  breakdown: CostBreakdownItem[];
  title?: string;
}

interface WaterfallDataPoint {
  name: string;
  value: number;
  base: number;
  fill: string;
  isTotal: boolean;
  isSubtotal: boolean;
  displayValue: number;
}

// Safely coerce a value to a finite number, defaulting to 0.
// Prevents NaN / Infinity from crashing the chart.
function safeNumber(v: number | undefined | null): number {
  if (v === undefined || v === null || !isFinite(v) || isNaN(v)) return 0;
  return v;
}

function buildWaterfallData(breakdown: CostBreakdownItem[]): WaterfallDataPoint[] {
  let running = 0;
  return breakdown.map((item) => {
    const rawValue = safeNumber(item.value);
    const isPositive = rawValue >= 0;
    const isTotal = !!item.isTotal;
    const isSubtotal = !!item.isSubtotal;

    if (isTotal || isSubtotal) {
      const result: WaterfallDataPoint = {
        name: item.label,
        value: Math.abs(rawValue),
        base: 0,
        fill: isTotal ? "#1e293b" : "#475569",
        isTotal,
        isSubtotal,
        displayValue: rawValue,
      };
      running = rawValue;
      return result;
    }

    const base = isPositive ? running : running + rawValue;
    const result: WaterfallDataPoint = {
      name: item.label,
      value: Math.abs(rawValue),
      base,
      fill: isPositive ? "#10b981" : "#f43f5e",
      isTotal: false,
      isSubtotal: false,
      displayValue: rawValue,
    };
    running += rawValue;
    return result;
  });
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: any[];
}) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload as WaterfallDataPoint | undefined;
    if (!data) return null;
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xl">
        <p className="text-xs font-semibold text-slate-600">{data.name}</p>
        <p
          className={`mt-1 font-mono text-lg font-bold ${
            data.displayValue >= 0 ? "text-emerald-600" : "text-red-500"
          }`}
        >
          {data.displayValue >= 0 ? "+" : ""}
          {data.displayValue.toLocaleString("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
          })}
        </p>
      </div>
    );
  }
  return null;
};

// Safe Y-axis formatter — guards against non-numeric tick values
function yTickFormatter(v: number): string {
  if (typeof v !== "number" || !isFinite(v)) return "—";
  if (Math.abs(v) >= 1000) return `₹${(v / 1000).toFixed(0)}k`;
  return `₹${v.toFixed(0)}`;
}

export function WaterfallChart({ breakdown, title }: WaterfallChartProps) {
  // Guard: render placeholder if breakdown is missing or empty
  if (!breakdown || breakdown.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center text-sm text-slate-400">
        No data to display
      </div>
    );
  }

  const data = buildWaterfallData(breakdown);

  return (
    <div className="w-full">
      {title && (
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            angle={-35}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            domain={["dataMin - 500", "dataMax + 500"]}
            tickFormatter={yTickFormatter}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
          />
          <Tooltip content={<CustomTooltip />} />
          {/* Bold zero-line makes positive/negative bars immediately readable */}
          <ReferenceLine y={0} stroke="#000" strokeWidth={1.5} />
          {/* Invisible base bar for waterfall stacking */}
          <Bar dataKey="base" stackId="stack" fill="transparent" />
          <Bar dataKey="value" stackId="stack" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center justify-center gap-6 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-emerald-500" />
          Addition
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-red-500" />
          Deduction
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-slate-700" />
          Total
        </span>
      </div>
    </div>
  );
}
