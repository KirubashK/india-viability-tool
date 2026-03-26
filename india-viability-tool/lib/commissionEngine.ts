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
  return MARKETPLACE_FEES[marketplace][category];
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
  const commissionAmount = (sellingPrice * fees.commissionPercent) / 100;
  const paymentFeeAmount = (sellingPrice * fees.paymentFeePercent) / 100;
  const closingFee = fees.closingFee;
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
  return (sellingPrice * marketingPercent) / 100;
}
