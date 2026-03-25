import { Verdict, MarketPosition } from "./product";

export interface CostBreakdownItem {
  label: string;
  value: number;
  percent?: number;
  isSubtotal?: boolean;
  isTotal?: boolean;
}

export interface LandedCostResult {
  cif: number;
  bcdAmount: number;
  swsAmount: number;
  igstAmount: number;
  totalDuty: number;
  totalLandedCost: number;
  perUnitLandedCost: number;
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
  sellingPrice: number;
  gst: number;
  netRevenue: number;
  landedCost: number;
  marketplaceFees: number;
  marketingCost: number;
  logisticsCost: number;
  returnCost: number;
  totalCosts: number;
  profit: number;
  margin: number;
  breakEvenPrice: number;
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
  margin: number;
  position: MarketPosition;
  reasons: string[];
  recommendations: string[];
  score: number; // 0-100
}

export interface FullAnalysisResult {
  landedCost: LandedCostResult;
  unitEconomics: UnitEconomicsResult;
  marketPosition: MarketPositionResult | null;
  verdict: VerdictResult;
  exportData: Record<string, string | number>;
}
