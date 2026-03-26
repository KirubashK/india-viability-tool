import { Category, CategoryDefaults } from "@/types/product";

export const CATEGORY_DEFAULTS: Record<Category, CategoryDefaults> = {
  BEAUTY: {
    commissionPercent: 35,
    returnRate: 12,
    marketingPercent: 18,
    logisticsPerUnit: 65,
    marginTarget: 45,
    priceBand: { min: 299, max: 4999 },
  },
  FOOD: {
    commissionPercent: 12,
    returnRate: 4,
    marketingPercent: 10,
    logisticsPerUnit: 55,
    marginTarget: 30,
    priceBand: { min: 99, max: 1999 },
  },
  APPAREL: {
    commissionPercent: 25,
    returnRate: 30,
    marketingPercent: 20,
    logisticsPerUnit: 75,
    marginTarget: 40,
    priceBand: { min: 499, max: 9999 },
  },
  FMCG: {
    commissionPercent: 10,
    returnRate: 5,
    marketingPercent: 8,
    logisticsPerUnit: 45,
    marginTarget: 25,
    priceBand: { min: 49, max: 999 },
  },
  PET_CARE: {
    commissionPercent: 15,
    returnRate: 8,
    marketingPercent: 14,
    logisticsPerUnit: 80,
    marginTarget: 35,
    priceBand: { min: 199, max: 4999 },
  },
  ELECTRONICS: {
    commissionPercent: 8,
    returnRate: 15,
    marketingPercent: 12,
    logisticsPerUnit: 120,
    marginTarget: 20,
    priceBand: { min: 999, max: 99999 },
  },
  HOME: {
    commissionPercent: 18,
    returnRate: 10,
    marketingPercent: 12,
    logisticsPerUnit: 100,
    marginTarget: 30,
    priceBand: { min: 299, max: 19999 },
  },
};

export const CATEGORY_LABELS: Record<Category, string> = {
  BEAUTY: "Beauty & Personal Care",
  FOOD: "Food & Beverages",
  APPAREL: "Apparel & Fashion",
  FMCG: "FMCG / Household",
  PET_CARE: "Pet Care",
  ELECTRONICS: "Electronics & Gadgets",
  HOME: "Home & Living",
};

export const CATEGORIES: Category[] = [
  "BEAUTY",
  "FOOD",
  "APPAREL",
  "FMCG",
  "PET_CARE",
  "ELECTRONICS",
  "HOME",
];
