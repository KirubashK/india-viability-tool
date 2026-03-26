import * as XLSX from "xlsx";
import { LandedCostResult, UnitEconomicsResult, VerdictResult, SavedAnalysis, BulkResult } from "@/types/calculation";
import { ProductMaster } from "@/types/product";

const inr = (v: number) => Math.round(v).toLocaleString("en-IN");
const pct = (v: number) => `${v.toFixed(1)}%`;

// ─── Single Product Detailed Export ───────────────────────────────────────────

export function exportToExcel(
  product: ProductMaster,
  landedCost: LandedCostResult,
  unitEcon: UnitEconomicsResult,
  verdict: VerdictResult
): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Summary
  const summaryRows = [
    ["India Market Viability Analysis", ""],
    ["Generated on", new Date().toLocaleString("en-IN")],
    ["", ""],
    ["PRODUCT INFORMATION", ""],
    ["Product Name", product.productName],
    ["Brand", product.brand],
    ["Category", product.category],
    ["Country of Origin", product.countryOfOrigin],
    ["HS Code", product.hsCode],
    ["Cost Type", "FOB"],
    ["Base Cost", `${product.currency} ${product.fobPrice ?? "—"}`],
    ["Selling Price (MRP)", `₹${inr(product.sellingPrice)}`],
    ["Marketplace", product.marketplace],
    ["", ""],
    ["KEY RESULTS", ""],
    ["Freight per unit (₹)", inr(landedCost.freightPerUnit)],
    ["Total Landed Cost (₹)", inr(landedCost.totalLandedCost)],
    ["Effective Duty Rate (%)", pct(landedCost.effectiveDutyRate)],
    ["Net Revenue (₹)", inr(unitEcon.netRevenue)],
    ["Total Costs (₹)", inr(unitEcon.totalCosts)],
    ["Net Profit (₹)", inr(unitEcon.netProfit)],
    ["Margin (%)", pct(unitEcon.marginPercent)],
    ["Break-Even Price (₹)", unitEcon.breakEvenPrice != null ? inr(unitEcon.breakEvenPrice) : "N/A"],
    ["", ""],
    ["VERDICT", verdict.verdict],
    ["Viability Score", `${verdict.score} / 100`],
    ["Market Position", verdict.position],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
  ws1["!cols"] = [{ wch: 30 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Summary");

  // Sheet 2: Landed Cost Breakdown
  const lcRows = [
    ["Component", "Amount (₹)"],
    ...landedCost.breakdown.map((b) => [b.label, b.value.toFixed(2)]),
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(lcRows);
  ws2["!cols"] = [{ wch: 38 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Landed Cost");

  // Sheet 3: Unit P&L Breakdown
  const ueRows = [
    ["Component", "Amount (₹)", "% of MRP"],
    ...unitEcon.breakdown.map((b) => [
      b.label,
      b.value.toFixed(2),
      `${((Math.abs(b.value) / product.sellingPrice) * 100).toFixed(1)}%`,
    ]),
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(ueRows);
  ws3["!cols"] = [{ wch: 40 }, { wch: 18 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws3, "Unit Economics");

  // Sheet 4: Recommendations
  const recRows = [
    ["Findings", ""],
    ...verdict.reasons.map((r) => ["✓", r]),
    ["", ""],
    ["Recommendations", ""],
    ...verdict.recommendations.map((r) => ["→", r]),
  ];
  const ws4 = XLSX.utils.aoa_to_sheet(recRows);
  ws4["!cols"] = [{ wch: 5 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, ws4, "Recommendations");

  const filename = `viability_${(product.productName || "product").replace(/\s+/g, "_").toLowerCase()}_${Date.now()}.xlsx`;
  XLSX.writeFile(wb, filename);
}

// ─── Portfolio Export ──────────────────────────────────────────────────────────

export function exportPortfolio(analyses: SavedAnalysis[]): void {
  const wb = XLSX.utils.book_new();

  const headers = [
    "Product Name", "HS Code", "Category", "Country",
    "Base Cost Type", "Freight (₹/unit)",
    "Import Duty (₹)", "Landed Cost (₹)",
    "Selling Price (₹)", "Total Costs (₹)",
    "Net Profit (₹)", "Margin (%)",
    "Verdict", "Score", "Saved On",
  ];

  const rows = analyses.map((a) => [
    a.productName,
    a.hsCode,
    a.category,
    a.countryOfOrigin,
    "FOB",
    inr(a.landedCost.freightPerUnit),
    inr(a.landedCost.totalDuty),
    inr(a.landedCost.totalLandedCost),
    inr(a.sellingPrice),
    inr(a.unitEconomics.totalCosts),
    inr(a.unitEconomics.netProfit),
    pct(a.unitEconomics.marginPercent),
    a.verdict.verdict,
    a.verdict.score,
    new Date(a.createdAt).toLocaleDateString("en-IN"),
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = headers.map(() => ({ wch: 18 }));
  ws["!cols"][0] = { wch: 28 };
  XLSX.utils.book_append_sheet(wb, ws, "Portfolio");

  XLSX.writeFile(wb, `india_viability_portfolio_${Date.now()}.xlsx`);
}

// ─── Bulk Results Export ───────────────────────────────────────────────────────

export function exportBulkResults(results: BulkResult[]): void {
  const wb = XLSX.utils.book_new();

  const headers = [
    "Product Name", "HS Code", "Cost Type", "Base Cost", "Currency",
    "Country", "Category", "Freight (₹/unit)",
    "Import Duty (₹)", "Landed Cost (₹)",
    "Selling Price (₹)", "Net Profit (₹)",
    "Margin (%)", "Verdict", "Score", "Error",
  ];

  const rows = results.map((r) => [
    r.row.productName,
    r.row.hsCode,
    r.row.costType,
    r.row.baseCost,
    r.row.currency,
    r.row.countryOfOrigin,
    r.row.category,
    inr(r.freightPerUnit),
    inr(r.totalDuty),
    inr(r.landedCost),
    inr(r.row.sellingPrice),
    inr(r.netProfit),
    pct(r.marginPercent),
    r.verdict,
    r.score,
    r.error ?? "",
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = headers.map(() => ({ wch: 16 }));
  XLSX.utils.book_append_sheet(wb, ws, "Bulk Results");

  XLSX.writeFile(wb, `india_viability_bulk_${Date.now()}.xlsx`);
}
