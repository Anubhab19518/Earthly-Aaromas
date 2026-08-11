"use client";

import { ShoppingCart, IndianRupee, TrendingUp, Users, Star, Activity } from "lucide-react";
import { RevenueChart } from "./revenue-chart";
import { IngredientPieChart } from "./ingredient-pie-chart";
import Link from "next/link";
import { format } from "date-fns";

interface ShopDashboardProps {
  orgId: string;
  locationId: string;
  locationName: string;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  recentMovements: {
    id: string;
    ingredientName: string;
    locationName: string;
    date: string;
    movementType: string;
    quantity: number;
    unit?: string;
  }[];
  revenueData: { date: string; actual: number; projected: number }[];
  stockLevels: any[];
  retentionRate: number;
  returningCustomers: number;
  totalCustomers: number;
  topItems: { name: string; variantName: string; quantity: number; pct: number }[];
}

const MOVEMENT_LABELS: Record<string, string> = {
  GOODS_RECEIPT: "Stock In",
  TRANSFER_IN: "Transfer In",
  TRANSFER_OUT: "Transfer Out",
  RECIPE_CONSUMPTION: "Recipe Consumption",
  OPENING_STOCK: "Opening Stock",
  ADJUSTMENT_IN: "Adjustment In",
  ADJUSTMENT_OUT: "Adjustment Out",
  STOCK_TRANSFER: "Stock Transfer",
};

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg = "bg-sky-50",
  iconColor = "text-sky-600",
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  iconBg?: string;
  iconColor?: string;
}) {
  return (
    <div className="rounded-xl bg-white border border-slate-100 p-5">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-slate-400">{title}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900 leading-none">{value}</p>
      <p className="mt-1.5 text-xs text-slate-400">{subtitle}</p>
    </div>
  );
}

export function ShopDashboard({
  orgId,
  locationId,
  locationName,
  totalOrders,
  totalRevenue,
  averageOrderValue,
  recentMovements,
  revenueData,
  stockLevels,
  retentionRate,
  returningCustomers,
  totalCustomers,
  topItems,
}: ShopDashboardProps) {
  return (
    <div className="space-y-4">
      {/* Page header */}
      <div>
        <h1 className="text-lg font-bold text-slate-900">Dashboard</h1>
        <p className="text-xs text-slate-400 mt-0.5">{locationName} — Shop Overview</p>
      </div>

      {/* ── Main 2-column grid ───────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">

        {/* LEFT COLUMN */}
        <div className="space-y-6 min-w-0">

          {/* 3 Metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <MetricCard
              title="Total Orders"
              value={totalOrders.toString()}
              subtitle="Today"
              icon={ShoppingCart}
            />
            <MetricCard
              title="Total Revenue"
              value={`₹${totalRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
              subtitle="Today"
              icon={IndianRupee}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
            />
            <MetricCard
              title="Avg Order Value"
              value={`₹${averageOrderValue.toFixed(0)}`}
              subtitle="Per order"
              icon={TrendingUp}
              iconBg="bg-violet-50"
              iconColor="text-violet-600"
            />
          </div>

          {/* Revenue dot chart */}
          <RevenueChart initialData={revenueData} orgId={orgId} locationId={locationId} />

          {/* Bottom row: Retention + Top Items */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

            {/* Customer Retention */}
            <div className="rounded-xl bg-white border border-slate-100 p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Customer Retention</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Returning customer rate</p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50">
                  <Users className="h-4 w-4 text-rose-500" />
                </div>
              </div>
              {totalCustomers === 0 ? (
                <p className="text-sm text-slate-400">No customer data available.</p>
              ) : (
                <>
                  <p className="text-3xl font-bold text-slate-900 mb-3">{retentionRate}%</p>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full bg-rose-400"
                      style={{ width: `${retentionRate}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>{returningCustomers} returning</span>
                    <span>{totalCustomers} total</span>
                  </div>
                </>
              )}
            </div>

            {/* Top Menu Items */}
            <div className="rounded-xl bg-white border border-slate-100 p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Top Menu Items</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Most sold variants this week</p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                  <Star className="h-4 w-4 text-amber-500" />
                </div>
              </div>
              {topItems.length === 0 ? (
                <p className="text-sm text-slate-400">No sales data available.</p>
              ) : (
                <div className="space-y-3">
                  {topItems.map((item, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-slate-700 truncate max-w-[150px]">
                          {item.name}
                          {item.variantName && ` — ${item.variantName}`}
                        </span>
                        <span className="text-xs font-bold text-slate-900 ml-2 shrink-0">
                          {item.pct}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-teal-400"
                          style={{ width: `${item.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — matches LoopAI right panel */}
        <div className="flex flex-col h-full gap-4">

          {/* Recent Movements — "Priority tasks" equivalent */}
          <div className="rounded-2xl bg-white border border-slate-100 overflow-hidden shrink-0 p-2">
            <div className="flex items-center justify-between px-3 pt-3 pb-2">
              <span className="text-[15px] font-bold text-slate-800">Recent Inventory</span>
              <Link href="/inventory/ledger" className="text-[13px] font-medium text-indigo-600 hover:text-indigo-700">
                See all
              </Link>
            </div>
            <div className="flex flex-col gap-1 mt-2">
              {recentMovements.length === 0 ? (
                <div className="px-5 py-8 text-center text-xs text-slate-400">
                  No recent inventory movements.
                </div>
              ) : (
                recentMovements.slice(0, 3).map((m, i) => (
                  <Link
                    href="/inventory/ledger"
                    key={m.id}
                    className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors bg-white hover:bg-slate-50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1">
                        <span className={`text-[15px] font-black ${m.quantity > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {m.quantity > 0 ? "↑" : "↓"}
                        </span>
                        <span className="text-[14px] font-bold text-slate-800 tracking-tight">{m.ingredientName}</span>
                        
                        <div className="flex items-center gap-1.5 text-[12px] text-slate-500 font-medium">
                          <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                          <span>{format(new Date(m.date), "MMM d")}</span>
                        </div>
                        
                        <div className={`flex items-center gap-1.5 text-[12px] font-bold ${m.quantity > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          <span>{Math.abs(m.quantity).toFixed(1)} {m.unit || ""}</span>
                        </div>
                      </div>
                      <p className="text-[12px] text-slate-500 mt-1 font-medium truncate">
                        {m.locationName} • {MOVEMENT_LABELS[m.movementType] || m.movementType}
                      </p>
                    </div>
                    <div className="shrink-0 self-center">
                      <svg className="w-4 h-4 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Ingredient Specific Pie Chart */}
          <div className="flex-1">
            <IngredientPieChart stockLevels={stockLevels} />
          </div>
        </div>
      </div>
    </div>
  );
}
