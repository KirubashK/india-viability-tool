export type FreightMode = "AIR" | "SEA";
export type CostType = "FOB" | "EXW";
export type Marketplace = "AMAZON" | "NYKAA" | "MYNTRA" | "FLIPKART" | "MEESHO";
export type Category = "BEAUTY" | "FOOD" | "APPAREL" | "FMCG" | "PET_CARE" | "ELECTRONICS" | "HOME";
export type Currency = "USD" | "EUR" | "GBP" | "AUD" | "JPY" | "CNY";
export type Verdict = "GO" | "BORDERLINE" | "NO_GO";
export type MarketPosition = "BELOW" | "AT" | "ABOVE";

export interface ProductDimensions {
  length: number; // cm
  width: number;  // cm
  height: number; // cm
}

export interface ProductMaster {
  id: string;
  productName: string;
  brand: string;
  category: Category;
  hsCode: string;
  countryOfOrigin: string;
  currency: Currency;
  fobPrice: number;
  weight: number; // kg
  dimensions: ProductDimensions;
  sellingPrice: number;
  marketplace: Marketplace;
}

export interface ValueChainInputs {
  // Cost basis
  costType: CostType;
  baseCost: number;           // the raw input cost (FOB or EXW, in foreign currency)
  currency: Currency;
  exchangeRate: number;
  // Product physical attributes (drive freight calculation)
  weight: number;             // kg per unit
  dimensions: ProductDimensions;
  // Freight
  freightMode: FreightMode;
  freightOverride?: number;   // manual per-unit INR override — skips engine
  // Insurance
  insurancePercent: number;
  // HS / origin
  hsCode: string;
  countryOfOrigin: string;
  // Origin cost override (EXW→FOB). Overrides the country-based auto %.
  // Set as a percentage of baseCostInr (e.g. 8 means 8%).
  originCostOverridePercent?: number;
  // Duty manual overrides
  bcdOverride?: number;
  swsOverride?: number;
  igstOverride?: number;
  // Legacy field kept for backward compat — populated by engine or override
  freightCost: number;
}

export type SellingPriceMode = "KNOWN" | "RECOMMEND";

export interface UnitEconomicsInputs {
  sellingPrice: number;
  marketplace: Marketplace;
  category: Category;
  weight: number;
  dimensions: ProductDimensions;
  landedCost: number;
  marketingPercent: number;
  returnRate: number;
  // Selling price mode: KNOWN = user inputs price, RECOMMEND = calc from target margin
  sellingPriceMode: SellingPriceMode;
  targetMarginPercent?: number;  // used when sellingPriceMode = "RECOMMEND"
  // Manual overrides
  commissionOverride?: number;
  logisticsOverride?: number;
}

export interface MarketInputs {
  sellingPrice: number;
  competitorPrices: number[];
}

export interface DutyRates {
  bcd: number;
  sws: number;
  igst: number;
  preferentialDuty: number | null;
  isPreferential: boolean;
}

export interface CategoryDefaults {
  commissionPercent: number;
  returnRate: number;
  marketingPercent: number;
  logisticsPerUnit: number;
  marginTarget: number;
  priceBand: { min: number; max: number };
}
