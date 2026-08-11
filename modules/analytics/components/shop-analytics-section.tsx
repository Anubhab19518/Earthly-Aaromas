"use client";

import { TrendingUp, ShoppingCart, IndianRupee, UtensilsCrossed, Clock, CheckCircle } from "lucide-react";

interface ShopAnalyticsProps {
  analytics: {
    todaysRevenue: number;
    ordersTodayCount: number;
    averageOrderValue: number;
    pendingCount: number;
    preparingCount: number;
    readyCount: number;
    completedCount: number;
    bestVariants: any[];
  };
}

export function ShopAnalyticsSection({ analytics }: ShopAnalyticsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold tracking-tight text-zinc-900 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-sky-700" />
          Shop Sales & Analytics
        </h3>
        <p className="mt-1 text-sm text-zinc-500">Real-time performance metrics for today</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Revenue */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <IndianRupee className="w-24 h-24 text-sky-700" />
          </div>
          <p className="text-sm font-medium text-zinc-500">Today's Revenue</p>
          <p className="text-3xl font-bold text-zinc-900 mt-2">₹{analytics.todaysRevenue.toFixed(2)}</p>
        </div>

        {/* Orders */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ShoppingCart className="w-24 h-24 text-blue-600" />
          </div>
          <p className="text-sm font-medium text-zinc-500">Orders Today</p>
          <p className="text-3xl font-bold text-zinc-900 mt-2">{analytics.ordersTodayCount}</p>
        </div>

        {/* AOV */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <UtensilsCrossed className="w-24 h-24 text-amber-600" />
          </div>
          <p className="text-sm font-medium text-zinc-500">Average Order Value</p>
          <p className="text-3xl font-bold text-zinc-900 mt-2">₹{analytics.averageOrderValue.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Order Status Pipeline */}
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="border-b border-zinc-100 bg-white/50 px-6 py-5 flex items-center gap-2 backdrop-blur-sm">
            <Clock className="h-4 w-4 text-zinc-400" />
            <h3 className="text-sm font-semibold text-zinc-900">Current Pipeline</h3>
          </div>
          <div className="p-4 flex-1">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 h-full text-center items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Pending</p>
                <p className="text-2xl font-bold text-zinc-900">{analytics.pendingCount}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 mb-1">Preparing</p>
                <p className="text-2xl font-bold text-amber-600">{analytics.preparingCount}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-1">Ready</p>
                <p className="text-2xl font-bold text-emerald-600">{analytics.readyCount}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">Completed</p>
                <p className="text-2xl font-bold text-blue-600">{analytics.completedCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Best Selling Variants */}
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="border-b border-zinc-100 bg-white/50 px-6 py-5 flex items-center gap-2 backdrop-blur-sm">
            <CheckCircle className="h-4 w-4 text-zinc-400" />
            <h3 className="text-sm font-semibold text-zinc-900">Top Menu Variants Today</h3>
          </div>
          <div className="p-2 flex-1 overflow-y-auto">
            {analytics.bestVariants.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-zinc-400">
                No sales recorded today.
              </div>
            ) : (
              <ul className="space-y-1">
                {analytics.bestVariants.map((v) => (
                  <li key={v.id} className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 rounded-xl transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{v.name}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{v.quantity} units sold</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-sky-700">₹{v.revenue.toFixed(2)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
