"use client";

import React, { useState } from "react";
import { useProductStore } from "@/store/productStore";
import { saveAnalysis } from "@/lib/storage";
import { BookmarkPlus, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function SaveAnalysisButton() {
  const { product, landedCostResult, unitEconomicsResult, verdictResult, hasCalculated } = useProductStore();
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState("");
  const [showInput, setShowInput] = useState(false);

  if (!hasCalculated || !landedCostResult || !unitEconomicsResult || !verdictResult) return null;

  const handleSave = () => {
    const finalName = name.trim() || `${product.productName || "Product"} — ${new Date().toLocaleDateString("en-IN")}`;
    saveAnalysis({
      name: finalName,
      landedCost: landedCostResult,
      unitEconomics: unitEconomicsResult,
      verdict: verdictResult,
      productName: product.productName || "Unnamed Product",
      hsCode: product.hsCode,
      category: product.category,
      sellingPrice: product.sellingPrice,
      marketplace: product.marketplace,
      countryOfOrigin: product.countryOfOrigin,
    });
    setSaved(true);
    setShowInput(false);
    setName("");
    setTimeout(() => setSaved(false), 2500);
  };

  if (saved) {
    return (
      <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">
        <Check className="h-3.5 w-3.5" />
        Saved to portfolio
      </div>
    );
  }

  if (showInput) {
    return (
      <div className="flex items-center gap-2">
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setShowInput(false); }}
          placeholder={`${product.productName || "Product"} — ${new Date().toLocaleDateString("en-IN")}`}
          className="rounded-lg border border-indigo-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-100 w-64"
        />
        <button onClick={handleSave} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700">
          Save
        </button>
        <button onClick={() => setShowInput(false)} className="text-xs text-slate-400 hover:text-slate-600 px-2">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowInput(true)}
      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
    >
      <BookmarkPlus className="h-3.5 w-3.5" />
      Save Analysis
    </button>
  );
}
