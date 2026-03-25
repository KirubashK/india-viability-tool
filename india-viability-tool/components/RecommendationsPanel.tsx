"use client";

import React from "react";
import { VerdictResult } from "@/types/calculation";
import { LandedCostResult } from "@/types/calculation";
import { BENCHMARKS } from "@/data/benchmarks";
import { Category } from "@/types/product";
import {
  Lightbulb,
  AlertCircle,
  TrendingUp,
  Package,
  Percent,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RecommendationsPanelProps {
  verdict: VerdictResult;
  landedCost: LandedCostResult;
  category: Category;
  sellingPrice: number;
}

interface Recommendation {
  icon: React.ElementType;
  title: string;
  detail: string;
  priority: "high" | "medium" | "low";
}

export function RecommendationsPanel({
  verdict,
  landedCost,
  category,
  sellingPrice,
}: RecommendationsPanelProps) {
  const benchmark = BENCHMARKS[category];

  const dynamicRecs: Recommendation[] = [];

  // Duty-based recommendations
  if (landedCost.effectiveDutyRate > 35) {
    dynamicRecs.push({
      icon: Globe,
      title: "Explore FTA Sourcing Routes",
      detail: `Your effective duty rate is ${landedCost.effectiveDutyRate.toFixed(1)}%. Sourcing via Singapore, UAE or South Korea (FTA partners) could reduce BCD to near 0%.`,
      priority: "high",
    });
  }

  // Landed cost ratio check
  const landedRatio = (landedCost.totalLandedCost / sellingPrice) * 100;
  if (landedRatio > benchmark.avgLandedCostRatio + 10) {
    dynamicRecs.push({
      icon: Package,
      title: "Landed Cost is Too High",
      detail: `Landed cost is ${landedRatio.toFixed(0)}% of selling price vs category avg of ${benchmark.avgLandedCostRatio}%. Consider sea freight or higher MOQ to reduce per-unit cost.`,
      priority: "high",
    });
  }

  // Margin gap
  if (verdict.margin < benchmark.successfulMarginFloor) {
    dynamicRecs.push({
      icon: Percent,
      title: "Margin Below Viability Floor",
      detail: `Current margin ${verdict.margin.toFixed(1)}% is below the ${benchmark.successfulMarginFloor}% floor for ${category} category. Re-negotiate FOB or increase selling price.`,
      priority: "high",
    });
  }

  // Market position
  if (verdict.position === "ABOVE") {
    dynamicRecs.push({
      icon: TrendingUp,
      title: "Price Positioning Risk",
      detail: "You're priced above market median. Ensure brand equity, packaging, or product superiority justifies the premium or reduce price.",
      priority: "medium",
    });
  }

  // All verdict recommendations
  verdict.recommendations.forEach((rec) => {
    dynamicRecs.push({
      icon: Lightbulb,
      title: "Optimization Opportunity",
      detail: rec,
      priority: "medium",
    });
  });

  // Always-present best practices
  dynamicRecs.push({
    icon: AlertCircle,
    title: "Compliance Reminder",
    detail: "Ensure BIS/FSSAI/Drug licensing requirements are met before import. Non-compliance can result in port clearance delays.",
    priority: "low",
  });

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const sorted = [...dynamicRecs].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  const priorityConfig = {
    high: { label: "High Priority", border: "border-l-red-500", bg: "bg-red-50", text: "text-red-700" },
    medium: { label: "Optimization", border: "border-l-amber-400", bg: "bg-amber-50", text: "text-amber-700" },
    low: { label: "Note", border: "border-l-blue-400", bg: "bg-blue-50", text: "text-blue-700" },
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
        Recommendations & Insights
      </h3>
      {sorted.map((rec, i) => {
        const cfg = priorityConfig[rec.priority];
        const Icon = rec.icon;
        return (
          <div
            key={i}
            className={cn(
              "flex gap-3 rounded-lg border-l-4 p-4",
              cfg.border,
              cfg.bg
            )}
          >
            <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", cfg.text)} />
            <div>
              <p className={cn("text-sm font-semibold", cfg.text)}>{rec.title}</p>
              <p className="mt-0.5 text-xs text-slate-600">{rec.detail}</p>
            </div>
            <span className={cn("ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-medium self-start", cfg.bg, cfg.text, "border", cfg.border)}>
              {cfg.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
