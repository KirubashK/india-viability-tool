"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  createColumnHelper, flexRender, getCoreRowModel,
  getSortedRowModel, getFilteredRowModel, useReactTable, SortingState,
} from "@tanstack/react-table";
import { parseExcel, processBulkProducts, downloadBulkTemplate } from "@/lib/bulkProcessor";
import { exportBulkResults } from "@/lib/exportUtils";
import { BulkResult } from "@/types/calculation";
import { VerdictBadge } from "./VerdictBadge";
import { Verdict } from "@/types/product";
import {
  Upload, Download, FileSpreadsheet, AlertCircle, X,
  ArrowUpDown, ArrowUp, ArrowDown, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

const col = createColumnHelper<BulkResult>();

function fmt(v: number): string {
  return `₹${Math.round(v).toLocaleString("en-IN")}`;
}

const columns = [
  col.accessor((r) => r.row.productName, {
    id: "name", header: "Product",
    cell: (i) => (
      <div>
        <p className="font-medium text-sm text-slate-800 truncate max-w-[180px]">{i.getValue()}</p>
        <p className="text-xs text-slate-400">{i.row.original.row.hsCode} · {i.row.original.row.countryOfOrigin}</p>
      </div>
    ),
  }),
  col.accessor((r) => r.row.category, {
    id: "category", header: "Category",
    cell: (i) => <span className="text-xs text-slate-600">{i.getValue()}</span>,
  }),
  col.accessor("freightPerUnit", {
    header: "Freight/unit",
    cell: (i) => <span className="font-mono text-sm text-slate-700">{fmt(i.getValue())}</span>,
  }),
  col.accessor("landedCost", {
    header: "Landed Cost",
    cell: (i) => <span className="font-mono text-sm text-slate-700">{fmt(i.getValue())}</span>,
  }),
  col.accessor((r) => r.row.sellingPrice, {
    id: "mrp", header: "MRP",
    cell: (i) => <span className="font-mono text-sm text-slate-700">{fmt(i.getValue())}</span>,
  }),
  col.accessor("netProfit", {
    header: "Net Profit",
    cell: (i) => {
      const v = i.getValue();
      return <span className={cn("font-mono text-sm font-semibold", v >= 0 ? "text-emerald-600" : "text-red-500")}>{fmt(v)}</span>;
    },
  }),
  col.accessor("marginPercent", {
    header: "Margin %",
    cell: (i) => {
      const v = i.getValue();
      const c = v >= 30 ? "text-emerald-600" : v >= 15 ? "text-amber-600" : "text-red-600";
      return <span className={cn("font-mono text-sm font-bold", c)}>{v.toFixed(1)}%</span>;
    },
  }),
  col.accessor("verdict", {
    header: "Verdict",
    cell: (i) => <VerdictBadge verdict={i.getValue() as Verdict} size="sm" />,
  }),
  col.accessor("error", {
    header: "",
    enableSorting: false,
    cell: (i) => i.getValue()
      ? <span title={i.getValue()} className="text-xs text-red-500"><AlertCircle className="h-4 w-4" /></span>
      : null,
  }),
];

export function BulkUpload() {
  const [results, setResults] = useState<BulkResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const table = useReactTable({
    data: results,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const processFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setError("Please upload an Excel file (.xlsx or .xls)");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await parseExcel(file);
      const processed = processBulkProducts(rows);
      setResults(processed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to process file");
    } finally {
      setLoading(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const summary = results.length > 0 ? {
    go: results.filter((r) => r.verdict === "GO").length,
    borderline: results.filter((r) => r.verdict === "BORDERLINE").length,
    noGo: results.filter((r) => r.verdict === "NO_GO").length,
    avgMargin: results.reduce((s, r) => s + r.marginPercent, 0) / results.length,
  } : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-700">Bulk SKU Analysis</h3>
          <p className="text-xs text-slate-400 mt-0.5">Upload up to 50 products for instant viability screening</p>
        </div>
        <button
          onClick={downloadBulkTemplate}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Download Template
        </button>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 cursor-pointer transition-all",
          isDragging ? "border-indigo-400 bg-indigo-50" : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-white",
          loading && "pointer-events-none opacity-60"
        )}
      >
        <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onFileChange} />
        <FileSpreadsheet className={cn("h-10 w-10 mb-3", isDragging ? "text-indigo-500" : "text-slate-400")} />
        {loading ? (
          <p className="text-sm text-slate-500 font-medium">Processing…</p>
        ) : (
          <>
            <p className="text-sm font-semibold text-slate-700">Drop Excel file here, or click to browse</p>
            <p className="text-xs text-slate-400 mt-1">Columns: Product Name · HS Code · Cost Type · Cost · Country · L/W/H · Weight · Selling Price · Category</p>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Summary strip */}
      {summary && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total SKUs", value: results.length, color: "text-slate-700" },
            { label: "GO", value: summary.go, color: "text-emerald-600" },
            { label: "Borderline", value: summary.borderline, color: "text-amber-600" },
            { label: "No-Go", value: summary.noGo, color: "text-red-500" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
              <p className="text-xs text-slate-400">{label}</p>
              <p className={cn("text-2xl font-bold font-mono", color)}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Results table */}
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search products…"
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-indigo-400 focus:outline-none"
              />
            </div>
            <button
              onClick={() => exportBulkResults(results)}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
            >
              <Download className="h-4 w-4" />
              Export Results
            </button>
            <button
              onClick={() => { setResults([]); setGlobalFilter(""); }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"
            >
              Clear
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
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
                <tbody className="divide-y divide-slate-100 bg-white">
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
            <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-400">
              {table.getFilteredRowModel().rows.length} product{table.getFilteredRowModel().rows.length !== 1 ? "s" : ""}
              {results.length !== table.getFilteredRowModel().rows.length && ` (filtered from ${results.length})`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
