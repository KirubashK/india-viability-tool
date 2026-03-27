export interface HsCodeEntry {
  code: string;
  description: string;
  bcd: number;
  igst: number;
  sws: number; // Social Welfare Surcharge = 10% of BCD
  category: string;
}

export const HS_CODES: HsCodeEntry[] = [
  // Beauty & Cosmetics
  { code: "3304", description: "Beauty / make-up preparations", bcd: 20, igst: 28, sws: 10, category: "BEAUTY" },
  { code: "3305", description: "Preparations for hair", bcd: 20, igst: 18, sws: 10, category: "BEAUTY" },
  { code: "3306", description: "Oral / dental hygiene preparations", bcd: 20, igst: 18, sws: 10, category: "BEAUTY" },
  { code: "3307", description: "Pre-shave, aftershave, deodorants", bcd: 20, igst: 28, sws: 10, category: "BEAUTY" },
  { code: "3401", description: "Soap, cleansing preparations", bcd: 20, igst: 18, sws: 10, category: "BEAUTY" },

  // Food & Beverages
  { code: "0901", description: "Coffee, whether roasted or not", bcd: 100, igst: 5, sws: 10, category: "FOOD" },
  { code: "0902", description: "Tea, whether flavoured or not", bcd: 100, igst: 5, sws: 10, category: "FOOD" },
  { code: "1806", description: "Chocolate and cocoa preparations", bcd: 30, igst: 18, sws: 10, category: "FOOD" },
  { code: "2106", description: "Food preparations NEC", bcd: 30, igst: 18, sws: 10, category: "FOOD" },
  { code: "2009", description: "Fruit juices / vegetable juices", bcd: 30, igst: 12, sws: 10, category: "FOOD" },
  { code: "2202", description: "Waters, energy drinks, soft drinks", bcd: 30, igst: 18, sws: 10, category: "FOOD" },

  // Apparel
  { code: "6109", description: "T-shirts, singlets, knitted", bcd: 20, igst: 12, sws: 10, category: "APPAREL" },
  { code: "6204", description: "Women's suits, jackets, dresses", bcd: 20, igst: 12, sws: 10, category: "APPAREL" },
  { code: "6403", description: "Footwear, outer soles of rubber", bcd: 25, igst: 18, sws: 10, category: "APPAREL" },

  // FMCG
  { code: "3402", description: "Surface-active agents (detergents)", bcd: 10, igst: 18, sws: 10, category: "FMCG" },
  { code: "3808", description: "Insecticides, rodenticides, biocides", bcd: 10, igst: 18, sws: 10, category: "FMCG" },
  { code: "3214", description: "Glaziers' putty, resin cements", bcd: 10, igst: 18, sws: 10, category: "FMCG" },

  // Pet Care
  { code: "2309", description: "Preparations for animal feeding", bcd: 30, igst: 18, sws: 10, category: "PET_CARE" },
  { code: "6307", description: "Pet accessories / textile articles NEC", bcd: 20, igst: 12, sws: 10, category: "PET_CARE" },

  // Electronics
  { code: "8471", description: "Computing machines, laptops, tablets", bcd: 0, igst: 18, sws: 10, category: "ELECTRONICS" },
  { code: "8517", description: "Telephone sets, smartphones", bcd: 15, igst: 18, sws: 10, category: "ELECTRONICS" },
  { code: "8518", description: "Microphones, loudspeakers, headphones", bcd: 10, igst: 18, sws: 10, category: "ELECTRONICS" },
  { code: "9004", description: "Spectacles, goggles", bcd: 10, igst: 18, sws: 10, category: "ELECTRONICS" },

  // Home
  { code: "9405", description: "Lamps, lighting fittings", bcd: 20, igst: 18, sws: 10, category: "HOME" },
  { code: "6911", description: "Tableware, kitchenware, ceramic", bcd: 20, igst: 12, sws: 10, category: "HOME" },
  { code: "7323", description: "Table, kitchen, iron/steel", bcd: 15, igst: 18, sws: 10, category: "HOME" },
];

// Countries with preferential duty via FTA
export const PREFERENTIAL_COUNTRIES: Record<string, string> = {
  SGP: "Singapore (CSFTA)",
  KOR: "South Korea (CEPA)",
  JPN: "Japan (CEPA)",
  MYS: "Malaysia (MCFTA)",
  THA: "Thailand (AIFTA)",
  VNM: "Vietnam (AIFTA)",
  IDN: "Indonesia (AIFTA)",
  PHL: "Philippines (AIFTA)",
  AUS: "Australia (ECTA)",
  ARE: "UAE (CEPA)",
  MRU: "Mauritius (CECPA)",
};

export const COUNTRIES: Record<string, string> = {
  USA: "United States",
  GBR: "United Kingdom",
  DEU: "Germany",
  FRA: "France",
  ITA: "Italy",
  CHN: "China",
  JPN: "Japan",
  KOR: "South Korea",
  RUS: "Russia",
  AUS: "Australia",
  SGP: "Singapore",
  THA: "Thailand",
  VNM: "Vietnam",
  IDN: "Indonesia",
  MYS: "Malaysia",
  ARE: "UAE",
  NLD: "Netherlands",
  ESP: "Spain",
  CAN: "Canada",
  NZL: "New Zealand",
  CHE: "Switzerland",
};
