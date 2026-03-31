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
  // Use the user-editable exchange rate stored in inputs (ValueChainForm keeps it in sync).
  // Fall back to the static table only if somehow missing.
  const rate = inputs.exchangeRate > 0 ? inputs.exchangeRate : (EXCHANGE_RATES[inputs.currency] ?? 83.5);
  const baseCostInr = (inputs.baseCost ?? inputs.fobPrice ?? 0) * rate;

  // 1. EXW → FOB conversion
  const originCostResult = resolveOriginCost(
    baseCostInr,
    inputs.costType ?? "FOB",
    inputs.countryOfOrigin,
    inputs.originCostOverridePercent
  );
  const fobInr = originCostResult.fobValueInr;

  // 2. Import freight per unit
  const dims = inputs.dimensions ?? { length: 10, width: 8, height: 5 };
  const weight = inputs.weight ?? 0.3;
  // Container/LCL costs are priced in USD — always use the USD→INR rate regardless of
  // the user's invoicing currency. If user currency IS USD, use their editable rate
  // directly. Otherwise use the static USD rate from the table.
  const usdToInr = inputs.currency === "USD"
    ? (inputs.exchangeRate > 0 ? inputs.exchangeRate : (EXCHANGE_RATES["USD"] ?? 83.5))
    : (EXCHANGE_RATES["USD"] ?? 83.5);

  const freightEngineResult = getImportFreightPerUnit(
    inputs.freightMode ?? "AIR",
    inputs.seaShippingType ?? "FCL",
    inputs.countryOfOrigin,
    weight,
    dims,
    usdToInr,
    inputs.freightOverride
  );
  const freightPerUnit = freightEngineResult.freightPerUnit;

  // 3. Duty rates — user overrides always take precedence over auto-detected rates.
  // IMPORTANT: form fields with { valueAsNumber: true } produce NaN (not undefined) when
  // left empty. Use isNaN guards instead of relying on !== undefined alone.
  const baseDutyRates: DutyRates = getDutyRates(inputs.hsCode, inputs.countryOfOrigin);

  const hasValidBcdOverride = inputs.bcdOverride !== undefined && !isNaN(inputs.bcdOverride);
  const hasValidSwsOverride = inputs.swsOverride !== undefined && !isNaN(inputs.swsOverride);
  const hasValidIgstOverride = inputs.igstOverride !== undefined && !isNaN(inputs.igstOverride);

  const dutyRates: DutyRates = {
    ...baseDutyRates,
    ...(hasValidBcdOverride && { bcd: inputs.bcdOverride! }),
    ...(hasValidSwsOverride && { sws: inputs.swsOverride! }),
    ...(hasValidIgstOverride && { igst: inputs.igstOverride! }),
  };

  // BCD: user override ALWAYS wins. If no override, use dutyRates.bcd directly.
  // FTA preferential duty is NOT applied here — it would mismatch the UI "Auto: X%" display.
  const effectiveBcd = hasValidBcdOverride ? inputs.bcdOverride! : dutyRates.bcd;

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

  // IGST split: exclGst = CIF + BCD + SWS (IGST excluded — recoverable via ITC on marketplace sales)
  //             inclGst = full duty-paid cost (CIF + all duties including IGST)
  const landedCostExclGst = core.cif + core.bcd + core.sws;
  const landedCostInclGst = core.landedCost; // = CIF + BCD + SWS + IGST

  // ── Debug trace (remove before production) ──────────────────────────────
  if (process.env.NODE_ENV === "development") {
    console.log("[calculateLandedCost]", {
      currency: inputs.currency,
      exchangeRate: rate,
      baseCost: inputs.baseCost ?? inputs.fobPrice,
      baseCostInr: Math.round(baseCostInr),
      costType: inputs.costType,
      originCostPercent: (originCostResult.originCostPercent * 100).toFixed(1) + "%",
      originCost: Math.round(originCostResult.originCost),
      fobInr: Math.round(fobInr),
      freight: Math.round(freightPerUnit),
      insurancePct,
      cif: Math.round(core.cif),
      effectiveBcd: effectiveBcd + "%",
      bcd: Math.round(core.bcd),
      sws: Math.round(core.sws),
      igst: Math.round(core.igst),
      totalDuty: Math.round(core.totalDuty),
      landedCost: Math.round(core.landedCost),
    });
  }

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
    landedCostExclGst,
    landedCostInclGst,
    effectiveDutyRate,
    breakdown,
  };
}

