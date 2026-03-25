import {
  ValueChainInputs,
  UnitEconomicsInputs,
  MarketInputs,
  DutyRates,
} from "@/types/product";
import {
  LandedCostResult,
  UnitEconomicsResult,
  MarketPositionResult,
  VerdictResult,
  CostBreakdownItem,
} from "@/types/calculation";
import { getDutyRates, calculateDutyAmounts } from "./dutyEngine";
import { getMarketplaceFees, calculateMarketplaceDeduction, calculateMarketingCost } from "./commissionEngine";
import { calculateLastMileLogistics } from "./logisticsEngine";
import { deconstructGst } from "./gstEngine";
import { EXCHANGE_RATES } from "@/data/benchmarks";
import { CATEGORY_DEFAULTS } from "@/data/categories";

// ─── Landed Cost ───────────────────────────────────────────────────────────────

import { calculateLandedCostCore } from "./coreCalculations";

export function calculateLandedCost(inputs: ValueChainInputs): LandedCostResult {

  const result = calculateLandedCostCore({
    costBasis: "FOB",
    baseCost: inputs.fobPrice,
    originCosts: 0,

    freight: inputs.freightCost,
    insurancePercent: inputs.insurancePercent,

    bcdPercent: inputs.bcdOverride ?? 20,
    swsPercent: inputs.swsOverride ?? 10,
    igstPercent: inputs.igstOverride ?? 18,
  });

  return {
    cif: result.cif,
    totalDuty: result.totalDuty,
    landedCost: result.landedCost,
    breakdown: []
  };
}

// ─── Unit Economics ────────────────────────────────────────────────────────────

export function calculateUnitEconomics(inputs: UnitEconomicsInputs): UnitEconomicsResult {
  const { sellingPrice, marketplace, category, weight, landedCost, marketingPercent, returnRate } = inputs;

  // GST deconstruction from MRP
  const { basePrice: netRevenuePre, gstAmount } = deconstructGst(sellingPrice, category);

  // Marketplace fees
  const fees = getMarketplaceFees(marketplace, category);
  const effectiveCommission = inputs.commissionOverride !== undefined
    ? { ...fees, commissionPercent: inputs.commissionOverride, totalFeePercent: inputs.commissionOverride + fees.paymentFeePercent }
    : fees;

  const { commissionAmount, closingFee, paymentFeeAmount, totalDeduction, netAfterFees } =
    calculateMarketplaceDeduction(netRevenuePre, effectiveCommission);

  // Logistics
  const logistics = calculateLastMileLogistics(weight, returnRate);
  const logisticsCost = inputs.logisticsOverride !== undefined
    ? inputs.logisticsOverride + logistics.returnCost
    : logistics.netLogisticsCost;

  // Marketing
  const marketingCost = calculateMarketingCost(sellingPrice, marketingPercent);

  // Costs
  const totalCosts = landedCost + commissionAmount + closingFee + paymentFeeAmount + logisticsCost + marketingCost;
  const profit = netAfterFees - landedCost - logisticsCost - marketingCost;
  const margin = (profit / sellingPrice) * 100;

  // Break-even: find price at which margin = 0
  // profit = price/(1+gst) * (1 - commission%) - closingFee - paymentFee% * price/(1+gst) - landedCost - logistics - marketing%*price
  // Simplified linear approximation:
  const totalVariableCostRate = (effectiveCommission.commissionPercent + effectiveCommission.paymentFeePercent + marketingPercent) / 100;
  const fixedCosts = landedCost + logisticsCost + closingFee;
  const breakEvenPrice = fixedCosts / (1 - totalVariableCostRate - (gstAmount / sellingPrice));

  const breakdown: CostBreakdownItem[] = [
    { label: "MRP / Selling Price", value: sellingPrice },
    { label: `GST Deducted (${category === "FOOD" ? "5" : category === "APPAREL" ? "12" : "18"}%)`, value: -gstAmount },
    { label: "Net Revenue (ex-GST)", value: netRevenuePre, isSubtotal: true },
    { label: `Marketplace Commission (${effectiveCommission.commissionPercent}%)`, value: -commissionAmount },
    { label: "Closing Fee", value: -closingFee },
    { label: `Payment Gateway (${effectiveCommission.paymentFeePercent}%)`, value: -paymentFeeAmount },
    { label: "Landed Cost", value: -landedCost },
    { label: "Last-Mile Logistics", value: -logistics.forwardCost },
    { label: `Return Logistics (${returnRate}% return rate)`, value: -logistics.returnCost },
    { label: `Marketing (${marketingPercent}%)`, value: -marketingCost },
    { label: "Net Profit", value: profit, isTotal: true },
  ];

  return {
    sellingPrice,
    gst: gstAmount,
    netRevenue: netAfterFees,
    landedCost,
    marketplaceFees: totalDeduction,
    marketingCost,
    logisticsCost,
    returnCost: logistics.returnCost,
    totalCosts,
    profit,
    margin,
    breakEvenPrice,
    breakdown,
  };
}

