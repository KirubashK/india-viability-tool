import { OriginCostResult } from "@/types/calculation";

// Conservative origin cost % by country group.
// Covers inland transport, export docs, agent fees, local handling.
const ORIGIN_COST_RATES: Record<string, number> = {
  CHN: 0.06,  // China — short inland, efficient export infrastructure
  KOR: 0.05,  // South Korea
  JPN: 0.05,  // Japan
  AUS: 0.075, // Australia
  NZL: 0.075,
  ARE: 0.04,  // UAE — free-zone advantage
  MRU: 0.04,
  USA: 0.085, // USA — higher domestic transport costs
  CAN: 0.085,
  GBR: 0.08,  // Europe
  DEU: 0.08,
  FRA: 0.08,
  ITA: 0.08,
  NLD: 0.08,
  ESP: 0.08,
  CHE: 0.08,
  SGP: 0.045, // Singapore — efficient port, low handling
  MYS: 0.055,
  THA: 0.055,
  VNM: 0.06,
  IDN: 0.065,
  PHL: 0.065,
};

const DEFAULT_ORIGIN_COST_RATE = 0.08;

/**
 * Returns the origin cost percentage (EXW → FOB adjustment) for a country.
 */
export function getOriginCostPercent(countryCode: string): number {
  return ORIGIN_COST_RATES[countryCode] ?? DEFAULT_ORIGIN_COST_RATE;
}

/**
 * Converts an EXW base cost (in INR) to FOB by applying the origin cost %.
 * If costType is "FOB", originCost = 0 and fobValueInr = baseCostInr.
 * If overridePercent is provided (as a percentage, e.g. 6 = 6%), it takes
 * precedence over the country-based default.
 */
export function resolveOriginCost(
  baseCostInr: number,
  costType: "FOB" | "EXW",
  countryCode: string,
  overridePercent?: number
): OriginCostResult {
  if (costType === "FOB") {
    return {
      fobValueInr: baseCostInr,
      originCost: 0,
      originCostPercent: 0,
      baseCostInr,
    };
  }

  // Use override if provided (convert from percentage to decimal), else country default
  const originCostPercent =
    overridePercent !== undefined && overridePercent >= 0
      ? overridePercent / 100
      : getOriginCostPercent(countryCode);

  const originCost = baseCostInr * originCostPercent;

  return {
    fobValueInr: baseCostInr + originCost,
    originCost,
    originCostPercent,
    baseCostInr,
  };
}
