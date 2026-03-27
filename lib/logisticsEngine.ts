import { FreightMode, ProductDimensions, Category } from "@/types/product";
import { FreightEngineResult } from "@/types/calculation";

// ─── SEA FREIGHT ──────────────────────────────────────────────────────────────
// Primary model: chargeable weight × per-kg rate (LCL/standard approach)
// Volumetric weight uses divisor 6000 (IATA/industry standard for sea)

const SEA_RATES_INR_PER_KG: Record<string, number> = {
  CHN: 28,  KOR: 32,  JPN: 32,
  SGP: 25,  MYS: 27,  THA: 28,  VNM: 28,  IDN: 30,
  ARE: 22,  MRU: 22,
  GBR: 45,  DEU: 45,  FRA: 45,  ITA: 45,  NLD: 45,  ESP: 45,  CHE: 48,
  AUS: 40,  NZL: 42,
  USA: 55,  CAN: 55,
};

const DEFAULT_SEA_RATE_INR = 38;
const SEA_HANDLING_INR = 40; // port handling per unit (INR)

export function getSeaRateInr(countryCode: string): number {
  return SEA_RATES_INR_PER_KG[countryCode] ?? DEFAULT_SEA_RATE_INR;
}

/**
 * Sea volumetric weight in kg.
 * Industry standard divisor for sea freight is 6000 (cm³ → kg).
 */
export function getSeaVolumetricWeight(dims: ProductDimensions): number {
  return (dims.length * dims.width * dims.height) / 6000;
}

// ─── SEA FREIGHT (FCL MODEL — kept for informational breakdown) ───────────────

const SEA_CONTAINER_COSTS_USD: Record<string, number> = {
  CHN: 2400, KOR: 2600, JPN: 2600,
  ARE: 1800, MRU: 1800,
  GBR: 3500, DEU: 3500, FRA: 3500, ITA: 3500, NLD: 3500, ESP: 3500, CHE: 3500,
  USA: 4500, CAN: 4500,
  AUS: 3200, NZL: 3200,
  SGP: 2200, MYS: 2300, THA: 2400, VNM: 2400, IDN: 2500,
};

const DEFAULT_SEA_COST_USD = 3000;
const USABLE_CBM = 29;
const PORT_CLEARANCE_INR = 20000;

export function getSeaContainerCostUsd(countryCode: string): number {
  return SEA_CONTAINER_COSTS_USD[countryCode] ?? DEFAULT_SEA_COST_USD;
}

// ─── AIR FREIGHT ──────────────────────────────────────────────────────────────

const AIR_RATES_INR_PER_KG: Record<string, number> = {
  CHN: 240, KOR: 280, JPN: 280, SGP: 260, MYS: 270, THA: 270, VNM: 280, IDN: 290,
  ARE: 320, MRU: 320,
  GBR: 400, DEU: 400, FRA: 400, ITA: 400, NLD: 400, ESP: 400, CHE: 420,
  AUS: 420, NZL: 440,
  USA: 450, CAN: 450,
};

const DEFAULT_AIR_RATE_INR = 300;
const AIR_HANDLING_INR = 30;

export function getAirRateInr(countryCode: string): number {
  return AIR_RATES_INR_PER_KG[countryCode] ?? DEFAULT_AIR_RATE_INR;
}

// ─── VOLUMETRIC HELPERS ───────────────────────────────────────────────────────

export function getAirVolumetricWeight(dims: ProductDimensions): number {
  return (dims.length * dims.width * dims.height) / 5000;
}

export function getVolumePerUnitCbm(dims: ProductDimensions): number {
  return (dims.length * dims.width * dims.height) / 1_000_000;
}

// ─── MAIN ENGINE ──────────────────────────────────────────────────────────────

/**
 * Returns per-unit import freight cost in INR.
 * Uses FCL sea model or volumetric air model.
 * If overrideInr is provided, all math is skipped.
 */
export function getImportFreightPerUnit(
  mode: FreightMode,
  countryCode: string,
  weight: number,
  dims: ProductDimensions,
  usdToInrRate: number,
  overrideInr?: number
): FreightEngineResult {
  if (overrideInr !== undefined && overrideInr >= 0) {
    return { freightPerUnit: overrideInr, mode, isOverridden: true, tooltip: "Manual override applied" };
  }

  if (mode === "SEA") {
    // Primary: chargeable weight model (volumetric ÷ 6000, per-kg rate)
    const rate = getSeaRateInr(countryCode);
    const seaVolumetricWeight = getSeaVolumetricWeight(dims);
    const seaChargeableWeight = Math.max(weight, seaVolumetricWeight);
    const freightPerUnit = seaChargeableWeight * rate + SEA_HANDLING_INR;

    // FCL context — informational only, shown in advanced breakdown
    const containerCostInr = getSeaContainerCostUsd(countryCode) * usdToInrRate;
    const volumePerUnit = getVolumePerUnitCbm(dims);
    const unitsPerContainer = volumePerUnit > 0 ? Math.floor(USABLE_CBM / volumePerUnit) : 1000;
    const portClearancePerUnit = PORT_CLEARANCE_INR / Math.max(unitsPerContainer, 1);

    return {
      freightPerUnit, mode: "SEA",
      seaVolumetricWeight, seaChargeableWeight, seaRatePerKg: rate,
      unitsPerContainer, containerCost: containerCostInr, portClearancePerUnit,
      isOverridden: false,
      tooltip: `Chargeable weight ${seaChargeableWeight.toFixed(3)} kg × ₹${rate}/kg (sea)`,
    };
  }

  // AIR
  const rate = getAirRateInr(countryCode);
  const volumetricWeight = getAirVolumetricWeight(dims);
  const chargeableWeight = Math.max(weight, volumetricWeight);
  const freightPerUnit = chargeableWeight * rate + AIR_HANDLING_INR;
  return {
    freightPerUnit, mode: "AIR",
    volumetricWeight, chargeableWeight, ratePerKg: rate, handlingPerUnit: AIR_HANDLING_INR,
    isOverridden: false, tooltip: "Based on volumetric / actual chargeable weight",
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

// ─── LAST-MILE (domestic delivery — unchanged) ────────────────────────────────

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
