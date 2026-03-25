export type FreightMode = "AIR" | "SEA";
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
  fobPrice: number;
  currency: Currency;
  exchangeRate: number;
  freightMode: FreightMode;
  freightCost: number;
  insurancePercent: number;
  hsCode: string;
  countryOfOrigin: string;
  // Manual overrides
  bcdOverride?: number;
  swsOverride?: number;
  igstOverride?: number;
}

export interface UnitEconomicsInputs {
  sellingPrice: number;
  marketplace: Marketplace;
  category: Category;
  weight: number;
  dimensions: ProductDimensions;
  landedCost: number;
  marketingPercent: number;
  returnRate: number;
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
