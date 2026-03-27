import { Verdict, MarketPosition, Category, FreightMode } from "./product";

export interface CostBreakdownItem {
  label: string;
  value: number;
  percent?: number;
  isSubtotal?: boolean;
  isTotal?: boolean;
}

export interface FreightEngineResult {
  freightPerUnit: number;
  mode: FreightMode;
  // SEA-specific (chargeable weight model, divisor = 6000)
  seaVolumetricWeight?: number;
  seaChargeableWeight?: number;
  seaRatePerKg?: number;
  // SEA shipping type
  seaShippingType?: "FCL" | "LCL";
  // SEA FCL context (informational — shown in advanced breakdown)
  unitsPerContainer?: number;
  containerCost?: number;
  portClearancePerUnit?: number;
  // SEA LCL context
  lclUnitVolumeCbm?: number;
  lclFreightUSD?: number;
  // AIR-specific (slab-based pricing, divisor = 5000)
  volumetricWeight?: number;
  chargeableWeight?: number;
  ratePerKg?: number;     // effective slab rate used
  handlingPerUnit?: number;
  // shared
  isOverridden: boolean;
  tooltip: string;
}

export interface OriginCostResult {
  fobValueInr: number;
  originCost: number;           // INR added for EXW→FOB
  originCostPercent: number;
  baseCostInr: number;
}

export interface LandedCostResult {
  // Origin
  originCostResult: OriginCostResult;
  fobInr: number;
  // Freight
  freightEngineResult: FreightEngineResult;
  freightPerUnit: number;
  // CIF + duty
  cif: number;
  bcdAmount: number;
  swsAmount: number;
  igstAmount: number;
  totalDuty: number;
  totalLandedCost: number;
  perUnitLandedCost: number;
  // IGST split — use for margin calculations when ITC is claimable
  // landedCostExclGst = CIF + BCD + SWS (IGST excluded — recoverable via ITC)
  // landedCostInclGst = CIF + BCD + SWS + IGST (full duty-paid cost)
  landedCostExclGst: number;
  landedCostInclGst: number;
  breakdown: CostBreakdownItem[];
  effectiveDutyRate: number;
}

export interface MarketplaceFees {
  marketplace: string;
  commissionPercent: number;
  closingFee: number;
  paymentFeePercent: number;
  totalFeePercent: number;
}

export interface UnitEconomicsResult {
  sellingPrice: number;           // effective selling price used (may be computed in RECOMMEND mode)
  recommendedSellingPrice: number | null; // non-null only when mode = RECOMMEND
  gst: number;
  netRevenue: number;
  landedCost: number;
  marketplaceFees: number;
  marketingCost: number;
  logisticsCost: number;
  returnCost: number;
  totalCosts: number;
  /** Net profit per unit (INR) */
  netProfit: number;
  /** Net margin as a percentage of selling price */
  marginPercent: number;
  /** Price at which profit = 0; null if cost structure is inverted */
  breakEvenPrice: number | null;
  breakdown: CostBreakdownItem[];
}

export interface MarketPositionResult {
  sellingPrice: number;
  competitorPrices: number[];
  medianPrice: number;
  averagePrice: number;
  position: MarketPosition;
  percentile: number;
}

export interface VerdictResult {
  verdict: Verdict;
  marginPercent: number;
  position: MarketPosition;
  reasons: string[];
  recommendations: string[];
  score: number;
}

export interface FullAnalysisResult {
  landedCost: LandedCostResult;
  unitEconomics: UnitEconomicsResult;
  marketPosition: MarketPositionResult | null;
  verdict: VerdictResult;
  exportData: Record<string, string | number>;
}

// ── Bulk processing ────────────────────────────────────────────────────────────

export interface BulkRow {
  productName: string;
  hsCode: string;
  costType: "FOB" | "EXW";
  baseCost: number;
  currency: string;
  countryOfOrigin: string;
  length: number;
  width: number;
  height: number;
  weight: number;
  sellingPrice: number;
  category: Category;
  marketplace?: string;
}

export interface BulkResult {
  row: BulkRow;
  landedCost: number;
  freightPerUnit: number;
  totalDuty: number;
  netProfit: number;
  marginPercent: number;
  verdict: Verdict;
  score: number;
  error?: string;
}

// ── Saved analyses ─────────────────────────────────────────────────────────────

export interface SavedAnalysis {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  landedCost: LandedCostResult;
  unitEconomics: UnitEconomicsResult;
  verdict: VerdictResult;
  productName: string;
  hsCode: string;
  category: Category;
  sellingPrice: number;
  marketplace: string;
  countryOfOrigin: string;
}

