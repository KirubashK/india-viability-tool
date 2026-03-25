import * as XLSX from "xlsx";
import { LandedCostResult, UnitEconomicsResult, VerdictResult } from "@/types/calculation";
import { ProductMaster } from "@/types/product";

export function exportToExcel(
  product: ProductMaster,
  landedCost: LandedCostResult,
  unitEcon: UnitEconomicsResult,
  verdict: VerdictResult
): void {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Summary ──────────────────────────────────────────────────────
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
    ["FOB Price", `${product.currency} ${product.fobPrice}`],
    ["Selling Price (MRP)", `₹ ${product.sellingPrice.toLocaleString("en-IN")}`],
    ["Marketplace", product.marketplace],
    ["", ""],
    ["KEY RESULTS", ""],
    ["Total Landed Cost (₹)", landedCost.totalLandedCost.toFixed(2)],
    ["Effective Duty Rate (%)", landedCost.effectiveDutyRate.toFixed(1)],
    ["Net Revenue (₹)", unitEcon.netRevenue.toFixed(2)],
    ["Total Costs (₹)", unitEcon.totalCosts.toFixed(2)],
    ["Net Profit (₹)", unitEcon.profit.toFixed(2)],
    ["Margin (%)", unitEcon.margin.toFixed(1)],
    ["Break-Even Price (₹)", unitEcon.breakEvenPrice.toFixed(0)],
    ["", ""],
    ["VERDICT", verdict.verdict],
    ["Viability Score", `${verdict.score} / 100`],
    ["Market Position", verdict.position],
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
  ws1["!cols"] = [{ wch: 30 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Summary");

  // ── Sheet 2: Landed Cost Breakdown ───────────────────────────────────────
  const lcRows = [
    ["Component", "Amount (₹)"],
    ...landedCost.breakdown.map((b) => [b.label, b.value.toFixed(2)]),
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(lcRows);
  ws2["!cols"] = [{ wch: 35 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Landed Cost");

  // ── Sheet 3: Unit Economics Breakdown ────────────────────────────────────
  const ueRows = [
    ["Component", "Amount (₹)", "% of MRP"],
    ...unitEcon.breakdown.map((b) => [
      b.label,
      b.value.toFixed(2),
      ((Math.abs(b.value) / product.sellingPrice) * 100).toFixed(1) + "%",
    ]),
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(ueRows);
  ws3["!cols"] = [{ wch: 40 }, { wch: 18 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws3, "Unit Economics");

  // ── Sheet 4: Recommendations ─────────────────────────────────────────────
  const recRows = [
    ["Reasons / Findings", ""],
    ...verdict.reasons.map((r) => ["✓", r]),
    ["", ""],
    ["Recommendations", ""],
    ...verdict.recommendations.map((r) => ["→", r]),
  ];
  const ws4 = XLSX.utils.aoa_to_sheet(recRows);
  ws4["!cols"] = [{ wch: 5 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, ws4, "Recommendations");

  // Save
  const filename = `viability_${(product.productName || "product")
    .replace(/\s+/g, "_")
    .toLowerCase()}_${Date.now()}.xlsx`;
  XLSX.writeFile(wb, filename);
}
