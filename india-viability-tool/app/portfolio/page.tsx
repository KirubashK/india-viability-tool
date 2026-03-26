"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  createColumnHelper, flexRender, getCoreRowModel,
  getSortedRowModel, getFilteredRowModel, useReactTable, SortingState,
} from "@tanstack/react-table";
import { getAllAnalyses, deleteAnalysis, renameAnalysis } from "@/lib/storage";
import { exportPortfolio } from "@/lib/exportUtils";
import { SavedAnalysis } from "@/types/calculation";
import { VerdictBadge } from "@/components/VerdictBadge";
import { Verdict } from "@/types/product";
import {
  Package, Home, Trash2, Download, Search,
  ArrowUpDown, ArrowUp, ArrowDown, Pencil, Check, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const col = createColumnHelper<SavedAnalysis>();

function fmt(v: number): string {
  return `₹${Math.round(v).toLocaleString("en-IN")}`;
}

function InlineRename({ id, name, onDone }: { id: string; name: string; onDone: () => void }) {
  const [val, setVal] = useState(name);
  const save = () => { if (val.trim()) renameAnalysis(id, val.trim()); onDone(); };
  return (
    <div className="flex items-center gap-1.5">
      <input autoFocus value={val} onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") onDone(); }}
        className="text-sm border border-indigo-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-300 w-48" />
      <button onClick={save} className="text-emerald-600 hover:text-emerald-700"><Check className="h-3.5 w-3.5" /></button>
      <button onClick={onDone} className="text-slate-400 hover:text-slate-600"><X className="h-3.5 w-3.5" /></button>
    </div>
  );
}

export default function PortfolioPage() {
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([]);
  const [sorting, setSorting] = useState<SortingState>([{ id: "date", desc: true }]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);

  const reload = useCallback(() => setAnalyses(getAllAnalyses()), []);
  useEffect(() => { reload(); }, [reload]);

  const handleDelete = (id: string) => {
    deleteAnalysis(id);
    reload();
  };

  const columns = [
    col.accessor("name", {
      header: "Analysis",
      cell: (info) => {
        const id = info.row.original.id;
        if (renamingId === id) {
          return <InlineRename id={id} name={info.getValue()} onDone={() => { setRenamingId(null); reload(); }} />;
        }
        return (
          <div className="flex items-center gap-2 group">
            <div>
              <p className="font-semibold text-slate-800 text-sm leading-tight">{info.getValue()}</p>
              <p className="text-xs text-slate-400">{info.row.original.productName}</p>
            </div>
            <button onClick={() => setRenamingId(id)}
              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 transition-opacity ml-1">
              <Pencil className="h-3 w-3" />
            </button>
          </div>
        );
      },
    }),
    col.accessor("category", {
      header: "Category",
      cell: (i) => <span className="text-xs text-slate-500">{i.getValue()}</span>,
    }),
    col.accessor("countryOfOrigin", {
      header: "Origin",
      cell: (i) => <span className="text-xs text-slate-600">{i.getValue()}</span>,
    }),
    col.accessor((r) => r.landedCost.totalLandedCost, {
      id: "landedCost", header: "Landed Cost",
      cell: (i) => <span className="font-mono text-sm text-slate-700">{fmt(i.getValue())}</span>,
    }),
    col.accessor("sellingPrice", {
      header: "MRP",
      cell: (i) => <span className="font-mono text-sm text-slate-700">{fmt(i.getValue())}</span>,
    }),
    col.accessor((r) => r.unitEconomics.netProfit, {
      id: "profit", header: "Net Profit",
      cell: (i) => {
        const v = i.getValue();
        return <span className={cn("font-mono text-sm font-semibold", v >= 0 ? "text-emerald-600" : "text-red-500")}>{fmt(v)}</span>;
      },
    }),
    col.accessor((r) => r.unitEconomics.marginPercent, {
      id: "margin", header: "Margin %",
      cell: (i) => {
        const v = i.getValue();
        const c = v >= 30 ? "text-emerald-600" : v >= 15 ? "text-amber-600" : "text-red-500";
        return <span className={cn("font-mono text-sm font-bold", c)}>{v.toFixed(1)}%</span>;
      },
    }),
    col.accessor((r) => r.verdict.verdict, {
      id: "verdict", header: "Verdict",
      cell: (i) => <VerdictBadge verdict={i.getValue() as Verdict} size="sm" />,
    }),
    col.accessor("createdAt", {
      id: "date", header: "Saved",
      cell: (i) => (
        <span className="text-xs text-slate-400">
          {new Date(i.getValue()).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      ),
    }),
    col.accessor("id", {
      id: "actions", header: "", enableSorting: false,
      cell: (i) => (
        <button onClick={() => handleDelete(i.getValue())}
          className="text-slate-300 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50">
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    }),
  ];

  const table = useReactTable({
    data: analyses,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const summary = analyses.length > 0 ? {
    go: analyses.filter((a) => a.verdict.verdict === "GO").length,
    borderline: analyses.filter((a) => a.verdict.verdict === "BORDERLINE").length,
    noGo: analyses.filter((a) => a.verdict.verdict === "NO_GO").length,
    avgMargin: analyses.reduce((s, a) => s + a.unitEconomics.marginPercent, 0) / analyses.length,
  } : null;

  return (
    <div className="min-h-screen bg-[#f8f9fc]">
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
              <p className="text-sm font-bold text-slate-800">Portfolio</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {analyses.length > 0 && (
              <button
                onClick={() => exportPortfolio(analyses)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Export Portfolio
              </button>
            )}
            <Link
              href="/product/new"
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-colors"
            >
              + New Analysis
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-xl px-6 py-8 space-y-6">
        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Total Analyses", value: analyses.length, sub: "saved", color: "text-slate-700" },
              { label: "GO", value: summary.go, sub: `${((summary.go / analyses.length) * 100).toFixed(0)}%`, color: "text-emerald-600" },
              { label: "Borderline", value: summary.borderline, sub: `${((summary.borderline / analyses.length) * 100).toFixed(0)}%`, color: "text-amber-600" },
              { label: "No-Go", value: summary.noGo, sub: `${((summary.noGo / analyses.length) * 100).toFixed(0)}%`, color: "text-red-500" },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                <p className={cn("mt-1 font-mono text-3xl font-bold", color)}>{value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="p-5 border-b border-slate-100 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search analyses…"
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-indigo-400 focus:outline-none"
              />
            </div>
          </div>

          {analyses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Package className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-500">No saved analyses yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Run an analysis and click "Save Analysis" to track it here.
              </p>
              <Link href="/product/new"
                className="mt-5 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">
                Start Analysis
              </Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    {table.getHeaderGroups().map((hg) => (
                      <tr key={hg.id}>
                        {hg.headers.map((header) => (
                          <th key={header.id} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                            {header.isPlaceholder ? null : (
                              <button
                                className={cn("flex items-center gap-1", header.column.getCanSort() && "cursor-pointer hover:text-slate-700")}
                                onClick={header.column.getToggleSortingHandler()}
                              >
                                {flexRender(header.column.columnDef.header, header.getContext())}
                                {header.column.getCanSort() && (
                                  header.column.getIsSorted() === "asc" ? <ArrowUp className="h-3 w-3" /> :
                                  header.column.getIsSorted() === "desc" ? <ArrowDown className="h-3 w-3" /> :
                                  <ArrowUpDown className="h-3 w-3 text-slate-300" />
                                )}
                              </button>
                            )}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {table.getRowModel().rows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-4 py-3">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-400 rounded-b-2xl">
                {table.getFilteredRowModel().rows.length} of {analyses.length} analyses
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="mt-12 border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-400">
        India Market Viability Tool · Portfolio
      </footer>
    </div>
  );
}
