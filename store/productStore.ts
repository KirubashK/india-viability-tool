import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
  ProductMaster, ValueChainInputs, UnitEconomicsInputs,
  Category, Marketplace, Currency,
} from "@/types/product";
import {
  LandedCostResult, UnitEconomicsResult, MarketPositionResult, VerdictResult,
} from "@/types/calculation";
import { CATEGORY_DEFAULTS } from "@/data/categories";
import { EXCHANGE_RATES } from "@/data/benchmarks";
import { getDefaultFreightMode } from "@/lib/logisticsEngine";

interface ProductState {
  product: ProductMaster;
  valueChain: ValueChainInputs;
  unitEconomics: UnitEconomicsInputs;
  competitorPrices: number[];
  landedCostResult: LandedCostResult | null;
  unitEconomicsResult: UnitEconomicsResult | null;
  marketPositionResult: MarketPositionResult | null;
  verdictResult: VerdictResult | null;
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
  setUnitEconomicsResult: (result: UnitEconomicsResult, verdict: VerdictResult) => void;
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
  costType: "FOB",
  baseCost: 10,
  currency: "USD",
  exchangeRate: EXCHANGE_RATES["USD"],
  weight: 0.3,
  dimensions: { length: 10, width: 8, height: 5 },
  freightMode: getDefaultFreightMode("BEAUTY"),
  seaShippingType: "FCL",
  insurancePercent: 0.5,
  hsCode: "3304",
  countryOfOrigin: "USA",
  freightCost: 0, // populated by engine
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
    sellingPriceMode: "KNOWN",
    targetMarginPercent: 30,
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
        if (updates.fobPrice !== undefined) state.valueChain.baseCost = updates.fobPrice;
        // Currency is owned by ValueChainForm — it sets exchangeRate via its own useEffect.
        // Do NOT reset exchangeRate here: it would clobber a custom user-typed FX rate.
        if (updates.currency !== undefined) state.valueChain.currency = updates.currency;
        if (updates.hsCode !== undefined) state.valueChain.hsCode = updates.hsCode;
        if (updates.countryOfOrigin !== undefined) state.valueChain.countryOfOrigin = updates.countryOfOrigin;
        if (updates.sellingPrice !== undefined) state.unitEconomics.sellingPrice = updates.sellingPrice;
        if (updates.weight !== undefined) {
          state.valueChain.weight = updates.weight;
          state.unitEconomics.weight = updates.weight;
        }
        if (updates.dimensions !== undefined) {
          state.valueChain.dimensions = updates.dimensions;
          state.unitEconomics.dimensions = updates.dimensions;
        }
      }),

    setCategory: (category) =>
      set((state) => {
        state.product.category = category;
        const defaults = CATEGORY_DEFAULTS[category];
        state.unitEconomics.category = category;
        state.unitEconomics.marketingPercent = defaults.marketingPercent;
        state.unitEconomics.returnRate = defaults.returnRate;
        // Auto-set default freight mode for this category
        state.valueChain.freightMode = getDefaultFreightMode(category);
      }),

    setMarketplace: (marketplace) =>
      set((state) => {
        state.product.marketplace = marketplace;
        state.unitEconomics.marketplace = marketplace;
      }),

    setValueChain: (updates) =>
      set((state) => {
        Object.assign(state.valueChain, updates);
        if (updates.baseCost !== undefined) state.product.fobPrice = updates.baseCost;
        // NOTE: do NOT auto-reset exchangeRate here when currency changes.
        // The ValueChainForm useEffect owns that sync. Resetting it here would
        // clobber any custom FX rate the user typed every time the form debounces.
        if (updates.currency !== undefined) state.product.currency = updates.currency;
        if (updates.weight !== undefined) state.unitEconomics.weight = updates.weight;
        if (updates.dimensions !== undefined) state.unitEconomics.dimensions = updates.dimensions;
      }),

    setUnitEconomics: (updates) =>
      set((state) => {
        Object.assign(state.unitEconomics, updates);
        if (updates.sellingPrice !== undefined) state.product.sellingPrice = updates.sellingPrice;
      }),

    setCompetitorPrices: (prices) =>
      set((state) => { state.competitorPrices = prices; }),

    setResults: ({ landed, unitEcon, market, verdict }) =>
      set((state) => {
        state.landedCostResult = landed;
        state.unitEconomicsResult = unitEcon;
        state.marketPositionResult = market;
        state.verdictResult = verdict;
        state.hasCalculated = true;
        state.isCalculating = false;
        state.unitEconomics.landedCost = landed.totalLandedCost;
      }),

    setUnitEconomicsResult: (result, verdict) =>
      set((state) => {
        state.unitEconomicsResult = result;
        state.verdictResult = verdict;
        state.unitEconomics.landedCost = result.landedCost;
      }),

    setIsCalculating: (v) =>
      set((state) => { state.isCalculating = v; }),

    resetOverrides: () =>
      set((state) => {
        delete state.valueChain.bcdOverride;
        delete state.valueChain.swsOverride;
        delete state.valueChain.igstOverride;
        delete state.valueChain.freightOverride;
        delete state.valueChain.originCostOverridePercent;
        delete state.unitEconomics.commissionOverride;
        delete state.unitEconomics.logisticsOverride;
        delete state.unitEconomics.paymentFeeOverride;
        delete state.unitEconomics.closingFeeOverride;
      }),
  }))
);
