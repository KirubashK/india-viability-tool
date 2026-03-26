import { Category } from "@/types/product";

// GST rates for output (selling) — NOT to be confused with import IGST
const GST_RATES: Record<Category, number> = {
  BEAUTY: 18,
  FOOD: 5,   // basic food; processed food 12%
  APPAREL: 12,
  FMCG: 18,
  PET_CARE: 18,
  ELECTRONICS: 18,
  HOME: 18,
};

/**
 * Returns the output GST rate for a category.
 */
export function getOutputGstRate(category: Category): number {
  return GST_RATES[category] ?? 18;
}

/**
 * Given a GST-inclusive MRP, returns the ex-GST (base) price and GST component.
 */
export function deconstructGst(
  mrp: number,
  category: Category
): { basePrice: number; gstAmount: number; gstRate: number } {
  const gstRate = getOutputGstRate(category);
  const basePrice = mrp / (1 + gstRate / 100);
  const gstAmount = mrp - basePrice;
  return { basePrice, gstAmount, gstRate };
}

/**
 * Input tax credit benefit estimate.
 * As an importer paying IGST, you can claim ITC on output GST.
 * This returns estimated ITC recoverable.
 */
export function estimateItcBenefit(
  igstPaid: number,
  outputGstRate: number,
  sellingPrice: number
): number {
  const outputGst = sellingPrice * (outputGstRate / 100) / (1 + outputGstRate / 100);
  // ITC = min(IGST paid, output GST liability)
  return Math.min(igstPaid, outputGst);
}
