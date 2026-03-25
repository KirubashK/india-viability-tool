"use client";

import React from "react";
import { CostBreakdownItem } from "@/types/calculation";
import { cn } from "@/lib/utils";

interface CostBreakdownTableProps {
  items: CostBreakdownItem[];
  title?: string;
}

function formatInr(value: number): string {
  if (value < 0) {
    return `(₹${Math.abs(value).toLocaleString("en-IN")})`;
  }

  return `₹${value.toLocaleString("en-IN")}`;
}

export function CostBreakdownTable({ items, title }: CostBreakdownTableProps) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-200">
      {title && (
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </p>
        </div>
      )}
      <table className="w-full text-sm">
        <tbody>
          {items.map((item, i) => {
            const isNegative = item.value < 0;
            const isTotal = item.isTotal;
            const isSubtotal = item.isSubtotal;

            return (
              <tr
                key={i}
                className={cn(
                  "border-b border-slate-100 last:border-b-0",
                  isTotal && "bg-slate-800 text-white",
                  isSubtotal && !isTotal && "bg-slate-100 font-semibold",
                  !isTotal && !isSubtotal && "hover:bg-slate-50"
                )}
              >
                <td
                  className={cn(
                    "px-4 py-2.5",
                    isTotal ? "text-slate-200 text-xs font-medium" : "text-slate-600 text-xs",
                    isSubtotal && "text-slate-700"
                  )}
                >
                  {!isTotal && !isSubtotal && (
                    <span className="mr-2 text-slate-300">—</span>
                  )}
                  {item.label}
                </td>
                <td
                  className={cn(
                    "px-4 py-2.5 text-right font-mono font-semibold",
                    isTotal ? "text-white text-base" : isNegative ? "text-red-600" : "text-emerald-700",
                    isSubtotal && !isTotal && "text-slate-800"
                  )}
                >
                  {isNegative ? `(${formatInr(Math.abs(item.value))})` : formatInr(item.value)}
                </td>
                {item.percent !== undefined && (
                  <td
                    className={cn(
                      "w-16 px-4 py-2.5 text-right font-mono text-xs",
                      isTotal ? "text-slate-400" : "text-slate-400"
                    )}
                  >
                    {item.percent.toFixed(1)}%
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
