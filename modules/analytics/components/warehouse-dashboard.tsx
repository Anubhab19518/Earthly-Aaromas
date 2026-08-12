"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Package, ClipboardList, Truck, Maximize2, X, Warehouse, Activity, TrendingUp } from "lucide-react";
import { ErpPageHeader } from "@/shared/components/layout/erp-page-header";
import Link from "next/link";
import { InventoryMovementChart } from "./inventory-movement-chart";

interface WarehouseDashboardProps {
  orgId: string;
  locationId: string;
  locationName: string;
  // Metric cards
  inventoryItemsCount: number;
  pendingPosCount: number;
  suppliersCount: number;
  // Recent movements
  recentMovements: {
    id: string;
    ingredientName: string;
    locationName: string;
    date: string;
    movementType: string;
    quantity: number;
    unit: string;
  }[];
  // Recent GRNs
  recentGrns: {
    id: string;
    grn_number: string;
    supplierName: string;
    received_date: string;
    status: string;
  }[];
  // Stock levels
  stockLevels: {
    name: string;
    unit: string;
    current: number;
    min: number;
    max: number;
    isBelowMin: boolean;
    warning_level?: number;
    critical_level?: number;
    out_of_stock_level?: number;
    hasPolicy?: boolean;
  }[];
  // Ingredients for movement chart
  inventoryIngredients: {
    id: string;
    name: string;
    unit: string;
    criticalLevel: number;
  }[];
}

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
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
  iconColor = "text-sky-600",
  iconBg = "bg-sky-50",
  href,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  iconColor?: string;
  iconBg?: string;
  href?: string;
}) {
  const inner = (
    <div className="rounded-xl bg-white border border-slate-200/80 shadow-2xs p-5 h-full">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold text-slate-500">{title}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900 tracking-tight leading-none">{value}</p>
      {subtitle && <p className="mt-1.5 text-xs text-slate-500 font-medium">{subtitle}</p>}
    </div>
  );
  if (href) return <Link href={href} className="block h-full hover:opacity-90 transition-opacity">{inner}</Link>;
  return inner;
}

