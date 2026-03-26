import { Category, Marketplace } from "@/types/product";
import { MarketplaceFees } from "@/types/calculation";

type MarketplaceFeeMap = Record<Marketplace, Record<Category, MarketplaceFees>>;

const buildFees = (
  marketplace: Marketplace,
  commissionPercent: number,
  closingFee: number,
  paymentFeePercent: number
): MarketplaceFees => ({
  marketplace,
  commissionPercent,
  closingFee,
  paymentFeePercent,
  totalFeePercent: commissionPercent + paymentFeePercent,
});

export const MARKETPLACE_FEES: MarketplaceFeeMap = {
  NYKAA: {
    BEAUTY: buildFees("NYKAA", 40, 0, 2),
    FOOD: buildFees("NYKAA", 15, 0, 2),
    APPAREL: buildFees("NYKAA", 35, 0, 2),
    FMCG: buildFees("NYKAA", 12, 0, 2),
    PET_CARE: buildFees("NYKAA", 18, 0, 2),
    ELECTRONICS: buildFees("NYKAA", 10, 0, 2),
    HOME: buildFees("NYKAA", 20, 0, 2),
  },
  MYNTRA: {
    BEAUTY: buildFees("MYNTRA", 30, 0, 2),
    FOOD: buildFees("MYNTRA", 12, 0, 2),
    APPAREL: buildFees("MYNTRA", 30, 0, 2),
    FMCG: buildFees("MYNTRA", 10, 0, 2),
    PET_CARE: buildFees("MYNTRA", 15, 0, 2),
    ELECTRONICS: buildFees("MYNTRA", 8, 0, 2),
    HOME: buildFees("MYNTRA", 20, 0, 2),
  },
  AMAZON: {
    BEAUTY: buildFees("AMAZON", 22, 15, 3),
    FOOD: buildFees("AMAZON", 8, 15, 3),
    APPAREL: buildFees("AMAZON", 18, 15, 3),
    FMCG: buildFees("AMAZON", 8, 15, 3),
    PET_CARE: buildFees("AMAZON", 12, 15, 3),
    ELECTRONICS: buildFees("AMAZON", 6, 25, 3),
    HOME: buildFees("AMAZON", 14, 15, 3),
  },
  FLIPKART: {
    BEAUTY: buildFees("FLIPKART", 22, 20, 2.5),
    FOOD: buildFees("FLIPKART", 8, 20, 2.5),
    APPAREL: buildFees("FLIPKART", 20, 20, 2.5),
    FMCG: buildFees("FLIPKART", 8, 20, 2.5),
    PET_CARE: buildFees("FLIPKART", 12, 20, 2.5),
    ELECTRONICS: buildFees("FLIPKART", 6, 30, 2.5),
    HOME: buildFees("FLIPKART", 14, 20, 2.5),
  },
  MEESHO: {
    BEAUTY: buildFees("MEESHO", 18, 0, 1.8),
    FOOD: buildFees("MEESHO", 5, 0, 1.8),
    APPAREL: buildFees("MEESHO", 15, 0, 1.8),
    FMCG: buildFees("MEESHO", 5, 0, 1.8),
    PET_CARE: buildFees("MEESHO", 10, 0, 1.8),
    ELECTRONICS: buildFees("MEESHO", 5, 0, 1.8),
    HOME: buildFees("MEESHO", 10, 0, 1.8),
  },
};

export const MARKETPLACE_LABELS: Record<Marketplace, string> = {
  AMAZON: "Amazon India",
  NYKAA: "Nykaa",
  MYNTRA: "Myntra",
  FLIPKART: "Flipkart",
  MEESHO: "Meesho",
};

export const MARKETPLACES: Marketplace[] = ["AMAZON", "NYKAA", "MYNTRA", "FLIPKART", "MEESHO"];
