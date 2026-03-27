"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { HS_CODES, HsCodeEntry } from "@/data/hsCodes";
import { Search, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface HsCodeSelectorProps {
  value: string;
  onChange: (code: string) => void;
  className?: string;
}

export function HsCodeSelector({ value, onChange, className }: HsCodeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = HS_CODES.find((h) => h.code === value);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return HS_CODES;
    return HS_CODES.filter(
      (h) =>
        h.code.startsWith(q) ||
        h.description.toLowerCase().includes(q) ||
        h.category.toLowerCase().includes(q)
    );
  }, [query]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const handleSelect = (entry: HsCodeEntry) => {
    onChange(entry.code);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 hover:border-slate-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
      >
        <span className={selected ? "text-slate-800" : "text-slate-400"}>
          {selected ? (
            <span>
              <span className="font-mono font-semibold">{selected.code}</span>
              <span className="text-slate-400 ml-2">— {selected.description.slice(0, 30)}</span>
            </span>
          ) : "Select HS code…"}
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-slate-400 transition-transform shrink-0", open && "rotate-180")} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
            <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by code or description…"
              className="w-full text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none bg-transparent"
            />
          </div>

          {/* Results */}
          <ul className="max-h-64 overflow-y-auto divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-xs text-slate-400 text-center">No HS codes match your search</li>
            ) : (
              filtered.map((h) => (
                <li key={h.code}>
                  <button
                    type="button"
                    onClick={() => handleSelect(h)}
                    className={cn(
                      "w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition-colors",
                      h.code === value && "bg-indigo-50"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="font-mono text-xs font-semibold text-indigo-700">{h.code}</span>
                        <span className="ml-2 text-xs text-slate-600 truncate">{h.description}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-xs text-slate-400">
                        <span title="BCD" className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">BCD {h.bcd}%</span>
                        <span title="IGST" className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">GST {h.igst}%</span>
                      </div>
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>

          {filtered.length > 0 && (
            <div className="border-t border-slate-100 bg-slate-50 px-3 py-1.5 text-xs text-slate-400">
              {filtered.length} of {HS_CODES.length} codes
            </div>
          )}
        </div>
      )}
    </div>
  );
}
