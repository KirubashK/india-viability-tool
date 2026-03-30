import { FreightMode, SeaShippingType, ProductDimensions, Category } from "@/types/product";
import { FreightEngineResult } from "@/types/calculation";

// ─── SEA FREIGHT ──────────────────────────────────────────────────────────────

// ── FCL: container costs in USD per 20ft container ──
const SEA_CONTAINER_COSTS_USD: Record<string, number> = {
  CHN: 2400, KOR: 2600, JPN: 2600,
  ARE: 1800, MRU: 1800,
  GBR: 3500, DEU: 3500, FRA: 3500, ITA: 3500, NLD: 3500, ESP: 3500, CHE: 3500,
  USA: 4500, CAN: 4500,
  AUS: 3200, NZL: 3200,
  SGP: 2200, MYS: 2300, THA: 2400, VNM: 2400, IDN: 2500,
  RUS: 3800,
};
const DEFAULT_SEA_COST_USD = 3000;
const CONTAINER_VOLUME_CM3 = 33_000_000; // 33 CBM usable
const PORT_CLEARANCE_INR = 20000;

// ── LCL: cost per CBM in USD ──
const LCL_COST_PER_CBM_USD = 100;
const LCL_MIN_CHARGE_USD = 50;

export function getSeaContainerCostUsd(countryCode: string): number {
  return SEA_CONTAINER_COSTS_USD[countryCode] ?? DEFAULT_SEA_COST_USD;
}

/**
 * Sea volumetric weight in kg (divisor 6000, used for informational chargeable weight display).
 */
export function getSeaVolumetricWeight(dims: ProductDimensions): number {
  return (dims.length * dims.width * dims.height) / 6000;
}

// ─── AIR FREIGHT — SLAB BASED ────────────────────────────────────────────────
// International air freight uses rounded chargeable weight with slab rates.
// Divisor 5000 for volumetric weight (IATA standard).

/**
 * Air volumetric weight in kg (divisor 5000).
 */
export function getAirVolumetricWeight(dims: ProductDimensions): number {
  return (dims.length * dims.width * dims.height) / 5000;
}

/**
 * Returns slab rate (INR/kg) for given rounded chargeable weight.
 */
function getAirSlabRate(roundedChargeableKg: number): number {
  if (roundedChargeableKg <= 0.5) return 500;
  if (roundedChargeableKg <= 5)   return 400;
  if (roundedChargeableKg <= 20)  return 300;
  return 250;
}

// ─── VOLUMETRIC HELPERS ───────────────────────────────────────────────────────

export function getVolumePerUnitCbm(dims: ProductDimensions): number {
  return (dims.length * dims.width * dims.height) / 1_000_000;
}

// ─── MAIN ENGINE ──────────────────────────────────────────────────────────────

/**
 * Returns per-unit import freight cost in INR.
 *
 * AIR: slab-based pricing on rounded chargeable weight (max of actual vs volumetric).
 * SEA FCL: container cost ÷ units per container. Dimensions drive both sides.
 * SEA LCL: CBM × $/CBM rate, with minimum charge.
 *
 * usdToInrRate must always be the USD→INR conversion rate (not the user's currency rate),
 * since container and LCL costs are priced in USD.
 *
 * If overrideInr is provided, all engine math is skipped.
 */
