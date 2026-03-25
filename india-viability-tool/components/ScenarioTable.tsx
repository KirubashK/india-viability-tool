"use client";

import React, { useState, useMemo } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  SortingState,
} from "@tanstack/react-table";
import { useScenarioStore, SavedScenario } from "@/store/scenarioStore";
import { useProductStore } from "@/store/productStore";
import { VerdictBadge } from "./VerdictBadge";
import { formatInr } from "@/lib/utils";
import {
  Trash2,
  GitCompare,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  BookmarkPlus,
  CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

const col = createColumnHelper<SavedScenario>();

interface ScenarioTableProps {
  onOpenCompare: () => void;
}

export function ScenarioTable({ onOpenCompare }: ScenarioTableProps) {
  const { scenarios, deleteScenario, toggleCompare, compareIds } = useScenarioStore();
  const { product, landedCostResult, unitEconomicsResult, verdictResult } = useProductStore();
  const { saveScenario } = useScenarioStore();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");

  const handleSave = () => {
    if (!landedCostResult || !unitEconomicsResult || !verdictResult) return;
    const name = saveName.trim() || `${product.productName || "Product"} – ${new Date().toLocaleDateString("en-IN")}`;
    saveScenario(name, product, landedCostResult, unitEconomicsResult, verdictResult);
    setSaveName("");
    setSaveDialogOpen(false);
  };

  const columns = useMemo(
    () => [
      col.accessor("name", {
        header: "Scenario",
        cell: (info) => (
          <div>
            <p className="font-semibold text-slate-800 text-sm">{info.getValue()}</p>
            <p className="text-xs text-slate-400">
              {new Date(info.row.original.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        ),
      }),
      col.accessor((row) => row.product.productName, {
        id: "product",
        header: "Product",
        cell: (info) => (
          <div>
            <p className="text-sm text-slate-700">{info.getValue()}</p>
            <p className="text-xs text-slate-400">{info.row.original.product.brand}</p>
          </div>
        ),
      }),
      col.accessor((row) => row.product.marketplace, {
        id: "marketplace",
        header: "Marketplace",
        cell: (info) => (
          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
            {info.getValue()}
          </span>
        ),
      }),
      col.accessor((row) => row.landedCost.totalLandedCost, {
        id: "landedCost",
        header: "Landed Cost",
        cell: (info) => (
          <span className="font-mono text-sm font-semibold text-slate-700">
            {formatInr(info.getValue(), true)}
          </span>
        ),
      }),
      col.accessor((row) => row.product.sellingPrice, {
        id: "mrp",
        header: "MRP",
        cell: (info) => (
          <span className="font-mono text-sm text-slate-700">
            {formatInr(info.getValue(), true)}
          </span>
        ),
      }),
      col.accessor((row) => row.unitEconomics.margin, {
        id: "margin",
        header: "Margin %",
        cell: (info) => {
          const v = info.getValue();
          const color = v >= 30 ? "text-emerald-600" : v >= 15 ? "text-amber-600" : "text-red-600";
          return (
            <span className={cn("font-mono font-bold text-sm", color)}>
              {v.toFixed(1)}%
            </span>
          );
        },
      }),
      col.accessor((row) => row.verdict.verdict, {
        id: "verdict",
        header: "Verdict",
        cell: (info) => (
          <VerdictBadge verdict={info.getValue()} size="sm" />
        ),
      }),
      col.accessor("id", {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: (info) => {
          const id = info.getValue();
          const isCompared = compareIds.includes(id);
          return (
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleCompare(id)}
                title={isCompared ? "Remove from compare" : "Add to compare (max 3)"}
                className={cn(
                  "rounded-lg p-1.5 transition-colors",
                  isCompared
                    ? "bg-indigo-100 text-indigo-600"
                    : "text-slate-400 hover:bg-slate-100 hover:text-slate-600",
                  compareIds.length >= 3 && !isCompared && "cursor-not-allowed opacity-40"
                )}
              >
                <CheckSquare className="h-4 w-4" />
              </button>
              <button
                onClick={() => deleteScenario(id)}
                className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        },
      }),
    ],
    [compareIds, deleteScenario, toggleCompare]
  );

  const table = useReactTable({
    data: scenarios,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search scenarios…"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {compareIds.length >= 2 && (
          <button
            onClick={onOpenCompare}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-colors"
          >
            <GitCompare className="h-4 w-4" />
            Compare ({compareIds.length})
          </button>
        )}

        {/* Save current scenario */}
        {landedCostResult && !saveDialogOpen && (
          <button
            onClick={() => setSaveDialogOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <BookmarkPlus className="h-4 w-4" />
            Save Current
          </button>
        )}

        {saveDialogOpen && (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              type="text"
              placeholder="Scenario name…"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setSaveDialogOpen(false); }}
              className="rounded-lg border border-indigo-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            <button
              onClick={handleSave}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Save
            </button>
            <button
              onClick={() => setSaveDialogOpen(false)}
              className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {scenarios.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-12 text-center">
          <BookmarkPlus className="mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No saved scenarios yet</p>
          <p className="mt-1 text-xs text-slate-400">
            Run an analysis, then click "Save Current" to bookmark it for comparison.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-slate-200">
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          className={cn(
                            "flex items-center gap-1",
                            header.column.getCanSort() && "cursor-pointer hover:text-slate-700"
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <span className="text-slate-300">
                              {header.column.getIsSorted() === "asc" ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : header.column.getIsSorted() === "desc" ? (
                                <ArrowDown className="h-3 w-3" />
                              ) : (
                                <ArrowUpDown className="h-3 w-3" />
                              )}
                            </span>
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
                <tr
                  key={row.id}
                  className={cn(
                    "transition-colors hover:bg-slate-50",
                    compareIds.includes(row.original.id) && "bg-indigo-50/50"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-400">
            {table.getFilteredRowModel().rows.length} scenario{table.getFilteredRowModel().rows.length !== 1 ? "s" : ""}
            {compareIds.length > 0 && ` · ${compareIds.length} selected for comparison`}
          </div>
        </div>
      )}
    </div>
  );
}
