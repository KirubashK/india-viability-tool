/**
 * Formats a number in Indian numbering system.
 * e.g. 1234567 → "12,34,567"
 */
export function formatIndianNumber(value: number, decimals = 0): string {
  return value.toLocaleString("en-IN", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  });
}

/**
 * Formats value as INR with Indian number system.
 */
export function formatRupee(value: number, compact = false): string {
  if (compact) {
    if (value >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(2)} Cr`;
    if (value >= 1_00_000) return `₹${(value / 1_00_000).toFixed(2)} L`;
    if (value >= 1_000) return `₹${(value / 1_000).toFixed(1)}k`;
    return `₹${value.toFixed(0)}`;
  }
  return value.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

/**
 * Returns color class based on margin value.
 */
export function getMarginColorClass(margin: number): string {
  if (margin >= 30) return "text-emerald-600";
  if (margin >= 20) return "text-amber-600";
  if (margin >= 10) return "text-orange-500";
  return "text-red-600";
}

/**
 * Returns background color class based on margin value.
 */
export function getMarginBgClass(margin: number): string {
  if (margin >= 30) return "bg-emerald-50 border-emerald-200";
  if (margin >= 20) return "bg-amber-50 border-amber-200";
  if (margin >= 10) return "bg-orange-50 border-orange-200";
  return "bg-red-50 border-red-200";
}

/**
 * Computes minimum viable selling price given cost structure and margin target.
 */
export function computeMinViablePrice(
  totalFixedCosts: number,
  variableCostRate: number, // as decimal
  targetMargin: number      // as decimal
): number {
  // price * (1 - variableRate - targetMargin) = fixedCosts
  const denominator = 1 - variableCostRate - targetMargin;
  if (denominator <= 0) return Infinity;
  return totalFixedCosts / denominator;
}

/**
 * Returns a simple traffic-light label.
 */
export function getMarginLabel(margin: number): string {
  if (margin >= 35) return "Excellent";
  if (margin >= 25) return "Good";
  if (margin >= 15) return "Acceptable";
  if (margin >= 0) return "Thin";
  return "Loss";
}
