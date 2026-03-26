import { ValueChainInputs, UnitEconomicsInputs, MarketInputs, DutyRates } from "@/types/product";
import {
  LandedCostResult, UnitEconomicsResult, MarketPositionResult,
  VerdictResult, CostBreakdownItem,
} from "@/types/calculation";
import {
  calculateLandedCostCore, calculateUnitEconomics as calculateUnitEconomicsCore,
  LandedCostInput, UnitEconomicsInput,
} from "./coreCalculations";
import { getDutyRates } from "./dutyEngine";
import { getMarketplaceFees, calculateMarketplaceDeduction, calculateMarketingCost } from "./commissionEngine";
import { calculateLastMileLogistics, getImportFreightPerUnit } from "./logisticsEngine";
import { resolveOriginCost } from "./originCostEngine";
import { deconstructGst, getOutputGstRate } from "./gstEngine";
import { EXCHANGE_RATES } from "@/data/benchmarks";

// ─── Landed Cost ───────────────────────────────────────────────────────────────

export function calculateLandedCost(inputs: ValueChainInputs): LandedCostResult {
  const rate = EXCHANGE_RATES[inputs.currency] ?? 83.5;
  const baseCostInr = (inputs.baseCost ?? inputs.fobPrice ?? 0) * rate;

  // 1. EXW → FOB conversion
  const originCostResult = resolveOriginCost(
    baseCostInr,
    inputs.costType ?? "FOB",
    inputs.countryOfOrigin
  );
  const fobInr = originCostResult.fobValueInr;

  // 2. Import freight per unit (FCL sea or volumetric air)
  const dims = inputs.dimensions ?? { length: 10, width: 8, height: 5 };
  const weight = inputs.weight ?? 0.3;
  const usdRate = EXCHANGE_RATES["USD"] ?? 83.5;

  const freightEngineResult = getImportFreightPerUnit(
    inputs.freightMode ?? "AIR",
    inputs.countryOfOrigin,
    weight,
    dims,
    usdRate,
    inputs.freightOverride
  );
  const freightPerUnit = freightEngineResult.freightPerUnit;

  // 3. Duty rates with overrides
  let dutyRates: DutyRates = getDutyRates(inputs.hsCode, inputs.countryOfOrigin);
  if (inputs.bcdOverride !== undefined) dutyRates = { ...dutyRates, bcd: inputs.bcdOverride };
  if (inputs.swsOverride !== undefined) dutyRates = { ...dutyRates, sws: inputs.swsOverride };
  if (inputs.igstOverride !== undefined) dutyRates = { ...dutyRates, igst: inputs.igstOverride };

  const effectiveBcd =
    dutyRates.isPreferential && dutyRates.preferentialDuty !== null
      ? dutyRates.preferentialDuty
      : dutyRates.bcd;

  // 4. CIF and duty cascade via core (NaN-safe arithmetic)
  const insurancePct = inputs.insurancePercent ?? 0.5;
  const coreInput: LandedCostInput = {
    costBasis: "FOB",
    baseCost: fobInr,
    freight: freightPerUnit,
    insurancePercent: insurancePct,
    bcdPercent: effectiveBcd,
    swsPercent: dutyRates.sws,
    igstPercent: dutyRates.igst,
  };

  const core = calculateLandedCostCore(coreInput);
  const effectiveDutyRate = core.cif > 0 ? (core.totalDuty / core.cif) * 100 : 0;

  // 5. Build breakdown — prepend origin cost if EXW
  const originRows: CostBreakdownItem[] = originCostResult.originCost > 0
    ? [{ label: `Origin cost (EXW → FOB, ${(originCostResult.originCostPercent * 100).toFixed(0)}%)`, value: originCostResult.originCost }]
    : [];

  const breakdown: CostBreakdownItem[] = [
    { label: `Base cost (${inputs.currency} ${inputs.baseCost ?? inputs.fobPrice ?? 0})`, value: baseCostInr },
    ...originRows,
    { label: "FOB value (INR)", value: fobInr, isSubtotal: true },
    { label: `Freight (${inputs.freightMode ?? "AIR"})`, value: freightPerUnit },
    { label: `Insurance (${insurancePct}%)`, value: core.cif - fobInr - freightPerUnit },
    { label: "CIF value", value: core.cif, isSubtotal: true },
    { label: `BCD @ ${effectiveBcd}%`, value: core.bcd },
    { label: `SWS @ ${dutyRates.sws}% of BCD`, value: core.sws },
    { label: `IGST @ ${dutyRates.igst}%`, value: core.igst },
    { label: "Total duty", value: core.totalDuty, isSubtotal: true },
    { label: "Total landed cost", value: core.landedCost, isTotal: true },
  ];

  return {
    originCostResult,
    fobInr,
    freightEngineResult,
    freightPerUnit,
    cif: core.cif,
    bcdAmount: core.bcd,
    swsAmount: core.sws,
    igstAmount: core.igst,
    totalDuty: core.totalDuty,
    totalLandedCost: core.landedCost,
    perUnitLandedCost: core.landedCost,
    effectiveDutyRate,
    breakdown,
  };
}

