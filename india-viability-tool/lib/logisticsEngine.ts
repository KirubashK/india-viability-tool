import { FreightMode, ProductDimensions } from "@/types/product";

interface FreightEstimateResult {
  freightCost: number;
  transitDays: number;
  mode: FreightMode;
  notes: string;
}

/**
 * Estimates import freight cost based on weight, mode, and origin.
 * Returns cost in INR per shipment.
 */
export function estimateImportFreight(
  weightKg: number,
  mode: FreightMode,
  countryOfOrigin: string
): FreightEstimateResult {
  // Simplified zone-based pricing
  const isLongHaul = ["USA", "GBR", "DEU", "FRA", "ITA", "CAN", "AUS", "NZL"].includes(
    countryOfOrigin
  );
  const isMidHaul = ["CHN", "JPN", "KOR", "SGP"].includes(countryOfOrigin);

  if (mode === "AIR") {
    const ratePerKg = isLongHaul ? 850 : isMidHaul ? 600 : 450;
    const minimumCharge = isLongHaul ? 8500 : 5000;
    const freightCost = Math.max(weightKg * ratePerKg, minimumCharge);
    return {
      freightCost,
      transitDays: isLongHaul ? 5 : 3,
      mode: "AIR",
      notes: "Air freight — faster transit, higher cost per kg",
    };
  } else {
    const ratePerKg = isLongHaul ? 85 : isMidHaul ? 60 : 45;
    const minimumCharge = isLongHaul ? 35000 : 20000;
    const freightCost = Math.max(weightKg * ratePerKg, minimumCharge);
    return {
      freightCost,
      transitDays: isLongHaul ? 35 : isMidHaul ? 25 : 20,
      mode: "SEA",
      notes: "Sea freight — economical for bulk, longer transit",
    };
  }
}

/**
 * Calculates volumetric weight.
 * Standard: L x W x H (cm) / 5000 for air, /1000000 for sea (CBM x 1000)
 */
export function getVolumetricWeight(
  dimensions: ProductDimensions,
  mode: FreightMode
): number {
  const volume = dimensions.length * dimensions.width * dimensions.height; // cm³
  if (mode === "AIR") return volume / 5000;
  // Sea: convert to CBM (÷1000000) then multiply by 1000 kg/CBM
  return volume / 1000;
}

/**
 * Returns chargeable weight (higher of actual vs volumetric).
 */
export function getChargeableWeight(
  actualWeight: number,
  dimensions: ProductDimensions,
  mode: FreightMode
): number {
  const volWeight = getVolumetricWeight(dimensions, mode);
  return Math.max(actualWeight, volWeight);
}

interface LastMileResult {
  forwardCost: number;
  returnCost: number;
  netLogisticsCost: number;
}

/**
 * Calculates last-mile logistics cost per unit.
 * Based on weight slab and zone (simplified).
 */
export function calculateLastMileLogistics(
  weightKg: number,
  returnRate: number // as percentage
): LastMileResult {
  // Weight-based slabs (INR)
  let forwardCost: number;
  if (weightKg <= 0.5) forwardCost = 45;
  else if (weightKg <= 1) forwardCost = 60;
  else if (weightKg <= 2) forwardCost = 80;
  else if (weightKg <= 5) forwardCost = 120;
  else forwardCost = 120 + (weightKg - 5) * 20;

  // Return logistics is typically 1.5x forward
  const returnCost = forwardCost * 1.5 * (returnRate / 100);
  const netLogisticsCost = forwardCost + returnCost;

  return { forwardCost, returnCost, netLogisticsCost };
}
