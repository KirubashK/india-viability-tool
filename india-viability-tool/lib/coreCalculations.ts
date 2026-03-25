// ===== TYPES =====

export interface LandedCostInput {
  costBasis: "FOB" | "EX_WORKS";
  baseCost: number;
  originCosts?: number;

  freight: number;
  insurancePercent: number;

  bcdPercent: number;
  swsPercent: number;
  igstPercent: number;
}

export interface LandedCostOutput {
  cif: number;
  totalDuty: number;
  landedCost: number;
}

export interface UnitEconomicsInput {
  mrp: number;
  gstPercent: number;

  marketplaceCommissionPercent: number;
  paymentFeePercent: number;

  logisticsCost: number;
  marketingPercent: number;

  landedCost: number;
}

export interface UnitEconomicsOutput {
  netRevenue: number;
  totalCosts: number;
  netProfit: number;
  marginPercent: number;
}

// ===== HELPERS =====

const safe = (val: number | undefined | null): number => {
  if (isNaN(Number(val)) || val === undefined || val === null) return 0;
  return Number(val);
};

const percent = (value: number, pct: number) => {
  return (safe(value) * safe(pct)) / 100;
};

// ===== LANDED COST =====

export function calculateLandedCost(input: LandedCostInput): LandedCostOutput {
  const baseCost = safe(input.baseCost);
  const originCosts = safe(input.originCosts);
  const freight = safe(input.freight);

  const adjustedBase =
    input.costBasis === "EX_WORKS"
      ? baseCost + originCosts
      : baseCost;

  const insurance = percent(adjustedBase + freight, input.insurancePercent);

  const cif = adjustedBase + freight + insurance;

  const bcd = percent(cif, input.bcdPercent);
  const sws = percent(bcd, input.swsPercent);
  const igst = percent(cif + bcd + sws, input.igstPercent);

  const totalDuty = bcd + sws + igst;

  const landedCost = cif + totalDuty;

  return {
    cif,
    totalDuty,
    landedCost,
  };
}

// ===== UNIT ECONOMICS =====

export function calculateUnitEconomics(
  input: UnitEconomicsInput
): UnitEconomicsOutput {
  const mrp = safe(input.mrp);
  const gst = safe(input.gstPercent);

  const netRevenue = mrp / (1 + gst / 100);

  const commission = percent(netRevenue, input.marketplaceCommissionPercent);
  const paymentFee = percent(netRevenue, input.paymentFeePercent);
  const marketing = percent(netRevenue, input.marketingPercent);

  const logistics = safe(input.logisticsCost);
  const landedCost = safe(input.landedCost);

  const totalCosts =
    commission + paymentFee + marketing + logistics + landedCost;

  const netProfit = netRevenue - totalCosts;

  const marginPercent =
    netRevenue === 0 ? 0 : (netProfit / netRevenue) * 100;

  return {
    netRevenue,
    totalCosts,
    netProfit,
    marginPercent,
  };
}