// ─── Unit Economics ────────────────────────────────────────────────────────────

export function calculateUnitEconomics(inputs: UnitEconomicsInputs): UnitEconomicsResult {
  const { sellingPrice, marketplace, category, weight, landedCost, marketingPercent, returnRate } = inputs;

  const gstRate = getOutputGstRate(category);
  const { basePrice: netRevenuePre, gstAmount } = deconstructGst(sellingPrice, category);

  const fees = getMarketplaceFees(marketplace, category);
  const effectiveCommission =
    inputs.commissionOverride !== undefined
      ? { ...fees, commissionPercent: inputs.commissionOverride, totalFeePercent: inputs.commissionOverride + fees.paymentFeePercent }
      : fees;

  const { commissionAmount, closingFee, paymentFeeAmount, totalDeduction, netAfterFees } =
    calculateMarketplaceDeduction(netRevenuePre, effectiveCommission);

  const logistics = calculateLastMileLogistics(weight, returnRate);
  const logisticsCost =
    inputs.logisticsOverride !== undefined
      ? inputs.logisticsOverride + logistics.returnCost
      : logistics.netLogisticsCost;

  const marketingCost = calculateMarketingCost(sellingPrice, marketingPercent);

  const coreInput: UnitEconomicsInput = {
    mrp: sellingPrice,
    gstPercent: gstRate,
    marketplaceCommissionPercent: effectiveCommission.commissionPercent,
    paymentFeePercent: effectiveCommission.paymentFeePercent,
    logisticsCost: logisticsCost + closingFee + marketingCost + landedCost,
    marketingPercent: 0,
    landedCost: 0,
  };
  const core = calculateUnitEconomicsCore(coreInput);

  const totalVariableCostRate =
    (effectiveCommission.commissionPercent + effectiveCommission.paymentFeePercent + marketingPercent) / 100;
  const fixedCosts = landedCost + logisticsCost + closingFee;
  const beDenominator = 1 - totalVariableCostRate - gstAmount / sellingPrice;
  const breakEvenPrice: number | null = beDenominator > 0 ? fixedCosts / beDenominator : null;

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
    { label: "Net Profit", value: core.netProfit, isTotal: true },
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
    totalCosts: core.totalCosts,
    netProfit: core.netProfit,
    marginPercent: core.marginPercent,
    breakEvenPrice,
    breakdown,
  };
}

// ─── Market Position ───────────────────────────────────────────────────────────

export function calculateMarketPosition(inputs: MarketInputs): MarketPositionResult {
  const { sellingPrice, competitorPrices } = inputs;
  if (!competitorPrices.length) {
    return { sellingPrice, competitorPrices: [], medianPrice: sellingPrice, averagePrice: sellingPrice, position: "AT", percentile: 50 };
  }
  const sorted = [...competitorPrices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianPrice = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
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
  marginPercent: number,
  position: "BELOW" | "AT" | "ABOVE",
  category: string
): VerdictResult {
  const reasons: string[] = [];
  const recommendations: string[] = [];
  let score = 50;

  if (marginPercent >= 40) { score += 30; reasons.push("Strong margin above 40%"); }
  else if (marginPercent >= 25) { score += 15; reasons.push("Adequate margin between 25-40%"); }
  else if (marginPercent >= 15) { score += 5; reasons.push("Thin margin between 15-25%"); }
  else if (marginPercent >= 0) { score -= 10; reasons.push("Very thin margin below 15%"); }
  else { score -= 30; reasons.push("Negative margin — product is loss-making at this price"); }

  if (position === "BELOW") { score += 20; reasons.push("Priced competitively below market median"); }
  else if (position === "AT") { score += 10; reasons.push("Priced at market median"); }
  else { score -= 10; reasons.push("Priced above market — premium positioning required"); recommendations.push("Justify premium with strong brand story or unique differentiation"); }

  if (marginPercent < 15) {
    recommendations.push("Negotiate better FOB price with supplier (target 15-20% reduction)");
    recommendations.push("Consider sea freight for heavy/bulky SKUs to reduce freight per unit");
    recommendations.push("Explore FTA routing — Singapore, UAE, South Korea offer near-zero BCD");
  }
  if (marginPercent < 25) {
    recommendations.push("Reduce marketing spend in initial phase; focus on organic discovery");
    recommendations.push("Negotiate lower commission rate with marketplace for new launches");
  }
  if (marginPercent >= 35) {
    recommendations.push("Strong margins support aggressive marketing and multi-marketplace expansion");
  }

  const verdict = score >= 65 ? "GO" : score >= 40 ? "BORDERLINE" : "NO_GO";
  return { verdict, marginPercent, position, reasons, recommendations, score: Math.max(0, Math.min(100, score)) };
}
