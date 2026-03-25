"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  icon?: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
  loading?: boolean;
}

export function KpiCard({
  label,
  value,
  subValue,
  trend,
  trendLabel,
  icon,
  variant = "default",
  loading = false,
}: KpiCardProps) {
  const variantStyles = {
    default: "border-slate-200 bg-white",
    success: "border-emerald-200 bg-emerald-50",
    warning: "border-amber-200 bg-amber-50",
    danger: "border-red-200 bg-red-50",
  };

  const trendIcon =
    trend === "up" ? (
      <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
    ) : trend === "down" ? (
      <TrendingDown className="h-3.5 w-3.5 text-red-500" />
    ) : (
      <Minus className="h-3.5 w-3.5 text-slate-400" />
    );

  const trendColor =
    trend === "up"
      ? "text-emerald-600"
      : trend === "down"
      ? "text-red-500"
      : "text-slate-400";

  return (
    <div
      className={cn(
        "rounded-xl border px-5 py-4 transition-all duration-200 hover:shadow-md",
        variantStyles[variant],
        loading && "animate-pulse"
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </p>
        {icon && (
          <span className="text-slate-400">{icon}</span>
        )}
      </div>

      <div className="mt-2">
        {loading ? (
          <div className="h-7 w-28 rounded bg-slate-200" />
        ) : (
          <p className="font-mono text-2xl font-bold tracking-tight text-slate-800">
            {value}
          </p>
        )}
        {subValue && !loading && (
          <p className="mt-0.5 text-xs text-slate-500">{subValue}</p>
        )}
      </div>

      {trend && trendLabel && !loading && (
        <div className={cn("mt-2 flex items-center gap-1 text-xs font-medium", trendColor)}>
          {trendIcon}
          <span>{trendLabel}</span>
        </div>
      )}
    </div>
  );
}
