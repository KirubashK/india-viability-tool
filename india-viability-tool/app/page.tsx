import Link from "next/link";
import { Package, TrendingUp, Shield, Zap, ArrowRight, Globe } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      {/* Nav */}
      <nav className="border-b border-white/10 px-8 py-5">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-bold text-white">IndiaViability.io</span>
          </div>
          <span className="rounded-full border border-indigo-400/40 bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300">
            Beta v1.0
          </span>
        </div>
      </nav>

      {/* Hero */}
      <div className="mx-auto max-w-screen-xl px-8 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-2 text-xs font-semibold text-indigo-300">
            <Zap className="h-3.5 w-3.5" />
            Smart defaults · Manual overrides · Excel export
          </div>
          <h1 className="text-5xl font-black leading-tight tracking-tight text-white md:text-6xl">
            Should you import{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              this product
            </span>{" "}
            to India?
          </h1>
          <p className="mt-6 text-lg text-slate-400">
            A full decision engine for importers & distributors. Model landed
            cost, duties, marketplace fees, and unit economics — instantly.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link
              href="/product/new"
              className="flex items-center gap-2 rounded-xl bg-indigo-500 px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-indigo-500/30 transition-all hover:bg-indigo-400 hover:shadow-indigo-400/40"
            >
              Start Analysis
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Feature grid */}
        <div className="mt-24 grid grid-cols-1 gap-5 md:grid-cols-3">
          {[
            {
              icon: Package,
              title: "Landed Cost Engine",
              desc: "FOB → CIF → BCD/SWS/IGST → Total landed cost with FTA detection and manual overrides.",
              color: "text-indigo-400",
              bg: "bg-indigo-500/10",
              border: "border-indigo-500/20",
            },
            {
              icon: TrendingUp,
              title: "Unit P&L Calculator",
              desc: "Marketplace commissions, last-mile logistics, return rates, and marketing — all in one waterfall.",
              color: "text-violet-400",
              bg: "bg-violet-500/10",
              border: "border-violet-500/20",
            },
            {
              icon: Shield,
              title: "GO / BORDERLINE / NO-GO",
              desc: "Scored verdict based on margin, market position, and category benchmarks with actionable recommendations.",
              color: "text-emerald-400",
              bg: "bg-emerald-500/10",
              border: "border-emerald-500/20",
            },
          ].map(({ icon: Icon, title, desc, color, bg, border }) => (
            <div
              key={title}
              className={`rounded-2xl border ${border} ${bg} p-7 backdrop-blur`}
            >
              <div className={`mb-4 w-fit rounded-xl bg-white/5 p-3 ${color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-base font-bold text-white">{title}</h3>
              <p className="text-sm leading-relaxed text-slate-400">{desc}</p>
            </div>
          ))}
        </div>

        {/* Categories */}
        <div className="mt-16 text-center">
          <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Supported Categories
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {["Beauty & Personal Care", "Food & Beverages", "Apparel & Fashion", "FMCG", "Pet Care", "Electronics", "Home & Living"].map(
              (cat) => (
                <span
                  key={cat}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-300"
                >
                  {cat}
                </span>
              )
            )}
          </div>
        </div>

        {/* Disclaimer */}
        <p className="mt-16 text-center text-xs text-slate-600">
          Duty rates and marketplace fees are indicative based on publicly available data as of
          2024. Always verify with a licensed customs broker before making commercial decisions.
        </p>
      </div>
    </div>
  );
}
