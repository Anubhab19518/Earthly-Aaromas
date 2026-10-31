"use client";

import Link from "next/link";
import { ErpPageHeader } from "@/shared/components/layout/erp-page-header";
import { LayoutGrid, Activity, Package } from "lucide-react";

interface GenericDashboardClientProps {
  ingredientsCount: number;
  suppliersCount: number;
  pendingPosCount: number;
  inventoryItemsCount: number;
  grnsCount: number;
  recentMovements: any[];
}

export function GenericDashboardClient({
  ingredientsCount,
  suppliersCount,
  pendingPosCount,
  inventoryItemsCount,
  grnsCount,
  recentMovements,
}: GenericDashboardClientProps) {
  return (
    <div className="space-y-3.5 max-w-7xl mx-auto font-sans text-slate-800">
      {/* Sticky ERP Page Header */}
      <ErpPageHeader
        category="Operations & Analytics"
        title="Organization Dashboard"
        description="Select a workspace or branch from top workspace switcher to see location-specific live analytics"
        icon={LayoutGrid}
        iconBgColor="bg-indigo-600 text-white"
        tabs={[
          { id: "dash-kpis", label: "Global KPI Summary", icon: Activity },
          { id: "dash-inventory", label: "Recent Inventory Movements", icon: Package, count: recentMovements.length },
        ]}
      />

      <div id="dash-kpis" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {[
          { title: "Inventory Items", value: inventoryItemsCount || 0, href: "/inventory" },
          { title: "Total GRNs", value: grnsCount || 0, href: "/receiving" },
          { title: "Pending POs", value: pendingPosCount || 0, href: "/purchase-orders" },
          { title: "Suppliers", value: suppliersCount || 0, href: "/suppliers" },
          { title: "Ingredients", value: ingredientsCount || 0, href: "/ingredients" },
        ].map((card) => (
          <Link key={card.title} href={card.href} className="block h-full hover:opacity-90 transition-opacity">
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 h-full shadow-2xs">
              <div className="flex items-start justify-between">
                <p className="text-xs font-semibold text-slate-500">{card.title}</p>
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-900 tracking-tight leading-none">{card.value}</p>
            </div>
          </Link>
        ))}
      </div>
      <div id="dash-inventory" className="rounded-xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden shrink-0 p-2 h-full flex flex-col">
        <div className="flex items-center justify-between px-3 pt-3 pb-2">
          <span className="text-sm font-semibold text-slate-900">Recent Inventory</span>
          <Link href="/inventory/ledger" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
            See all
          </Link>
        </div>
        <div className="flex flex-col gap-1 mt-2 flex-1">
          {recentMovements.length === 0 ? (
            <div className="px-5 py-8 text-center text-xs text-slate-400">
              No recent inventory movements.
            </div>
          ) : (
            recentMovements.slice(0, 3).map((m) => {
              const dateStr = new Date(m.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
              const label =
                {
                  STOCK_IN: "Stock In",
                  STOCK_OUT: "Stock Out",
                  SALE: "Sale",
                  ADJUSTMENT: "Adjustment",
                  TRANSFER: "Transfer",
                  RETURN: "Return",
                }[m.movementType as string] || m.movementType;

              return (
                <Link
                  href="/inventory/ledger"
                  key={m.id}
                  className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors bg-white hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1">
                      <span className="text-sm font-semibold text-slate-900 tracking-tight">{m.ingredientName}</span>

                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                          <line x1="16" x2="16" y1="2" y2="6" />
                          <line x1="8" x2="8" y1="2" y2="6" />
                          <line x1="3" x2="21" y1="10" y2="10" />
                        </svg>
                        <span>{dateStr}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <span>
                          {m.quantity > 0 ? "+" : ""}
                          {m.quantity.toFixed(1)} {m.unit || ""}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 font-medium truncate">
                      {m.locationName} • {label}
                    </p>
                  </div>
                  <div className="shrink-0 self-center">
                    <svg className="w-4 h-4 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
