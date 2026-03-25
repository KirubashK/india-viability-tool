import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
  ProductMaster,
  ValueChainInputs,
  UnitEconomicsInputs,
  Category,
  Marketplace,
  Currency,
  FreightMode,
} from "@/types/product";
import {
  LandedCostResult,
  UnitEconomicsResult,
  MarketPositionResult,
  VerdictResult,
} from "@/types/calculation";
import { CATEGORY_DEFAULTS } from "@/data/categories";
import { EXCHANGE_RATES } from "@/data/benchmarks";

interface ProductState {
  // Product master
  product: ProductMaster;
  // Value chain inputs
  valueChain: ValueChainInputs;
  // Unit economics inputs
  unitEconomics: UnitEconomicsInputs;
  // Competitor prices
  competitorPrices: number[];
  // Computed results (null until calculated)
  landedCostResult: LandedCostResult | null;
  unitEconomicsResult: UnitEconomicsResult | null;
  marketPositionResult: MarketPositionResult | null;
  verdictResult: VerdictResult | null;
  // UI state
  isCalculating: boolean;
  hasCalculated: boolean;
}

interface ProductActions {
  setProduct: (updates: Partial<ProductMaster>) => void;
  setCategory: (category: Category) => void;
  setMarketplace: (marketplace: Marketplace) => void;
  setValueChain: (updates: Partial<ValueChainInputs>) => void;
  setUnitEconomics: (updates: Partial<UnitEconomicsInputs>) => void;
  setCompetitorPrices: (prices: number[]) => void;
  setResults: (results: {
    landed: LandedCostResult;
    unitEcon: UnitEconomicsResult;
    market: MarketPositionResult | null;
    verdict: VerdictResult;
  }) => void;
  setIsCalculating: (v: boolean) => void;
  resetOverrides: () => void;
}

const defaultProduct: ProductMaster = {
  id: "new",
  productName: "",
  brand: "",
  category: "BEAUTY",
  hsCode: "3304",
  countryOfOrigin: "USA",
  currency: "USD",
  fobPrice: 10,
  weight: 0.3,
  dimensions: { length: 10, width: 8, height: 5 },
  sellingPrice: 1499,
  marketplace: "AMAZON",
};

const defaultValueChain: ValueChainInputs = {
  fobPrice: 10,
  currency: "USD",
  exchangeRate: EXCHANGE_RATES["USD"],
  freightMode: "AIR",
  freightCost: 5000,
  insurancePercent: 0.5,
  hsCode: "3304",
  countryOfOrigin: "USA",
};

const defaultUnitEcon = (category: Category): UnitEconomicsInputs => {
  const defaults = CATEGORY_DEFAULTS[category];
  return {
    sellingPrice: 1499,
    marketplace: "AMAZON",
    category,
    weight: 0.3,
    dimensions: { length: 10, width: 8, height: 5 },
    landedCost: 0,
    marketingPercent: defaults.marketingPercent,
    returnRate: defaults.returnRate,
  };
};

export const useProductStore = create<ProductState & ProductActions>()(
  immer((set) => ({
    product: defaultProduct,
    valueChain: defaultValueChain,
    unitEconomics: defaultUnitEcon("BEAUTY"),
    competitorPrices: [],
    landedCostResult: null,
    unitEconomicsResult: null,
    marketPositionResult: null,
    verdictResult: null,
    isCalculating: false,
    hasCalculated: false,

    setProduct: (updates) =>
      set((state) => {
        Object.assign(state.product, updates);
        // Sync relevant fields to value chain and unit econ
        if (updates.fobPrice !== undefined) state.valueChain.fobPrice = updates.fobPrice;
        if (updates.currency !== undefined) {
          state.valueChain.currency = updates.currency;
          state.valueChain.exchangeRate = EXCHANGE_RATES[updates.currency] ?? 83.5;
        }
        if (updates.hsCode !== undefined) state.valueChain.hsCode = updates.hsCode;
        if (updates.countryOfOrigin !== undefined) state.valueChain.countryOfOrigin = updates.countryOfOrigin;
        if (updates.sellingPrice !== undefined) state.unitEconomics.sellingPrice = updates.sellingPrice;
        if (updates.weight !== undefined) state.unitEconomics.weight = updates.weight;
        if (updates.dimensions !== undefined) state.unitEconomics.dimensions = updates.dimensions;
      }),

    setCategory: (category) =>
      set((state) => {
        state.product.category = category;
        const defaults = CATEGORY_DEFAULTS[category];
        state.unitEconomics.category = category;
        state.unitEconomics.marketingPercent = defaults.marketingPercent;
        state.unitEconomics.returnRate = defaults.returnRate;
      }),

    setMarketplace: (marketplace) =>
      set((state) => {
        state.product.marketplace = marketplace;
        state.unitEconomics.marketplace = marketplace;
      }),

    setValueChain: (updates) =>
      set((state) => {
        Object.assign(state.valueChain, updates);
        if (updates.fobPrice !== undefined) state.product.fobPrice = updates.fobPrice;
        if (updates.currency !== undefined) {
          state.product.currency = updates.currency;
          state.valueChain.exchangeRate = EXCHANGE_RATES[updates.currency] ?? 83.5;
        }
      }),

    setUnitEconomics: (updates) =>
      set((state) => {
        Object.assign(state.unitEconomics, updates);
        if (updates.sellingPrice !== undefined) state.product.sellingPrice = updates.sellingPrice;
      }),

    setCompetitorPrices: (prices) =>
      set((state) => {
        state.competitorPrices = prices;
      }),

    setResults: ({ landed, unitEcon, market, verdict }) =>
      set((state) => {
        state.landedCostResult = landed;
        state.unitEconomicsResult = unitEcon;
        state.marketPositionResult = market;
        state.verdictResult = verdict;
        state.hasCalculated = true;
        state.isCalculating = false;
        // Propagate landed cost to unit econ
        state.unitEconomics.landedCost = landed.totalLandedCost;
      }),

    setIsCalculating: (v) =>
      set((state) => {
        state.isCalculating = v;
      }),

    resetOverrides: () =>
      set((state) => {
        delete state.valueChain.bcdOverride;
        delete state.valueChain.swsOverride;
        delete state.valueChain.igstOverride;
        delete state.unitEconomics.commissionOverride;
        delete state.unitEconomics.logisticsOverride;
      }),
  }))
);