// ─── Market Position ───────────────────────────────────────────────────────────

export function calculateMarketPosition(inputs: MarketInputs): MarketPositionResult {
  const { sellingPrice, competitorPrices } = inputs;
  if (!competitorPrices.length) {
    return {
      sellingPrice,
      competitorPrices: [],
      medianPrice: sellingPrice,
      averagePrice: sellingPrice,
      position: "AT",
      percentile: 50,
    };
  }

  const sorted = [...competitorPrices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianPrice = sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
  const averagePrice = sorted.reduce((s, p) => s + p, 0) / sorted.length;

  const belowCount = sorted.filter((p) => sellingPrice < p).length;
  const percentile = (belowCount / sorted.length) * 100;

  let position: "BELOW" | "AT" | "ABOVE" = "AT";
  if (sellingPrice < medianPrice * 0.9) position = "BELOW";
  else if (sellingPrice > medianPrice * 1.1) position = "ABOVE";

  return { sellingPrice, competitorPrices, medianPrice, averagePrice, position, percentile };
}

// ─── Verdict ──────────────────────────────────────────────────────────────────

export function getVerdict(
  margin: number,
  position: "BELOW" | "AT" | "ABOVE",
  category: string
): VerdictResult {
  const reasons: string[] = [];
  const recommendations: string[] = [];

  let score = 50;

  // Margin scoring
  if (margin >= 40) { score += 30; reasons.push("Strong margin above 40%"); }
  else if (margin >= 25) { score += 15; reasons.push("Adequate margin between 25-40%"); }
  else if (margin >= 15) { score += 5; reasons.push("Thin margin between 15-25%"); }
  else if (margin >= 0) { score -= 10; reasons.push("Very thin margin below 15%"); }
  else { score -= 30; reasons.push("Negative margin — product is loss-making at this price"); }

  // Position scoring
  if (position === "BELOW") {
    score += 20;
    reasons.push("Priced competitively below market median");
  } else if (position === "AT") {
    score += 10;
    reasons.push("Priced at market median");
  } else {
    score -= 10;
    reasons.push("Priced above market — premium positioning required");
    recommendations.push("Justify premium positioning with strong brand story or unique differentiation");
  }

  // Recommendations based on margin
  if (margin < 15) {
    recommendations.push("Negotiate better FOB price with supplier (target 15-20% reduction)");
    recommendations.push("Consider sea freight instead of air to reduce landed cost");
    recommendations.push("Explore FTA benefits if country of origin has preferential duty");
  }
  if (margin < 25) {
    recommendations.push("Reduce marketing spend in initial phase; focus on organic discovery");
    recommendations.push("Negotiate lower commission rate with marketplace (possible for new launches)");
  }
  if (margin >= 35) {
    recommendations.push("Strong margins enable aggressive marketing investment for faster market share");
    recommendations.push("Consider expanding to multiple marketplaces simultaneously");
  }

  const verdict = score >= 65 ? "GO" : score >= 40 ? "BORDERLINE" : "NO_GO";

  return { verdict, margin, position, reasons, recommendations, score: Math.max(0, Math.min(100, score)) };
}