export function WarehouseDashboard({
  orgId,
  locationId,
  locationName,
  inventoryItemsCount,
  pendingPosCount,
  suppliersCount,
  recentMovements,
  recentGrns,
  stockLevels,
  inventoryIngredients,
}: WarehouseDashboardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isExpanded]);

  return (
    <div className="space-y-3 max-w-7xl mx-auto font-sans text-slate-800">
      {/* Sticky ERP Page Header */}
      <ErpPageHeader
        category="Warehouse Management"
        title={`${locationName} Dashboard`}
        description="Centralized inventory tracking, purchase order fulfillment, supplier receipts, and stock ledger movements"
        icon={Warehouse}
        iconBgColor="bg-sky-600 text-white"
        shopNameOverride={locationName}
        tabs={[
          { id: "wh-metrics", label: "KPI Overview", icon: Activity },
          { id: "wh-movements", label: "Movement Analytics", icon: TrendingUp },
          { id: "wh-grns", label: "Goods Receipts", icon: ClipboardList, count: recentGrns.length },
          { id: "wh-stock", label: "Stock Levels", icon: Package, count: inventoryItemsCount },
        ]}
      />

      {/* ── Main 2-column grid ───────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-3">

        {/* LEFT COLUMN */}
        <div className="space-y-3 min-w-0">

          {/* 3 Metric cards */}
          <div id="wh-metrics" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <MetricCard
              title="Inventory Items"
              value={inventoryItemsCount.toString()}
              subtitle="Tracked items"
              icon={Package}
              href="/inventory"
            />
            <MetricCard
              title="Pending POs"
              value={pendingPosCount.toString()}
              subtitle="Awaiting processing"
              icon={ClipboardList}
              iconColor="text-amber-600"
              iconBg="bg-amber-50"
              href="/purchase-orders"
            />
            <MetricCard
              title="Suppliers"
              value={suppliersCount.toString()}
              subtitle="Active suppliers"
              icon={Truck}
              iconColor="text-violet-600"
              iconBg="bg-violet-50"
              href="/suppliers"
            />
          </div>

          {/* Inventory Movement Chart (Moved to left column) */}
          <div id="wh-movements">
            <InventoryMovementChart
              orgId={orgId}
              locationId={locationId}
              ingredients={inventoryIngredients}
            />
          </div>

          {/* Stock Levels Visualization */}
          <div id="wh-stock" className="rounded-xl bg-white border border-slate-200/80 shadow-2xs p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Inventory Stock Levels</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">Current stock vs configured thresholds</p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"/><span className="text-xs font-medium text-slate-600">Out of Stock</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-500"/><span className="text-xs font-medium text-slate-600">Critical</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-400"/><span className="text-xs font-medium text-slate-600">Warning</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-sky-500"/><span className="text-xs font-medium text-slate-600">Healthy</span></div>
                </div>
                <button
                  onClick={() => setIsExpanded(true)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-md transition-colors border border-transparent hover:border-slate-200"
                  title="Expand"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {stockLevels.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-xs text-slate-500 font-medium">
                No inventory data available.
              </div>
            ) : (
              <div className="space-y-10 pr-2 pb-4">
                {stockLevels.slice(0, 2).map((item) => {
                  const warnLvl = item.warning_level || item.min;
                  const critLvl = item.critical_level || (item.min * 0.5);
                  const oosLvl = item.out_of_stock_level || 0;
                  
                  const maxForBar = item.max > 0 ? Math.max(item.max, item.current * 1.1) : Math.max(item.current * 1.15, warnLvl * 1.25, 10);
                  const max = maxForBar || 1;
                  
                  const currentPct = Math.min((item.current / max) * 100, 100);
                  const oosPct = Math.min((oosLvl / max) * 100, 100);
                  const critPct = Math.min((critLvl / max) * 100, 100);
                  const warnPct = Math.min((warnLvl / max) * 100, 100);

                  let statusText = "Healthy";
                  let statusBadge = "bg-sky-50 text-sky-600";
                  
                  if (item.current <= oosLvl) {
                    statusText = "Out of Stock";
                    statusBadge = "bg-red-50 text-red-600";
                  } else if (item.current <= critLvl) {
                    statusText = "Critical";
                    statusBadge = "bg-orange-50 text-orange-600";
                  } else if (item.current <= warnLvl) {
                    statusText = "Warning";
                    statusBadge = "bg-amber-50 text-amber-600";
                  }

                  const isZeroOosClose = oosPct < 12;
                  const isOosCritClose = (critPct - oosPct) < 12;
                  const isCritWarnClose = (warnPct - critPct) < 12;
                  const isWarnMaxClose = (100 - warnPct) < 12;
                  const hideZero = item.hasPolicy && oosLvl === 0;
                  const needsStagger = (!hideZero && isZeroOosClose) || isOosCritClose || isCritWarnClose || isWarnMaxClose;

                  const unitNames: Record<string, string> = { "g": "Gram", "ml": "Millilitre", "kg": "Kilogram", "l": "Litre" };
                  const fullUnit = unitNames[item.unit?.toLowerCase()] || item.unit;

                  return (
                    <div key={item.name} className="group">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">{item.name}</span>
                          <span className="text-xs text-slate-500 ml-1 font-medium">{fullUnit !== item.unit ? `${fullUnit} (${item.unit})` : item.unit}</span>
                          {!item.hasPolicy && <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full ml-2">No thresholds</span>}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-bold text-sky-600">
                            {item.current.toLocaleString("en-US", { maximumFractionDigits: 1 })} {item.unit}
                          </span>
                          {item.hasPolicy && (
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${statusBadge}`}>
                              {statusText}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mx-6 mt-1">
                        {/* Progress Bar Track */}
                        <div className="relative h-2 w-full rounded-full bg-slate-100">
                          <div 
                            className="absolute left-0 top-0 bottom-0 flex overflow-hidden rounded-full transition-all duration-500"
                            style={{ width: `${currentPct}%` }}
                          >
                            {item.hasPolicy && currentPct > 0 ? (
                              <>
                                {Math.min(oosPct, currentPct) > 0 && (
                                  <div className="h-full bg-red-500" style={{ width: `${(Math.min(oosPct, currentPct) / currentPct) * 100}%` }} />
                                )}
                                {Math.max(0, Math.min(critPct, currentPct) - oosPct) > 0 && (
                                  <div className="h-full bg-orange-500" style={{ width: `${(Math.max(0, Math.min(critPct, currentPct) - oosPct) / currentPct) * 100}%` }} />
                                )}
                                {Math.max(0, Math.min(warnPct, currentPct) - critPct) > 0 && (
                                  <div className="h-full bg-amber-400" style={{ width: `${(Math.max(0, Math.min(warnPct, currentPct) - critPct) / currentPct) * 100}%` }} />
                                )}
                                {Math.max(0, currentPct - warnPct) > 0 && (
                                  <div className="h-full bg-sky-500" style={{ width: `${(Math.max(0, currentPct - warnPct) / currentPct) * 100}%` }} />
                                )}
                              </>
                            ) : (
                              <div className="h-full bg-sky-500 w-full" />
                            )}
                          </div>

                          {/* Threshold gap markers */}
                          {item.hasPolicy && (
                            <>
                              {currentPct > oosPct && <div className="absolute top-0 bottom-0 w-[2px] bg-white z-10" style={{ left: `calc(${oosPct}% - 1px)` }} />}
                              {currentPct > critPct && <div className="absolute top-0 bottom-0 w-[2px] bg-white z-10" style={{ left: `calc(${critPct}% - 1px)` }} />}
                              {currentPct > warnPct && <div className="absolute top-0 bottom-0 w-[2px] bg-white z-10" style={{ left: `calc(${warnPct}% - 1px)` }} />}
                            </>
                          )}
                        </div>
                        
                        {/* Threshold Labels */}
                        <div 
                          className="relative text-[11px] font-medium mt-2" 
                          style={{ height: needsStagger ? '36px' : '18px' }}
                        >
                          {!hideZero && (
                            <div className="absolute text-slate-400 flex flex-col items-center" style={{ left: '0%', transform: 'translateX(-50%)', top: isZeroOosClose ? '16px' : '0' }}>
                              <span className="whitespace-nowrap">0 {item.unit}</span>
                            </div>
                          )}
                          
                          {item.hasPolicy && (
                            <>
                              <div className="absolute text-red-500 flex flex-col items-center" style={{ left: `${oosPct}%`, transform: 'translateX(-50%)', top: '0' }}>
                                <span className="whitespace-nowrap">{oosLvl.toLocaleString("en-US")} {item.unit}</span>
                              </div>
                              <div className="absolute text-orange-500 flex flex-col items-center" style={{ left: `${critPct}%`, transform: 'translateX(-50%)', top: isOosCritClose ? '16px' : '0' }}>
                                <span className="whitespace-nowrap">{critLvl.toLocaleString("en-US")} {item.unit}</span>
                              </div>
                              <div className="absolute text-amber-500 flex flex-col items-center" style={{ left: `${warnPct}%`, transform: 'translateX(-50%)', top: (isOosCritClose && isCritWarnClose) ? '32px' : isCritWarnClose ? '16px' : '0' }}>
                                <span className="whitespace-nowrap">{warnLvl.toLocaleString("en-US")} {item.unit}</span>
                              </div>
                            </>
                          )}
                          
                          <div className="absolute text-slate-400 flex flex-col items-center" style={{ left: '100%', transform: 'translateX(-50%)', top: isWarnMaxClose ? '16px' : '0' }}>
                            <span className="whitespace-nowrap">{maxForBar.toLocaleString("en-US", { maximumFractionDigits: 0 })} {item.unit}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN — matches Shop dashboard right panel */}
        <div className="flex flex-col h-full gap-3">

          {/* Recent Movements — styled identically to Shop's "Recent Inventory" */}
          <div className="rounded-xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden shrink-0 p-2">
            <div className="flex items-center justify-between px-3 pt-3 pb-2">
              <span className="text-sm font-semibold text-slate-900">Recent Inventory</span>
              <Link href="/inventory/ledger" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                See all
              </Link>
            </div>
            <div className="flex flex-col gap-1 mt-2">
              {recentMovements.length === 0 ? (
                <div className="px-5 py-8 text-center text-xs text-slate-400">
                  No recent inventory movements.
                </div>
              ) : (
                recentMovements.slice(0, 6).map((m) => (
                  <Link
                    href="/inventory/ledger"
                    key={m.id}
                    className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors bg-white hover:bg-slate-50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1">
                        <span className={`text-sm font-bold ${m.quantity > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {m.quantity > 0 ? "↑" : "↓"}
                        </span>
                        <span className="text-sm font-semibold text-slate-900 tracking-tight">{m.ingredientName}</span>
                        
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                          <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                          <span>{format(new Date(m.date), "MMM d")}</span>
                        </div>
                        
                        <div className={`flex items-center gap-1.5 text-xs font-semibold ${m.quantity > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          <span>{Math.abs(m.quantity).toFixed(1)} {m.unit || ""}</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 font-medium truncate">
                        {m.locationName} · {MOVEMENT_TYPE_LABELS[m.movementType] || m.movementType}
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

          {/* Recent GRNs — styled identically to Recent Inventory above */}
          <div id="wh-grns" className="rounded-xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden shrink-0 p-2">
            <div className="flex items-center justify-between px-3 pt-3 pb-2">
              <span className="text-sm font-semibold text-slate-900">Recent GRNs</span>
              <Link href="/receiving" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                See all
              </Link>
            </div>
            <div className="flex flex-col gap-1 mt-2">
              {recentGrns.length === 0 ? (
                <div className="px-5 py-8 text-center text-xs text-slate-400">
                  No goods receipts.
                </div>
              ) : (
                recentGrns.slice(0, 6).map((grn) => (
                  <Link
                    href={`/receiving/${grn.id}`}
                    key={grn.id}
                    className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors bg-white hover:bg-slate-50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1">
                        <span className="text-sm font-semibold text-slate-900 tracking-tight">{grn.grn_number}</span>
                        
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                          <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                          <span>{format(new Date(grn.received_date), "MMM d")}</span>
                        </div>

                        <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                          grn.status === "POSTED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                        }`}>
                          {grn.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 font-medium truncate">
                        {grn.supplierName}
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
        </div>
      </div>

      {/* Expanded Inventory Stock Levels Modal */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div 
            className="w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-800">All Inventory Stock Levels</h3>
                <p className="text-sm text-slate-500 mt-0.5">Current stock vs configured thresholds</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="hidden sm:flex items-center gap-4">
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"/><span className="text-[12px] font-medium text-slate-600">Out of Stock</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-500"/><span className="text-[12px] font-medium text-slate-600">Critical</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-400"/><span className="text-[12px] font-medium text-slate-600">Warning</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-sky-500"/><span className="text-[12px] font-medium text-slate-600">Healthy</span></div>
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-10">
              {stockLevels.map((item) => {
                  const warnLvl = item.warning_level || item.min;
                  const critLvl = item.critical_level || (item.min * 0.5);
                  const oosLvl = item.out_of_stock_level || 0;
                  
                  const maxForBar = item.max > 0 ? Math.max(item.max, item.current * 1.1) : Math.max(item.current * 1.15, warnLvl * 1.25, 10);
                  const max = maxForBar || 1;
                  
                  const currentPct = Math.min((item.current / max) * 100, 100);
                  const oosPct = Math.min((oosLvl / max) * 100, 100);
                  const critPct = Math.min((critLvl / max) * 100, 100);
                  const warnPct = Math.min((warnLvl / max) * 100, 100);

                  let statusText = "Healthy";
                  let statusBadge = "bg-sky-50 text-sky-600";
                  
                  if (item.current <= oosLvl) {
                    statusText = "Out of Stock";
                    statusBadge = "bg-red-50 text-red-600";
                  } else if (item.current <= critLvl) {
                    statusText = "Critical";
                    statusBadge = "bg-orange-50 text-orange-600";
                  } else if (item.current <= warnLvl) {
                    statusText = "Warning";
                    statusBadge = "bg-amber-50 text-amber-600";
                  }

                  const isZeroOosClose = oosPct < 12;
                  const isOosCritClose = (critPct - oosPct) < 12;
                  const isCritWarnClose = (warnPct - critPct) < 12;
                  const isWarnMaxClose = (100 - warnPct) < 12;
                  const hideZero = item.hasPolicy && oosLvl === 0;
                  const needsStagger = (!hideZero && isZeroOosClose) || isOosCritClose || isCritWarnClose || isWarnMaxClose;

                  const unitNames: Record<string, string> = { "g": "Gram", "ml": "Millilitre", "kg": "Kilogram", "l": "Litre" };
                  const fullUnit = unitNames[item.unit?.toLowerCase()] || item.unit;

                  return (
                    <div key={item.name} className="group">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[15px] font-bold text-slate-800">{item.name}</span>
                          <span className="text-[13px] text-slate-400 ml-1">{fullUnit !== item.unit ? `${fullUnit} (${item.unit})` : item.unit}</span>
                          {!item.hasPolicy && <span className="text-[11px] font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full ml-2">No thresholds</span>}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-[16px] font-bold text-sky-600">
                            {item.current.toLocaleString("en-US", { maximumFractionDigits: 1 })} {item.unit}
                          </span>
                          {item.hasPolicy && (
                            <span className={`text-[11px] font-bold px-2 py-1 rounded ${statusBadge}`}>
                              {statusText}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mx-6 mt-1">
                        {/* Progress Bar Track */}
                        <div className="relative h-2 w-full rounded-full bg-slate-100">
                          <div 
                            className="absolute left-0 top-0 bottom-0 flex overflow-hidden rounded-full transition-all duration-500"
                            style={{ width: `${currentPct}%` }}
                          >
                            {item.hasPolicy && currentPct > 0 ? (
                              <>
                                {Math.min(oosPct, currentPct) > 0 && (
                                  <div className="h-full bg-red-500" style={{ width: `${(Math.min(oosPct, currentPct) / currentPct) * 100}%` }} />
                                )}
                                {Math.max(0, Math.min(critPct, currentPct) - oosPct) > 0 && (
                                  <div className="h-full bg-orange-500" style={{ width: `${(Math.max(0, Math.min(critPct, currentPct) - oosPct) / currentPct) * 100}%` }} />
                                )}
                                {Math.max(0, Math.min(warnPct, currentPct) - critPct) > 0 && (
                                  <div className="h-full bg-amber-400" style={{ width: `${(Math.max(0, Math.min(warnPct, currentPct) - critPct) / currentPct) * 100}%` }} />
                                )}
                                {Math.max(0, currentPct - warnPct) > 0 && (
                                  <div className="h-full bg-sky-500" style={{ width: `${(Math.max(0, currentPct - warnPct) / currentPct) * 100}%` }} />
                                )}
                              </>
                            ) : (
                              <div className="h-full bg-sky-500 w-full" />
                            )}
                          </div>

                          {/* Threshold gap markers */}
                          {item.hasPolicy && (
                            <>
                              {currentPct > oosPct && <div className="absolute top-0 bottom-0 w-[2px] bg-white z-10" style={{ left: `calc(${oosPct}% - 1px)` }} />}
                              {currentPct > critPct && <div className="absolute top-0 bottom-0 w-[2px] bg-white z-10" style={{ left: `calc(${critPct}% - 1px)` }} />}
                              {currentPct > warnPct && <div className="absolute top-0 bottom-0 w-[2px] bg-white z-10" style={{ left: `calc(${warnPct}% - 1px)` }} />}
                            </>
                          )}
                        </div>
                        
                        {/* Threshold Labels */}
                        <div 
                          className="relative text-[11px] font-medium mt-2" 
                          style={{ height: needsStagger ? '36px' : '18px' }}
                        >
                          {!hideZero && (
                            <div className="absolute text-slate-400 flex flex-col items-center" style={{ left: '0%', transform: 'translateX(-50%)', top: isZeroOosClose ? '16px' : '0' }}>
                              <span className="whitespace-nowrap">0 {item.unit}</span>
                            </div>
                          )}
                          
                          {item.hasPolicy && (
                            <>
                              <div className="absolute text-red-500 flex flex-col items-center" style={{ left: `${oosPct}%`, transform: 'translateX(-50%)', top: '0' }}>
                                <span className="whitespace-nowrap">{oosLvl.toLocaleString("en-US")} {item.unit}</span>
                              </div>
                              <div className="absolute text-orange-500 flex flex-col items-center" style={{ left: `${critPct}%`, transform: 'translateX(-50%)', top: isOosCritClose ? '16px' : '0' }}>
                                <span className="whitespace-nowrap">{critLvl.toLocaleString("en-US")} {item.unit}</span>
                              </div>
                              <div className="absolute text-amber-500 flex flex-col items-center" style={{ left: `${warnPct}%`, transform: 'translateX(-50%)', top: (isOosCritClose && isCritWarnClose) ? '32px' : isCritWarnClose ? '16px' : '0' }}>
                                <span className="whitespace-nowrap">{warnLvl.toLocaleString("en-US")} {item.unit}</span>
                              </div>
                            </>
                          )}
                          
                          <div className="absolute text-slate-400 flex flex-col items-center" style={{ left: '100%', transform: 'translateX(-50%)', top: isWarnMaxClose ? '16px' : '0' }}>
                            <span className="whitespace-nowrap">{maxForBar.toLocaleString("en-US", { maximumFractionDigits: 0 })} {item.unit}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