// ─── Unit Economics ────────────────────────────────────────────────────────────

/**
 * Derive the MRP required to achieve a target net margin.
 *
 * Margin is defined as: netProfit / netRevenue (ex-GST)
 *
 * Key: marketing cost is calculated on MRP (Indian convention),
 * not on netRevenue. So the effective marketing drain on netRevenue
 * must be scaled by the GST multiplier.
 *
 * Derivation:
 *   let nR = netRevenue = mrp / (1 + gstRate)
 *   netProfit = nR - nR*commRate - nR*payRate - mrp*mktRate - fixedCosts
 *             = nR * (1 - commRate - payRate - (1+gstRate)*mktRate) - fixedCosts
 *   margin    = netProfit / nR
 *             = (1 - commRate - payRate - (1+gstRate)*mktRate) - fixedCosts/nR
 *
 *   Solving for nR:
 *   nR = fixedCosts / ((1 - commRate - payRate - (1+gstRate)*mktRate) - targetMargin)
 *   mrp = nR * (1 + gstRate)
 */
function deriveSellingPrice(
  targetMarginPercent: number,
  gstRate: number,           // as percentage (e.g. 18)
  commissionPercent: number,
  paymentFeePercent: number,
  marketingPercent: number,
  logisticsCost: number,
  landedCost: number
): number | null {
  // Guard: empty field + valueAsNumber:true gives NaN, not undefined
  if (!targetMarginPercent || isNaN(targetMarginPercent) || targetMarginPercent <= 0) return null;

  const targetMargin = targetMarginPercent / 100;
  const commRate = commissionPercent / 100;
  const payRate = paymentFeePercent / 100;
  const mktRate = marketingPercent / 100;
  const gstMult = 1 + gstRate / 100;

  // Marketing is on MRP, so its effective rate vs netRevenue is mktRate * gstMult
  const denominator = (1 - commRate - payRate - mktRate * gstMult) - targetMargin;
  if (denominator <= 0) return null; // target margin is unachievable with these inputs

  const fixedCosts = logisticsCost + landedCost;
  const netRevenue = fixedCosts / denominator;
  const mrp = netRevenue * gstMult;
  return Math.ceil(mrp); // round up to nearest whole rupee
}

