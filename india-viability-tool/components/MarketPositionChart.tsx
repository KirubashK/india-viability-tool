"use client";

import React from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { MarketPositionResult } from "@/types/calculation";
import { cn } from "@/lib/utils";

interface MarketPositionChartProps {
  result: MarketPositionResult;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    const d = payload[0]?.payload;
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xl text-xs">
        <p className="font-semibold text-slate-700">{d.label}</p>
        <p className="font-mono text-indigo-600">₹{d.price.toLocaleString("en-IN")}</p>
      </div>
    );
  }
  return null;
};

export function MarketPositionChart({ result }: MarketPositionChartProps) {
  const { sellingPrice, competitorPrices, medianPrice, averagePrice, position, percentile } = result;

  // Build scatter data: x = index (spread), y = price
  const allPoints = [
    ...competitorPrices.map((price, i) => ({
      x: i + 1,
      y: price,
      price,
      label: `Competitor ${i + 1}`,
      isOwn: false,
      isMedian: false,
    })),
    {
      x: competitorPrices.length + 1,
      y: sellingPrice,
      price: sellingPrice,
      label: "Your Price",
      isOwn: true,
      isMedian: false,
    },
  ];

  const positionConfig = {
    BELOW: { label: "Below Market", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", detail: "Priced competitively — advantage for volume" },
    AT: { label: "At Market", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", detail: "Aligned with market expectations" },
    ABOVE: { label: "Above Market", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", detail: "Premium positioning — differentiation required" },
  };

  const cfg = positionConfig[position];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <h3 className="text-sm font-bold text-slate-700">Market Price Positioning</h3>
        <div className={cn("rounded-lg border px-3 py-1.5 text-xs font-semibold", cfg.bg, cfg.border, cfg.color)}>
          {cfg.label}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <ScatterChart margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="x" hide />
          <YAxis
            dataKey="y"
            tickFormatter={(v) => `₹${(v / 1000).toFixed(1)}k`}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={medianPrice}
            stroke="#6366f1"
            strokeDasharray="5 3"
            strokeWidth={2}
            label={{ value: `Median ₹${medianPrice.toFixed(0)}`, position: "right", fontSize: 10, fill: "#6366f1" }}
          />
          <ReferenceLine
            y={averagePrice}
            stroke="#8b5cf6"
            strokeDasharray="3 3"
            strokeWidth={1.5}
            label={{ value: `Avg ₹${averagePrice.toFixed(0)}`, position: "left", fontSize: 9, fill: "#8b5cf6" }}
          />
          <Scatter data={allPoints} isAnimationActive>
            {allPoints.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.isOwn ? "#f43f5e" : "#94a3b8"}
                r={entry.isOwn ? 10 : 6}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Your Price", value: `₹${sellingPrice.toLocaleString("en-IN")}`, color: "text-red-500" },
          { label: "Median Price", value: `₹${medianPrice.toLocaleString("en-IN")}`, color: "text-indigo-600" },
          { label: "Your Percentile", value: `${percentile.toFixed(0)}th`, color: "text-slate-700" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg bg-slate-50 p-3 text-center">
            <p className="text-xs text-slate-400">{label}</p>
            <p className={cn("font-mono text-sm font-bold mt-0.5", color)}>{value}</p>
          </div>
        ))}
      </div>

      <div className={cn("rounded-lg border p-3 text-xs", cfg.bg, cfg.border, cfg.color)}>
        <span className="font-semibold">{cfg.label}: </span>{cfg.detail}
      </div>
    </div>
  );
}
