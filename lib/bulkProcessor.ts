import * as XLSX from "xlsx";
import { BulkRow, BulkResult } from "@/types/calculation";
import { Category, Marketplace, FreightMode } from "@/types/product";
import { calculateLandedCost, calculateUnitEconomics, getVerdict } from "./calculations";
import { EXCHANGE_RATES } from "@/data/benchmarks";
import { CATEGORY_DEFAULTS } from "@/data/categories";
import { getDefaultFreightMode } from "./logisticsEngine";

const MAX_SKUS = 50;

// Column header aliases — case-insensitive match
const COL = {
  productName: ["product name", "product", "name", "sku name"],
  hsCode: ["hs code", "hscode", "hs"],
  costType: ["cost type", "costtype", "type"],
  baseCost: ["cost", "base cost", "basecost", "fob price", "exw price", "price"],
  currency: ["currency", "curr"],
  countryOfOrigin: ["country", "country of origin", "origin"],
  length: ["length", "l (cm)", "length (cm)"],
  width: ["width", "w (cm)", "width (cm)"],
  height: ["height", "h (cm)", "height (cm)"],
  weight: ["weight", "weight (kg)", "wt"],
  sellingPrice: ["selling price", "mrp", "selling price (inr)", "mrp (inr)"],
  category: ["category", "cat"],
  marketplace: ["marketplace", "platform"],
};

function matchHeader(raw: string): string | null {
  const lower = raw.toLowerCase().trim();
  for (const [key, aliases] of Object.entries(COL)) {
    if (aliases.includes(lower)) return key;
  }
  return null;
}

function normalizeCategory(raw: string): Category {
  const map: Record<string, Category> = {
    beauty: "BEAUTY", "beauty & personal care": "BEAUTY", "personal care": "BEAUTY",
    food: "FOOD", "food & beverages": "FOOD", beverages: "FOOD",
    apparel: "APPAREL", fashion: "APPAREL", clothing: "APPAREL",
    fmcg: "FMCG", household: "FMCG",
    "pet care": "PET_CARE", pet: "PET_CARE",
    electronics: "ELECTRONICS", gadgets: "ELECTRONICS",
    home: "HOME", "home & living": "HOME",
  };
  return map[raw.toLowerCase().trim()] ?? "FMCG";
}

function normalizeMarketplace(raw: string | undefined): Marketplace {
  const map: Record<string, Marketplace> = {
    amazon: "AMAZON", nykaa: "NYKAA", myntra: "MYNTRA",
    flipkart: "FLIPKART", meesho: "MEESHO",
  };
  return map[(raw ?? "").toLowerCase().trim()] ?? "AMAZON";
}

/**
 * Parses an uploaded Excel file and returns typed BulkRow[].
 * Limit: 50 rows.
 */
export async function parseExcel(file: File): Promise<BulkRow[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

  if (raw.length === 0) throw new Error("Excel file is empty or has no data rows.");

  // Build column map from first row headers
  const firstRow = raw[0];
  const headerMap: Record<string, string> = {};
  for (const colRaw of Object.keys(firstRow)) {
    const matched = matchHeader(colRaw);
    if (matched) headerMap[matched] = colRaw;
  }

  const rows: BulkRow[] = [];

  for (const rawRow of raw.slice(0, MAX_SKUS)) {
    const g = (key: string): string => String((rawRow as Record<string, unknown>)[headerMap[key] ?? ""] ?? "").trim();
    const n = (key: string): number => parseFloat(g(key)) || 0;

    const costTypeRaw = g("costType").toUpperCase();

    rows.push({
      productName: g("productName") || `SKU ${rows.length + 1}`,
      hsCode: g("hsCode") || "3304",
      costType: costTypeRaw === "EXW" ? "EXW" : "FOB",
      baseCost: n("baseCost") || 10,
      currency: g("currency") || "USD",
      countryOfOrigin: g("countryOfOrigin") || "CHN",
      length: n("length") || 10,
      width: n("width") || 8,
      height: n("height") || 5,
      weight: n("weight") || 0.3,
      sellingPrice: n("sellingPrice") || 999,
      category: normalizeCategory(g("category")),
      marketplace: g("marketplace") || undefined,
    });
  }

  return rows;
}

/**
 * Processes parsed BulkRow[] through the full calculation engine.
 * Returns BulkResult[] with landed cost, margin, and verdict per SKU.
 */
export function processBulkProducts(rows: BulkRow[]): BulkResult[] {
  return rows.map((row) => {
    try {
      const category = row.category;
      const marketplace = normalizeMarketplace(row.marketplace);
      const defaults = CATEGORY_DEFAULTS[category];
      const freightMode: FreightMode = getDefaultFreightMode(category);
      const currency = (EXCHANGE_RATES[row.currency] ? row.currency : "USD") as keyof typeof EXCHANGE_RATES;

      const valueChain = {
        costType: row.costType,
        baseCost: row.baseCost,
        currency: currency as import("@/types/product").Currency,
        exchangeRate: EXCHANGE_RATES[currency] ?? 83.5,
        weight: row.weight,
        dimensions: { length: row.length, width: row.width, height: row.height },
        freightMode,
        insurancePercent: 0.5,
        hsCode: row.hsCode,
        countryOfOrigin: row.countryOfOrigin,
        freightCost: 0, // computed by engine
      };

      const landed = calculateLandedCost(valueChain);

      const unitEcon = calculateUnitEconomics({
        sellingPrice: row.sellingPrice,
        marketplace,
        category,
        weight: row.weight,
        dimensions: { length: row.length, width: row.width, height: row.height },
        landedCost: landed.totalLandedCost,
        marketingPercent: defaults.marketingPercent,
        returnRate: defaults.returnRate,
      });

      const verdict = getVerdict(unitEcon.marginPercent, "AT", category);

      return {
        row,
        landedCost: landed.totalLandedCost,
        freightPerUnit: landed.freightPerUnit,
        totalDuty: landed.totalDuty,
        netProfit: unitEcon.netProfit,
        marginPercent: unitEcon.marginPercent,
        verdict: verdict.verdict,
        score: verdict.score,
      };
    } catch (err) {
      return {
        row,
        landedCost: 0,
        freightPerUnit: 0,
        totalDuty: 0,
        netProfit: 0,
        marginPercent: 0,
        verdict: "NO_GO",
        score: 0,
        error: err instanceof Error ? err.message : "Calculation failed",
      };
    }
  });
}

/**
 * Returns an empty template BulkRow[] as Excel for users to download.
 */
export function downloadBulkTemplate(): void {
  const headers = [
    "Product Name", "HS Code", "Cost Type", "Cost", "Currency",
    "Country", "Length", "Width", "Height", "Weight",
    "Selling Price", "Category", "Marketplace",
  ];
  const example = [
    "Vitamin C Serum", "3304", "FOB", "5", "USD",
    "CHN", "10", "8", "5", "0.3",
    "2499", "Beauty", "Amazon",
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  ws["!cols"] = headers.map(() => ({ wch: 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Products");
  XLSX.writeFile(wb, "india_viability_bulk_template.xlsx");
}
