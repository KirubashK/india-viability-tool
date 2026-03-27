"use client";

import React, { useMemo, useCallback, useState, useEffect } from "react";
import { useProductStore } from "@/store/productStore";
import {
  calculateLandedCost,
  calculateUnitEconomics,
  calculateMarketPosition,
  getVerdict,
} from "@/lib/calculations";
import { KpiCard } from "@/components/KpiCard";
import { VerdictBadge } from "@/components/VerdictBadge";
import { WaterfallChart } from "@/components/WaterfallChart";
import { RecommendationsPanel } from "@/components/RecommendationsPanel";
import { ValueChainForm } from "@/components/ValueChainForm";
import { UnitEconomicsForm } from "@/components/UnitEconomicsForm";
import { ProductMasterForm } from "@/components/ProductMasterForm";
import { CostBreakdownTable } from "@/components/CostBreakdownTable";
import { ScenarioTable } from "@/components/ScenarioTable";
import { ScenarioCompareModal } from "@/components/ScenarioCompareModal";
import { SensitivityAnalysis } from "@/components/SensitivityAnalysis";
import { MarketPositionChart } from "@/components/MarketPositionChart";
import { exportToExcel } from "@/lib/exportUtils";
import { formatInr, formatPercent } from "@/lib/utils";
import { BulkUpload } from "@/components/BulkUpload";
import { SaveAnalysisButton } from "@/components/SaveAnalysisButton";
import {
  Package, TrendingUp, DollarSign, Percent, BarChart2,
  Download, RefreshCw, ChevronRight, Layers, ShoppingBag,
  Target, BookOpen, Activity, GitCompare, Home, Upload, FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

type ActiveTab = "analysis" | "sensitivity" | "scenarios" | "bulk";

export default function ProductAnalysisPage() {
  const {
    product, valueChain, unitEconomics, competitorPrices,
    landedCostResult, unitEconomicsResult, marketPositionResult,
    verdictResult, setResults, setIsCalculating, isCalculating, hasCalculated,
  } = useProductStore();

  const [activeTab, setActiveTab] = useState<ActiveTab>("analysis");
  const [compareOpen, setCompareOpen] = useState(false);

  const [includeGstInLandedCost, setIncludeGstInLandedCost] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("includeGst");
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem("includeGst", JSON.stringify(includeGstInLandedCost));
  }, [includeGstInLandedCost]);

  // Instant IGST toggle: when the toggle changes after an analysis has run,
  // recompute unit economics using the already-stored landed cost result.
  // Does NOT rerun calculateLandedCost — only the unit econ layer changes.
  useEffect(() => {
    if (!landedCostResult) return;
    const marginLandedCost = includeGstInLandedCost
      ? landedCostResult.totalLandedCost
      : (landedCostResult.landedCostExclGst ?? landedCostResult.totalLandedCost);
    const ueInputs = { ...unitEconomics, landedCost: marginLandedCost };
    const unitEcon = calculateUnitEconomics(ueInputs);
    const effectiveSellingPrice = unitEcon.sellingPrice > 0 ? unitEcon.sellingPrice : 0;
    const market = competitorPrices.length > 0
      ? calculateMarketPosition({ sellingPrice: effectiveSellingPrice, competitorPrices })
      : null;
    const verdict = getVerdict(unitEcon.marginPercent, market?.position ?? "AT", product.category);
    setResults({ landed: landedCostResult, unitEcon, market, verdict });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeGstInLandedCost]);

  const runAnalysis = useCallback(() => {
    setIsCalculating(true);
    setTimeout(() => {
      try {
        const landed = calculateLandedCost(valueChain);
        // IGST toggle: when false (default) use landedCostExclGst — IGST is recoverable
        // via ITC on marketplace sales so it shouldn't reduce the margin.
        // When true, include IGST in landed cost (correct for non-ITC scenarios).
        const marginLandedCost = includeGstInLandedCost
          ? landed.totalLandedCost
          : (landed.landedCostExclGst ?? landed.totalLandedCost);
        const ueInputs = { ...unitEconomics, landedCost: marginLandedCost };
        const unitEcon = calculateUnitEconomics(ueInputs);
        // Use ONLY the resolved price from unitEcon — never fall back to the stale
        // product.sellingPrice. If RECOMMEND mode failed (sellingPrice=0), market
        // position receives 0 and returns safe neutral outputs.
        const effectiveSellingPrice = unitEcon.sellingPrice > 0 ? unitEcon.sellingPrice : 0;
        const market = competitorPrices.length > 0
          ? calculateMarketPosition({ sellingPrice: effectiveSellingPrice, competitorPrices })
          : null;
        const verdict = getVerdict(unitEcon.marginPercent, market?.position ?? "AT", product.category);
        setResults({ landed, unitEcon, market, verdict });
      } catch (e) {
        console.error("Analysis error:", e);
        setIsCalculating(false);
      }
    }, 350);
  }, [valueChain, unitEconomics, competitorPrices, product, includeGstInLandedCost, setIsCalculating, setResults]);

  const handleExport = useCallback(() => {
    if (landedCostResult && unitEconomicsResult && verdictResult) {
      exportToExcel(product, landedCostResult, unitEconomicsResult, verdictResult);
    }
  }, [product, landedCostResult, unitEconomicsResult, verdictResult]);

  const verdictVariant = useMemo(() => {
    if (!verdictResult) return "default" as const;
    return verdictResult.verdict === "GO" ? "success" as const
      : verdictResult.verdict === "BORDERLINE" ? "warning" as const
      : "danger" as const;
  }, [verdictResult]);

  const tabs: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
    { id: "analysis", label: "Analysis", icon: BarChart2 },
    { id: "sensitivity", label: "Sensitivity", icon: Activity },
    { id: "scenarios", label: "Scenarios", icon: GitCompare },
    { id: "bulk", label: "Bulk", icon: Upload },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 transition-colors">
              <Home className="h-4 w-4" />
            </Link>
            <span className="text-slate-300">/</span>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
                <Package className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold leading-tight text-slate-800">{product.productName || "New Analysis"}</p>
                {product.brand && <p className="text-xs leading-tight text-slate-400">{product.brand}</p>}
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={cn("flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all",
                  activeTab === id ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                <Icon className="h-3.5 w-3.5" />{label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link href="/portfolio"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
              <FolderOpen className="h-3.5 w-3.5" />
              Portfolio
            </Link>
            <SaveAnalysisButton />
            {/* IGST toggle — switches instantly without re-running analysis */}
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
              <button
                type="button"
                onClick={() => setIncludeGstInLandedCost(false)}
                className={cn(
                  "px-3 py-2 transition-colors",
                  !includeGstInLandedCost
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-slate-500 hover:bg-slate-50"
                )}
              >
                IGST Excluded
              </button>
              <button
                type="button"
                onClick={() => setIncludeGstInLandedCost(true)}
                className={cn(
                  "px-3 py-2 transition-colors border-l border-slate-200",
                  includeGstInLandedCost
                    ? "bg-amber-500 text-white"
                    : "bg-white text-slate-500 hover:bg-slate-50"
                )}
              >
                IGST Included
              </button>
            </div>
            {hasCalculated && (
              <button onClick={handleExport}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                <Download className="h-3.5 w-3.5" />Export
              </button>
            )}
            <button onClick={runAnalysis} disabled={isCalculating}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-60 transition-all">
              {isCalculating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <BarChart2 className="h-3.5 w-3.5" />}
              {isCalculating ? "Analysing…" : "Run Analysis"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-xl px-6 py-8 space-y-8">
        {/* KPI Strip */}
        {hasCalculated && landedCostResult && unitEconomicsResult && verdictResult && (
          <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <KpiCard label="Landed Cost" value={formatInr(landedCostResult.totalLandedCost, true)}
              subValue={`Duty: ${landedCostResult.effectiveDutyRate.toFixed(1)}% effective`}
              icon={<Package className="h-4 w-4" />} loading={isCalculating} />
            <KpiCard label="Selling Price (MRP)"
              value={unitEconomicsResult.recommendedSellingPrice != null
                ? formatInr(unitEconomicsResult.recommendedSellingPrice, true)
                : formatInr(unitEconomicsResult.sellingPrice, true)}
              subValue={unitEconomicsResult.recommendedSellingPrice != null
                ? `Recommended for target margin`
                : `Net rev: ${formatInr(unitEconomicsResult.netRevenue, true)}`}
              variant={unitEconomicsResult.recommendedSellingPrice != null ? "success" : "default"}
              icon={<ShoppingBag className="h-4 w-4" />} loading={isCalculating} />
            <KpiCard label="Net Profit / Unit" value={formatInr(unitEconomicsResult.netProfit, true)}
              subValue={unitEconomicsResult.breakEvenPrice != null ? `Break-even ₹${unitEconomicsResult.breakEvenPrice.toFixed(0)}` : "Break-even: N/A"}
              variant={unitEconomicsResult.netProfit > 0 ? "success" : "danger"}
              trend={unitEconomicsResult.netProfit > 0 ? "up" : "down"}
              trendLabel={unitEconomicsResult.netProfit > 0 ? "Profitable" : "Loss-making"}
              icon={<DollarSign className="h-4 w-4" />} loading={isCalculating} />
            <KpiCard label="Margin %" value={formatPercent(unitEconomicsResult.marginPercent)}
              subValue={`Score: ${verdictResult.score}/100`}
              variant={unitEconomicsResult.marginPercent >= 30 ? "success" : unitEconomicsResult.marginPercent >= 15 ? "warning" : "danger"}
              trend={unitEconomicsResult.marginPercent >= 25 ? "up" : unitEconomicsResult.marginPercent >= 10 ? "neutral" : "down"}
              trendLabel={unitEconomicsResult.marginPercent >= 30 ? "Strong" : unitEconomicsResult.marginPercent >= 15 ? "Acceptable" : "Needs work"}
              icon={<Percent className="h-4 w-4" />} loading={isCalculating} />
            <KpiCard label="Verdict" value={verdictResult.verdict.replace("_", "-")}
              subValue={`${verdictResult.position.toLowerCase()} market`}
              variant={verdictVariant} icon={<Target className="h-4 w-4" />} loading={isCalculating} />
          </section>
        )}

        {hasCalculated && verdictResult && (
          <VerdictBadge verdict={verdictResult.verdict} score={verdictResult.score} size="lg" />
        )}

        {/* Mobile tabs */}
        <div className="flex md:hidden items-center gap-1 rounded-xl bg-slate-100 p-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={cn("flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold transition-all",
                activeTab === id ? "bg-white text-slate-800 shadow-sm" : "text-slate-500")}>
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          ))}
        </div>

        {/* ── TAB: ANALYSIS ──────────────────────────────────────────────── */}
        {activeTab === "analysis" && (
          <>
            <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <FormCard step="1" icon={Layers} label="Product Master"><ProductMasterForm /></FormCard>
              <FormCard step="2" icon={TrendingUp} label="Value Chain & Landed Cost"><ValueChainForm /></FormCard>
              <FormCard step="3" icon={BarChart2} label="Unit Economics"><UnitEconomicsForm /></FormCard>
            </section>

            {!hasCalculated && (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white py-16 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50">
                  <BarChart2 className="h-7 w-7 text-indigo-400" />
                </div>
                <p className="text-lg font-bold text-slate-700">Ready to analyse?</p>
                <p className="mt-1 max-w-sm text-sm text-slate-400">
                  Fill in the details above, then click <strong>Run Analysis</strong>.
                </p>
                <button onClick={runAnalysis}
                  className="mt-6 flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">
                  <BarChart2 className="h-4 w-4" />Run Analysis<ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {hasCalculated && landedCostResult && unitEconomicsResult && verdictResult && (
              <section className="space-y-5">
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <ResultCard title="Landed Cost Waterfall" subtitle="FOB → CIF → Duties → Total" icon={Package}>
                    <WaterfallChart breakdown={landedCostResult.breakdown} />
                  </ResultCard>
                  <ResultCard title="Unit P&L Waterfall" subtitle="MRP → Deductions → Net Profit" icon={TrendingUp}>
                    <WaterfallChart breakdown={unitEconomicsResult.breakdown} />
                  </ResultCard>
                </div>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <ResultCard title="Landed Cost Breakdown" icon={BookOpen}>
                    <CostBreakdownTable items={landedCostResult.breakdown} />
                  </ResultCard>
                  <ResultCard title="Unit P&L Breakdown" icon={BookOpen}>
                    <CostBreakdownTable items={unitEconomicsResult.breakdown} />
                  </ResultCard>
                </div>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <ResultCard title="Margin & Cost Structure" icon={Percent}>
                    <MarginPanel
                      marginPercent={unitEconomicsResult.marginPercent}
                      breakEven={unitEconomicsResult.breakEvenPrice}
                      sellingPrice={unitEconomicsResult.sellingPrice}
                      landedRatio={(landedCostResult.totalLandedCost / Math.max(1, unitEconomicsResult.sellingPrice)) * 100}
                      marketingCost={unitEconomicsResult.marketingCost}
                      logisticsCost={unitEconomicsResult.logisticsCost}
                      marketplaceFees={unitEconomicsResult.marketplaceFees}
                    />
                  </ResultCard>

                  {marketPositionResult ? (
                    <ResultCard title="Market Positioning" icon={Target}>
                      <MarketPositionChart result={marketPositionResult} />
                    </ResultCard>
                  ) : (
                    <div className="flex items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-10 text-center">
                      <div>
                        <Target className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                        <p className="text-sm font-medium text-slate-500">No competitor prices added</p>
                        <p className="mt-1 text-xs text-slate-400">Add them in Step 3 to see market positioning.</p>
                      </div>
                    </div>
                  )}
                </div>

                <ResultCard title="Recommendations & Insights" icon={Activity}>
                  <RecommendationsPanel verdict={verdictResult} landedCost={landedCostResult}
                    category={product.category} sellingPrice={unitEconomicsResult.sellingPrice} />
                </ResultCard>
              </section>
            )}
          </>
        )}

        {/* ── TAB: SENSITIVITY ───────────────────────────────────────────── */}
        {activeTab === "sensitivity" && (
          <section className="space-y-5">
            {!hasCalculated ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white py-16 text-center">
                <Activity className="mb-3 h-10 w-10 text-slate-300" />
                <p className="text-sm font-medium text-slate-500">Run an analysis first</p>
                <button onClick={() => setActiveTab("analysis")} className="mt-4 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                  Go to Analysis →
                </button>
              </div>
            ) : (
              <>
                <ResultCard title="Sensitivity Analysis" subtitle="Model how margin responds to changes in key variables" icon={Activity}>
                  <SensitivityAnalysis />
                </ResultCard>
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-5 py-4 text-sm text-amber-700">
                  <strong>How to read this:</strong> The green line shows margin % change as the variable moves ±range from current value. Use it to stress-test pricing and procurement scenarios before committing.
                </div>
              </>
            )}
          </section>
        )}

        {/* ── TAB: SCENARIOS ─────────────────────────────────────────────── */}
        {activeTab === "scenarios" && (
          <section>
            <ResultCard title="Saved Scenarios" subtitle="Save current analysis · Select 2–3 · Compare side-by-side" icon={GitCompare}>
              <ScenarioTable onOpenCompare={() => setCompareOpen(true)} />
            </ResultCard>
          </section>
        )}

        {/* ── TAB: BULK ──────────────────────────────────────────────────── */}
        {activeTab === "bulk" && (
          <section>
            <ResultCard title="Bulk SKU Analysis" subtitle="Upload an Excel file to screen up to 50 products at once" icon={Upload}>
              <BulkUpload />
            </ResultCard>
          </section>
        )}
      </main>

      {compareOpen && <ScenarioCompareModal onClose={() => setCompareOpen(false)} />}

      <footer className="mt-16 border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-400">
        India Market Viability Tool · Duty rates are indicative — verify with a licensed customs broker.
      </footer>
    </div>
  );
}

