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

function buildWaterfallData(breakdown: CostBreakdownItem[]): WaterfallDataPoint[] {
  let running = 0;
  return breakdown.map((item) => {
    const isPositive = item.value >= 0;
    const isTotal = !!item.isTotal;
    const isSubtotal = !!item.isSubtotal;

    if (isTotal || isSubtotal) {
      const base = 0;
      const result: WaterfallDataPoint = {
        name: item.label,
        value: Math.abs(item.value),
        base,
        fill: isTotal ? "#1e293b" : "#475569",
        isTotal,
        isSubtotal,
        displayValue: item.value,
      };
      running = item.value;
      return result;
    }

    const base = isPositive ? running : running + item.value;
    const result: WaterfallDataPoint = {
      name: item.label,
      value: Math.abs(item.value),
      base,
      fill: isPositive ? "#10b981" : "#f43f5e",
      isTotal: false,
      isSubtotal: false,
      displayValue: item.value,
    };
    running += item.value;
    return result;
  });
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload as WaterfallDataPoint;
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

export function WaterfallChart({ breakdown, title }: WaterfallChartProps) {
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
            tickFormatter={(v) =>
              v >= 1000
                ? `₹${(v / 1000).toFixed(0)}k`
                : `₹${v.toFixed(0)}`
            }
            tick={{ fontSize: 10, fill: "#94a3b8" }}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#e2e8f0" />
          {/* Invisible base bar for stacking */}
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
