import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatInr(value: number, compact = false): string {
  if (compact) {
    if (value >= 1_00_000) return `₹${(value / 1_00_000).toFixed(2)}L`;
    if (value >= 1_000) return `₹${(value / 1_000).toFixed(1)}k`;
  }
  return value.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function clampMarginColor(margin: number): string {
  if (margin >= 35) return "text-emerald-600";
  if (margin >= 20) return "text-amber-600";
  return "text-red-600";
}
