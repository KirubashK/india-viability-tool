import { Category } from "@/types/product";

export interface Benchmark {
  category: Category;
  avgMargin: number;
  topQuartileMargin: number;
  avgLandedCostRatio: number; // landed cost as % of selling price
  avgMarketingSpend: number;
  successfulMarginFloor: number;
}

export const BENCHMARKS: Record<Category, Benchmark> = {
  BEAUTY: {
    category: "BEAUTY",
    avgMargin: 38,
    topQuartileMargin: 52,
    avgLandedCostRatio: 28,
    avgMarketingSpend: 18,
    successfulMarginFloor: 30,
  },
  FOOD: {
    category: "FOOD",
    avgMargin: 22,
    topQuartileMargin: 35,
    avgLandedCostRatio: 38,
    avgMarketingSpend: 10,
    successfulMarginFloor: 18,
  },
  APPAREL: {
    category: "APPAREL",
    avgMargin: 35,
    topQuartileMargin: 48,
    avgLandedCostRatio: 22,
    avgMarketingSpend: 20,
    successfulMarginFloor: 28,
  },
  FMCG: {
    category: "FMCG",
    avgMargin: 18,
    topQuartileMargin: 28,
    avgLandedCostRatio: 42,
    avgMarketingSpend: 8,
    successfulMarginFloor: 15,
  },
  PET_CARE: {
    category: "PET_CARE",
    avgMargin: 30,
    topQuartileMargin: 44,
    avgLandedCostRatio: 32,
    avgMarketingSpend: 14,
    successfulMarginFloor: 25,
  },
  ELECTRONICS: {
    category: "ELECTRONICS",
    avgMargin: 15,
    topQuartileMargin: 24,
    avgLandedCostRatio: 55,
    avgMarketingSpend: 12,
    successfulMarginFloor: 12,
  },
  HOME: {
    category: "HOME",
    avgMargin: 28,
    topQuartileMargin: 40,
    avgLandedCostRatio: 35,
    avgMarketingSpend: 12,
    successfulMarginFloor: 22,
  },
};

export const EXCHANGE_RATES: Record<string, number> = {
  USD: 83.5,
  EUR: 89.2,
  GBP: 104.8,
  AUD: 54.3,
  JPY: 0.56,
  CNY: 11.5,
  RUB: 0.92,
  SGD: 61.8,
  AED: 22.7,
  GBP2: 104.8,
  CHF: 95.2,
  CAD: 61.4,
  NZD: 50.1,
};
