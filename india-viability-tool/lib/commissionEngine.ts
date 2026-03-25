import { Category, Marketplace } from "@/types/product";
import { MarketplaceFees } from "@/types/calculation";
import { MARKETPLACE_FEES } from "@/data/marketplaces";

/**
 * Returns marketplace fee structure for given marketplace and category.
 */
export function getMarketplaceFees(
  marketplace: Marketplace,
  category: Category
): MarketplaceFees {
  const marketplaceData = MARKETPLACE_FEES[marketplace];

  if (!marketplaceData) {
    return {
      commissionPercent: 20,
      paymentFeePercent: 2,
      closingFee: 0,
    };
  }

  const categoryFees = marketplaceData[category];

  if (!categoryFees) {
    return {
      commissionPercent: 20,
      paymentFeePercent: 2,
      closingFee: 0,
    };
  }

  return categoryFees;
}

/**
 * Calculates total marketplace deduction from selling price.
 */
export function calculateMarketplaceDeduction(
  sellingPrice: number,
  fees: MarketplaceFees
): {
  commissionAmount: number;
  closingFee: number;
  paymentFeeAmount: number;
  totalDeduction: number;
  netAfterFees: number;
} {
  const safe = (v: number) => (isNaN(v) ? 0 : v);

  const commissionPercent = safe(fees.commissionPercent);
  const paymentFeePercent = safe(fees.paymentFeePercent);
  const closingFee = safe(fees.closingFee);

  const commissionAmount = (sellingPrice * commissionPercent) / 100;
  const paymentFeeAmount = (sellingPrice * paymentFeePercent) / 100;

  const totalDeduction = commissionAmount + paymentFeeAmount + closingFee;
  const netAfterFees = sellingPrice - totalDeduction;

  return {
    commissionAmount,
    closingFee,
    paymentFeeAmount,
    totalDeduction,
    netAfterFees,
  };
}

/**
 * Calculates marketing cost based on category defaults and price band.
 */
export function calculateMarketingCost(
  sellingPrice: number,
  marketingPercent: number
): number {
const safe = (v: number) => (v === undefined || isNaN(v) ? 0 : v);
return (safe(sellingPrice) * safe(marketingPercent)) / 100;
}
