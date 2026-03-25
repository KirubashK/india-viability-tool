# India Market Viability Tool

A **production-ready decision engine** for importers and distributors evaluating whether international products are commercially viable in India.

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

## 📦 Deploy to Vercel

```bash
npm i -g vercel
vercel --prod
```

---

## 🏗️ Architecture

### Folder Structure

```
/app
  page.tsx                    # Dashboard / Landing page
  /product/[id]/page.tsx      # Main analysis page

/components
  KpiCard.tsx                 # Top summary KPI cards
  VerdictBadge.tsx            # GO / BORDERLINE / NO-GO badge
  WaterfallChart.tsx          # Recharts waterfall for cost breakdown
  RecommendationsPanel.tsx    # Dynamic recommendation cards
  ValueChainForm.tsx          # Landed cost inputs (React Hook Form)
  UnitEconomicsForm.tsx       # Unit P&L inputs (React Hook Form)
  ProductMasterForm.tsx       # Product details form
  CostBreakdownTable.tsx      # Line-by-line breakdown table

/lib
  calculations.ts             # Master orchestration functions
  dutyEngine.ts               # getDutyRates() + calculateDutyAmounts()
  gstEngine.ts                # GST deconstruction + ITC estimate
  commissionEngine.ts         # Marketplace fee + marketing calculations
  logisticsEngine.ts          # Import freight + last-mile logistics
  exportUtils.ts              # xlsx multi-sheet export
  utils.ts                    # cn(), formatInr(), formatPercent()

/data
  categories.ts               # Category defaults (margin targets, return rates…)
  marketplaces.ts             # Nykaa 40%, Amazon category-based, etc.
  hsCodes.ts                  # Mock HS code → duty rate lookup + country list
  benchmarks.ts               # Category P&L benchmarks + exchange rates

/types
  product.ts                  # ProductMaster, ValueChainInputs, UnitEconomicsInputs…
  calculation.ts              # LandedCostResult, UnitEconomicsResult, VerdictResult…

/store
  productStore.ts             # Zustand store with immer middleware
```

---

## 🧠 Calculation Engine

### Landed Cost Flow

```
FOB Price (foreign currency)
  × Exchange Rate = FOB (INR)
  + Freight Cost (INR)
  + Insurance (% of FOB)
  = CIF Value

CIF × BCD %      = BCD Amount
BCD × SWS (10%)  = SWS Amount
(CIF + BCD + SWS) × IGST % = IGST Amount

Total Landed Cost = CIF + BCD + SWS + IGST
```

### Duty Rate Logic

- Lookup by 4-digit HS code prefix
- Auto-detect FTA countries (Singapore, Korea, Japan, UAE, Australia…)
- Manual override available in UI
- Falls back to 20% BCD / 18% IGST if HS code not found

### Unit Economics Flow

```
MRP (Selling Price, GST-inclusive)
  − GST Component
  = Net Revenue (ex-GST)
  − Marketplace Commission (% of net rev)
  − Closing Fee (flat)
  − Payment Gateway Fee (% of net rev)
  − Landed Cost
  − Forward Logistics (weight-based slab)
  − Return Logistics (return rate × 1.5× forward)
  − Marketing (% of MRP)
  = Net Profit

Margin % = Net Profit / MRP × 100
```

### Verdict Logic

| Score | Verdict |
|-------|---------|
| ≥ 65  | GO ✅ |
| 40–64 | BORDERLINE ⚠️ |
| < 40  | NO-GO ❌ |

Score factors: margin band (+30/+15/+5/−10/−30), market position (+20/+10/−10)

---

## 🎛️ Override System

Every auto-calculated value supports manual override:
- BCD / SWS / IGST rates
- Marketplace commission %
- Last-mile logistics cost

Overrides are managed in the Zustand store and can be reset via the "Reset Overrides" button.

---

## 📤 Excel Export

4-sheet workbook:
1. **Summary** — product info + key results
2. **Landed Cost** — full CIF + duty breakdown
3. **Unit Economics** — line-by-line P&L
4. **Recommendations** — reasons + action items

---

## 🔧 Key Dependencies

| Package | Purpose |
|---------|---------|
| `next` 15 | App Router framework |
| `zustand` + `immer` | State management with immutable updates |
| `react-hook-form` | Form state (no re-render per keystroke) |
| `recharts` | Waterfall + charts |
| `xlsx` | Excel export |
| `tailwind-merge` + `clsx` | Class merging utility |
| `lucide-react` | Icons |

---

## ⚠️ Disclaimer

Duty rates and marketplace fees are indicative, based on publicly available data. Always verify with a licensed customs broker and the relevant marketplace seller portal before making commercial import decisions.