export function calculateUnitEconomics(inputs: UnitEconomicsInputs): UnitEconomicsResult {
  const { marketplace, category, weight, landedCost, marketingPercent, returnRate } = inputs;

  const gstRate = inputs.outputGstPercent !== undefined && !isNaN(inputs.outputGstPercent)
    ? inputs.outputGstPercent
    : getOutputGstRate(category);

  const fees = getMarketplaceFees(marketplace, category);

  // IMPORTANT: form fields with { valueAsNumber: true } produce NaN (not undefined) on empty
  // input. Using NaN as commissionPercent passes the !== undefined check but then safe() in
  // coreCalculations silently converts it to 0, making the commission appear as 0%.
  // Fix: check !isNaN before using any optional numeric override.
  const hasValidCommOverride = inputs.commissionOverride !== undefined && !isNaN(inputs.commissionOverride);
  const hasValidPaymentOverride = inputs.paymentFeeOverride !== undefined && !isNaN(inputs.paymentFeeOverride);
  const hasValidClosingOverride = inputs.closingFeeOverride !== undefined && !isNaN(inputs.closingFeeOverride);

  // Build effective commission: each field falls back to auto when override is absent or NaN
  const effectiveCommissionPercent = hasValidCommOverride ? inputs.commissionOverride! : fees.commissionPercent;
  const effectivePaymentFeePercent = hasValidPaymentOverride ? inputs.paymentFeeOverride! : fees.paymentFeePercent;
  const effectiveClosingFee = hasValidClosingOverride ? inputs.closingFeeOverride! : fees.closingFee;

  const effectiveCommission = {
    ...fees,
    commissionPercent: effectiveCommissionPercent,
    paymentFeePercent: effectivePaymentFeePercent,
    closingFee: effectiveClosingFee,
    totalFeePercent: effectiveCommissionPercent + effectivePaymentFeePercent,
  };

  const logistics = calculateLastMileLogistics(weight, returnRate);
  const hasValidLogisticsOverride = inputs.logisticsOverride !== undefined && !isNaN(inputs.logisticsOverride);
  // Override applies ONLY to the forward last-mile cost. Return cost is always added.
  // 0 is a valid override (e.g. seller-fulfilled with no delivery charge).
  const forwardLastMile = hasValidLogisticsOverride ? inputs.logisticsOverride! : logistics.forwardCost;
  const logisticsCost = forwardLastMile + logistics.returnCost;

  // ── Selling price: KNOWN or RECOMMEND ──────────────────────────────────────
  // IMPORTANT: in RECOMMEND mode always start at 0 — never inherit the previous
  // KNOWN price. If deriveSellingPrice() returns null the safety guard below must
  // fire; that only happens when sellingPrice is still 0 after the derive attempt.
  let sellingPrice = inputs.sellingPriceMode === "RECOMMEND"
    ? 0
    : (inputs.sellingPrice || 0);
  let recommendedSellingPrice: number | null = null;

  if (inputs.sellingPriceMode === "RECOMMEND"
    && inputs.targetMarginPercent !== undefined
    && !isNaN(inputs.targetMarginPercent)) {
    const derived = deriveSellingPrice(
      inputs.targetMarginPercent,
      gstRate,
      effectiveCommission.commissionPercent,
      effectiveCommission.paymentFeePercent,
      marketingPercent,
      logisticsCost,
      landedCost
    );
    if (derived !== null) {
      recommendedSellingPrice = derived;
      sellingPrice = derived;
    }
  }

  // Guard: if selling price is still zero or invalid (e.g. RECOMMEND with impossible target),
  // return safe zero-profit defaults rather than letting NaN propagate everywhere.
  if (!(sellingPrice > 0)) {
    return {
      sellingPrice: 0, recommendedSellingPrice,
      gst: 0, netRevenue: 0, landedCost,
      marketplaceFees: 0, marketingCost: 0, logisticsCost,
      returnCost: logistics.returnCost,
      totalCosts: landedCost + logisticsCost,
      netProfit: -(landedCost + logisticsCost),
      marginPercent: 0, breakEvenPrice: null, breakdown: [],
    };
  }

  // ── P&L from resolved sellingPrice ─────────────────────────────────────────
  const { basePrice: netRevenuePre, gstAmount } = deconstructGst(sellingPrice, category);

  const { commissionAmount, closingFee, paymentFeeAmount, totalDeduction, netAfterFees } =
    calculateMarketplaceDeduction(netRevenuePre, effectiveCommission);

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
  const fixedCosts = landedCost + logisticsCost + effectiveCommission.closingFee;

  // Break-even: the MRP at which netProfit = 0.
  // variableCostPercent captures all variable drains (commission + payment + marketing) as
  // a fraction of netRevenue. Fixed costs are recovered when:
  //   netRevenue * (1 - variableCostPercent) = fixedCosts
  //   netRevenue = fixedCosts / (1 - variableCostPercent)
  //   mrp = netRevenue * (1 + gstRate/100)
  // Expressed directly as MRP:
  const variableCostPercent = effectiveCommission.commissionPercent + effectiveCommission.paymentFeePercent + marketingPercent;
  const breakEvenDenom = 1 - variableCostPercent / 100;
  const breakEvenPrice: number | null = breakEvenDenom > 0
    ? Math.ceil((fixedCosts / breakEvenDenom) * (1 + gstRate / 100))
    : null;

  const breakdown: CostBreakdownItem[] = [
    { label: "MRP / Selling Price", value: sellingPrice },
    { label: `GST Deducted (${gstRate}%)`, value: -gstAmount },
    { label: "Net Revenue (ex-GST)", value: netRevenuePre, isSubtotal: true },
    { label: `Marketplace Commission (${effectiveCommission.commissionPercent}%)`, value: -commissionAmount },
    { label: "Closing Fee", value: -closingFee },
    { label: `Payment Gateway (${effectiveCommission.paymentFeePercent}%)`, value: -paymentFeeAmount },
    { label: "Landed Cost", value: -landedCost },
    { label: "Last-Mile Logistics", value: -forwardLastMile },
    { label: `Return Logistics (${returnRate}% return rate)`, value: -logistics.returnCost },
    { label: `Marketing (${marketingPercent}%)`, value: -marketingCost },
    { label: "Net Profit", value: core.netProfit, isTotal: true },
  ];

  return {
    sellingPrice,
    recommendedSellingPrice,
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
