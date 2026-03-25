"use client";

import React from "react";
import { Verdict } from "@/types/product";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface VerdictBadgeProps {
  verdict: Verdict;
  score?: number;
  size?: "sm" | "md" | "lg";
}

const VERDICT_CONFIG = {
  GO: {
    label: "GO",
    sublabel: "Commercially Viable",
    icon: CheckCircle2,
    bg: "bg-emerald-50",
    border: "border-emerald-300",
    text: "text-emerald-700",
    iconColor: "text-emerald-500",
    glow: "shadow-emerald-100",
  },
  BORDERLINE: {
    label: "BORDERLINE",
    sublabel: "Proceed with Caution",
    icon: AlertTriangle,
    bg: "bg-amber-50",
    border: "border-amber-300",
    text: "text-amber-700",
    iconColor: "text-amber-500",
    glow: "shadow-amber-100",
  },
  NO_GO: {
    label: "NO-GO",
    sublabel: "Not Commercially Viable",
    icon: XCircle,
    bg: "bg-red-50",
    border: "border-red-300",
    text: "text-red-700",
    iconColor: "text-red-500",
    glow: "shadow-red-100",
  },
};

export function VerdictBadge({ verdict, score, size = "md" }: VerdictBadgeProps) {
  const config = VERDICT_CONFIG[verdict];
  const Icon = config.icon;

  const sizeMap = {
    sm: { container: "px-3 py-2", icon: "h-4 w-4", label: "text-sm", sub: "text-xs" },
    md: { container: "px-5 py-4", icon: "h-6 w-6", label: "text-xl", sub: "text-xs" },
    lg: { container: "px-8 py-6", icon: "h-10 w-10", label: "text-3xl", sub: "text-sm" },
  };

  const s = sizeMap[size];

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border-2 shadow-lg",
        config.bg,
        config.border,
        config.glow,
        s.container
      )}
    >
      <Icon className={cn(config.iconColor, s.icon)} />
      <div>
        <p className={cn("font-black tracking-widest", config.text, s.label)}>
          {config.label}
        </p>
        <p className={cn("font-medium", config.text, s.sub, "opacity-75")}>
          {config.sublabel}
        </p>
      </div>
      {score !== undefined && (
        <div className={cn("ml-auto text-right", config.text)}>
          <p className="text-2xl font-black">{score}</p>
          <p className="text-xs opacity-60">/ 100</p>
        </div>
      )}
    </div>
  );
}
