import { DutyRates } from "@/types/product";
import { HS_CODES, PREFERENTIAL_COUNTRIES } from "@/data/hsCodes";

/**
 * Returns applicable duty rates for a given HS code and country of origin.
 * Checks for preferential rates via FTA.
 * All values are percentages (e.g. 20 means 20%).
 */
export function getDutyRates(hsCode: string, countryOfOrigin: string): DutyRates {
  // Match by 4-digit prefix
  const prefix = hsCode.slice(0, 4);
  const entry = HS_CODES.find((h) => h.code === prefix || h.code === hsCode);

  if (!entry) {
    // Default fallback rates
    return {
      bcd: 20,
      sws: 10,
      igst: 18,
      preferentialDuty: null,
      isPreferential: false,
    };
  }

  const isPreferential = countryOfOrigin in PREFERENTIAL_COUNTRIES;

  // Preferential BCD under FTAs: India's ECTA/CEPA agreements typically
  // reduce BCD by 50% in initial years, reaching 0% over the schedule.
  // Using 50% reduction as a conservative representative rate.
  // Actual rate depends on specific HS code and FTA schedule year.
  const preferentialBcd = isPreferential ? entry.bcd * 0.5 : null;

  return {
    bcd: entry.bcd,
    sws: entry.sws,
    igst: entry.igst,
    preferentialDuty: preferentialBcd,
    isPreferential,
  };
}

/**
 * Calculates total duty amount on CIF value.
 * BCD -> SWS (10% of BCD) -> IGST (on CIF + BCD + SWS)
 */
export function calculateDutyAmounts(
  cifValue: number,
  rates: DutyRates,
  usePreferential: boolean = false
): {
  bcdAmount: number;
  swsAmount: number;
  igstBase: number;
  igstAmount: number;
  totalDuty: number;
} {
  const effectiveBcd = usePreferential && rates.preferentialDuty !== null
    ? rates.preferentialDuty
    : rates.bcd;

  const bcdAmount = (cifValue * effectiveBcd) / 100;
  const swsAmount = (bcdAmount * rates.sws) / 100;
  const igstBase = cifValue + bcdAmount + swsAmount;
  const igstAmount = (igstBase * rates.igst) / 100;
  const totalDuty = bcdAmount + swsAmount + igstAmount;

  return { bcdAmount, swsAmount, igstBase, igstAmount, totalDuty };
}