export function getImportFreightPerUnit(
  mode: FreightMode,
  seaShippingType: SeaShippingType,
  countryCode: string,
  weight: number,
  dims: ProductDimensions,
  usdToInrRate: number,
  overrideInr?: number
): FreightEngineResult {
  if (overrideInr !== undefined && !isNaN(overrideInr) && overrideInr >= 0) {
    return { freightPerUnit: overrideInr, mode, isOverridden: true, tooltip: "Manual override applied" };
  }

  // ── SEA ──────────────────────────────────────────────────────────────────────
  if (mode === "SEA") {
    const unitVolumeCm3 = dims.length * dims.width * dims.height;
    const unitsPerContainer = unitVolumeCm3 > 0
      ? Math.floor(CONTAINER_VOLUME_CM3 / unitVolumeCm3)
      : 0;
    const seaVolumetricWeight = getSeaVolumetricWeight(dims);
    const seaChargeableWeight = Math.max(weight, seaVolumetricWeight);
    const containerCostUSD = getSeaContainerCostUsd(countryCode);
    const containerCostInr = containerCostUSD * usdToInrRate;

    if (seaShippingType === "FCL") {
      // FCL: apportion container cost by units per container
      const freightPerUnit = unitsPerContainer > 0
        ? containerCostInr / unitsPerContainer
        : 0;
      const portClearancePerUnit = PORT_CLEARANCE_INR / Math.max(unitsPerContainer, 1);
      return {
        freightPerUnit, mode: "SEA", seaShippingType: "FCL",
        seaVolumetricWeight, seaChargeableWeight,
        unitsPerContainer, containerCost: containerCostInr, portClearancePerUnit,
        isOverridden: false,
        tooltip: `FCL: ₹${Math.round(containerCostInr).toLocaleString("en-IN")} ÷ ${unitsPerContainer} units`,
      };
    }

    // LCL: cost per CBM, minimum charge applies
    const lclUnitVolumeCbm = unitVolumeCm3 / 1_000_000;
    const lclFreightUSD = Math.max(lclUnitVolumeCbm * LCL_COST_PER_CBM_USD, LCL_MIN_CHARGE_USD);
    const freightPerUnit = lclFreightUSD * usdToInrRate;
    return {
      freightPerUnit, mode: "SEA", seaShippingType: "LCL",
      seaVolumetricWeight, seaChargeableWeight,
      lclUnitVolumeCbm, lclFreightUSD,
      unitsPerContainer, containerCost: containerCostInr,
      isOverridden: false,
      tooltip: `LCL: ${lclUnitVolumeCbm.toFixed(4)} CBM × $${LCL_COST_PER_CBM_USD}/CBM (min $${LCL_MIN_CHARGE_USD})`,
    };
  }

  // ── AIR — SLAB BASED ─────────────────────────────────────────────────────────
  const volumetricWeight = getAirVolumetricWeight(dims);
  const rawChargeable = Math.max(weight, volumetricWeight);
  // Round up to nearest 0.5 kg (industry standard)
  const chargeableWeight = Math.ceil(rawChargeable * 2) / 2;
  const slabRate = getAirSlabRate(chargeableWeight);
  const MIN_AIR_CHARGE_INR = 150;
  const freightPerUnit = Math.max(chargeableWeight * slabRate, MIN_AIR_CHARGE_INR);
  return {
    freightPerUnit, mode: "AIR",
    volumetricWeight, chargeableWeight, ratePerKg: slabRate,
    isOverridden: false,
    tooltip: `AIR: chargeable = max(actual ${weight.toFixed(2)} kg, vol ${volumetricWeight.toFixed(3)} kg) = ${chargeableWeight.toFixed(1)} kg → ₹${slabRate}/kg slab`,
  };
}

// ─── CATEGORY DEFAULT MODE ────────────────────────────────────────────────────

const CATEGORY_DEFAULT_MODE: Record<Category, FreightMode> = {
  BEAUTY: "AIR", FOOD: "AIR", APPAREL: "AIR",
  FMCG: "SEA", PET_CARE: "SEA",
  ELECTRONICS: "AIR", HOME: "SEA",
};

export function getDefaultFreightMode(category: Category): FreightMode {
  return CATEGORY_DEFAULT_MODE[category];
}

// ─── LAST-MILE (domestic delivery) ───────────────────────────────────────────

export interface LastMileResult {
  forwardCost: number;
  returnCost: number;
  netLogisticsCost: number;
}

export function calculateLastMileLogistics(weightKg: number, returnRate: number): LastMileResult {
  let forwardCost: number;
  if (weightKg <= 0.5) forwardCost = 45;
  else if (weightKg <= 1) forwardCost = 60;
  else if (weightKg <= 2) forwardCost = 80;
  else if (weightKg <= 5) forwardCost = 120;
  else forwardCost = 120 + (weightKg - 5) * 20;
  const returnCost = forwardCost * 1.5 * (returnRate / 100);
  return { forwardCost, returnCost, netLogisticsCost: forwardCost + returnCost };
}

// ─── LEGACY COMPAT ────────────────────────────────────────────────────────────

export function getVolumetricWeight(dims: ProductDimensions, mode: FreightMode): number {
  return mode === "AIR" ? getAirVolumetricWeight(dims) : getVolumePerUnitCbm(dims) * 1000;
}

export function getChargeableWeight(actual: number, dims: ProductDimensions, mode: FreightMode): number {
  return Math.max(actual, getVolumetricWeight(dims, mode));
}