function FormCard({ step, icon: Icon, label, children }: { step: string; icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-2.5">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-black text-white">{step}</div>
        <div className="flex items-center gap-1.5 text-slate-600">
          <Icon className="h-3.5 w-3.5" />
          <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
        </div>
      </div>
      {children}
    </div>
  );
}

function ResultCard({ title, subtitle, icon: Icon, children }: { title: string; subtitle?: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-bold text-slate-700">{title}</h2>
        </div>
        {subtitle && <p className="mt-0.5 pl-6 text-xs text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

interface MarginPanelProps {
  marginPercent: number;
  breakEven: number | null;
  sellingPrice: number;
  landedRatio: number;
  marketingCost: number;
  logisticsCost: number;
  marketplaceFees: number;
}

function MarginPanel({ marginPercent, breakEven, sellingPrice, landedRatio, marketingCost, logisticsCost, marketplaceFees }: MarginPanelProps) {
  const clamped = Math.max(0, Math.min(100, marginPercent));
  const gaugeColor = marginPercent >= 30 ? "#10b981" : marginPercent >= 15 ? "#f59e0b" : "#f43f5e";
  const textColor = marginPercent >= 30 ? "text-emerald-600" : marginPercent >= 15 ? "text-amber-500" : "text-red-500";

  const pieces = [
    { label: "Landed", pct: landedRatio, color: "#6366f1" },
    { label: "Mkt. Fees", pct: (marketplaceFees / sellingPrice) * 100, color: "#8b5cf6" },
    { label: "Logistics", pct: (logisticsCost / sellingPrice) * 100, color: "#ec4899" },
    { label: "Marketing", pct: (marketingCost / sellingPrice) * 100, color: "#f59e0b" },
    { label: "Profit", pct: Math.max(0, marginPercent), color: "#10b981" },
  ];

  const breakEvenDisplay = breakEven != null ? `₹${breakEven.toFixed(0)}` : "N/A";
  const headroomDisplay = breakEven != null ? formatInr(Math.max(0, sellingPrice - breakEven), true) : "N/A";

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-1.5 flex items-end justify-between">
          <p className="text-xs text-slate-400">Net Margin</p>
          <p className={cn("font-mono text-3xl font-black", textColor)}>{marginPercent.toFixed(1)}%</p>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${clamped}%`, backgroundColor: gaugeColor }} />
        </div>
        <div className="mt-1 flex justify-between text-xs text-slate-400">
          <span>0%</span>
          <span>Break-even: {breakEvenDisplay}</span>
          <span>50%</span>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs text-slate-400">Cost Structure (% of MRP)</p>
        <div className="flex h-8 w-full overflow-hidden rounded-lg">
          {pieces.map((p) => (
            <div key={p.label} className="flex items-center justify-center text-xs font-bold text-white"
              style={{ width: `${Math.max(p.pct, 0)}%`, backgroundColor: p.color }}
              title={`${p.label}: ${p.pct.toFixed(1)}%`}>
              {p.pct > 8 && `${p.pct.toFixed(0)}%`}
            </div>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {pieces.map((p) => (
            <span key={p.label} className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
              {p.label} ({Math.max(0, p.pct).toFixed(1)}%)
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "MRP", value: formatInr(sellingPrice, true) },
          { label: "Break-Even", value: breakEvenDisplay },
          { label: "Headroom", value: headroomDisplay },
          { label: "Landed Ratio", value: `${landedRatio.toFixed(1)}%` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-400">{label}</p>
            <p className="font-mono text-sm font-bold text-slate-700 mt-0.5">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
