"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useProductStore } from "@/store/productStore";
import { ProductMaster, Category } from "@/types/product";
import { CATEGORIES, CATEGORY_LABELS } from "@/data/categories";
import { COUNTRIES, HS_CODES } from "@/data/hsCodes";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all";
const selectCls = cn(inputCls, "appearance-none cursor-pointer pr-6");

interface FieldProps {
  label: string;
  children: React.ReactNode;
}
function Field({ label, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}

export function ProductMasterForm() {
  const { product, setProduct, setCategory } = useProductStore();
  const { register, watch } = useForm<ProductMaster>({ defaultValues: product });

  const values = watch();
  useEffect(() => {
    const t = setTimeout(() => setProduct(values), 120);
    return () => clearTimeout(t);
  }, [JSON.stringify(values)]);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
        Product Master
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Product Name">
          <input
            {...register("productName")}
            placeholder="e.g. Vitamin C Serum 30ml"
            className={inputCls}
          />
        </Field>
        <Field label="Brand">
          <input {...register("brand")} placeholder="e.g. The Ordinary" className={inputCls} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Category">
          <div className="relative">
            <select
              {...register("category")}
              onChange={(e) => setCategory(e.target.value as Category)}
              className={selectCls}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-3.5 w-3.5 text-slate-400" />
          </div>
        </Field>

        <Field label="HS Code">
          <div className="relative">
            <select {...register("hsCode")} className={selectCls}>
              {HS_CODES.map((h) => (
                <option key={h.code} value={h.code}>
                  {h.code} — {h.description.slice(0, 30)}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-3.5 w-3.5 text-slate-400" />
          </div>
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Country of Origin">
          <div className="relative">
            <select {...register("countryOfOrigin")} className={selectCls}>
              {Object.entries(COUNTRIES).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-3.5 w-3.5 text-slate-400" />
          </div>
        </Field>

        <Field label="Weight (kg)">
          <input
            type="number"
            step="0.05"
            {...register("weight", { valueAsNumber: true })}
            className={inputCls}
          />
        </Field>

        <Field label="Selling Price (₹ MRP)">
          <input
            type="number"
            {...register("sellingPrice", { valueAsNumber: true })}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Length (cm)">
          <input
            type="number"
            {...register("dimensions.length", { valueAsNumber: true })}
            className={inputCls}
          />
        </Field>
        <Field label="Width (cm)">
          <input
            type="number"
            {...register("dimensions.width", { valueAsNumber: true })}
            className={inputCls}
          />
        </Field>
        <Field label="Height (cm)">
          <input
            type="number"
            {...register("dimensions.height", { valueAsNumber: true })}
            className={inputCls}
          />
        </Field>
      </div>
    </div>
  );
}
