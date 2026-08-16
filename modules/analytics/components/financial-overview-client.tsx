"use client";

import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { ErpPageHeader } from "@/shared/components/layout/erp-page-header";
import {
  Truck,
  ShoppingCart,
  ArrowRight,
  TrendingUp,
  Search,
  X,
  Filter,
  Check,
  Copy,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Building2,
  Calendar,
  Receipt,
  ClipboardList,
  BadgeCheck,
  Package,
  BarChart3,
  CreditCard,
  DollarSign,
} from "lucide-react";

interface TransactionItem {
  name: string;
  quantity: number;
  unit_cost: number;
  total: number;
}

interface FinancialTransaction {
  id: string;
  type: "PO" | "GRN" | "SALE";
  reference_number: string;
  po_id?: string;
  po_number?: string | null;
  entity_name: string;
  location_id?: string;
  location_name: string;
  amount: number;
  tax?: number;
  status: string;
  date: string;
  items_count: number;
  items: TransactionItem[];
}

interface FinancialOverviewClientProps {
  overview: {
    metrics: {
      totalPoValue: number;
      pendingPosCount: number;
      completedPosCount: number;
      totalGrnValue: number;
      totalSalesRevenue: number;
      totalTaxCollected: number;
      totalSalesCount: number;
      avgOrderValue: number;
      netProcurementCost: number;
      grossProfitMargin: number;
      marginPercentage: number;
    };
    locations: { id: string; name: string }[];
    timeline: { date: string; sales: number; procurement: number; receipts: number }[];
    pos: FinancialTransaction[];
    grns: FinancialTransaction[];
    sales: FinancialTransaction[];
    recentGrns: any[];
  };
}

export function FinancialOverviewClient({ overview }: FinancialOverviewClientProps) {
  const { metrics, locations, timeline, pos, grns, sales } = overview;

  // View state
  const [activeTab, setActiveTab] = useState<"all" | "sales" | "pos" | "grns">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [sortOption, setSortOption] = useState<"date-desc" | "date-asc" | "amount-desc" | "amount-asc">("date-desc");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    showToast(`Copied ${label} to clipboard`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Consolidate transactions
  const allTransactions = useMemo(() => {
    return [...sales, ...pos, ...grns];
  }, [sales, pos, grns]);

  // Tab dataset
  const currentTabDataset = useMemo(() => {
    if (activeTab === "sales") return sales;
    if (activeTab === "pos") return pos;
    if (activeTab === "grns") return grns;
    return allTransactions;
  }, [activeTab, sales, pos, grns, allTransactions]);

  // Filter and sort dataset
  const filteredTransactions = useMemo(() => {
    return currentTabDataset
      .filter((item) => {
        // Location filter
        if (selectedLocation !== "all" && item.location_id !== selectedLocation) {
          return false;
        }

        // Status filter
        if (selectedStatus !== "all") {
          if (selectedStatus === "completed" && !["COMPLETED", "POSTED"].includes(item.status)) return false;
          if (selectedStatus === "pending" && !["PENDING", "DRAFT", "APPROVED", "SENT"].includes(item.status)) return false;
        }

        // Period filter (past 7 days, 30 days)
        if (selectedPeriod !== "all") {
          const itemDate = new Date(item.date).getTime();
          const now = new Date().getTime();
          const daysDiff = (now - itemDate) / (1000 * 3600 * 24);
          if (selectedPeriod === "7days" && daysDiff > 7) return false;
          if (selectedPeriod === "30days" && daysDiff > 30) return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchRef = item.reference_number.toLowerCase().includes(q);
          const matchEntity = item.entity_name.toLowerCase().includes(q);
          const matchLoc = item.location_name.toLowerCase().includes(q);
          const matchPo = item.po_number ? item.po_number.toLowerCase().includes(q) : false;
          if (!matchRef && !matchEntity && !matchLoc && !matchPo) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOption === "date-desc") return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (sortOption === "date-asc") return new Date(a.date).getTime() - new Date(b.date).getTime();
        if (sortOption === "amount-desc") return b.amount - a.amount;
        if (sortOption === "amount-asc") return a.amount - b.amount;
        return 0;
      });
  }, [currentTabDataset, selectedLocation, selectedStatus, selectedPeriod, searchQuery, sortOption]);

  // Format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(val);
  };

  // Maximum timeline value for chart height normalization
  const maxTimelineValue = useMemo(() => {
    const maxVal = Math.max(
      ...timeline.map((t) => Math.max(t.sales, t.procurement, t.receipts)),
      1000
    );
    return maxVal;
  }, [timeline]);

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-2 rounded-md bg-neutral-900 px-3.5 py-2.5 text-xs font-medium text-white shadow-xl animate-in slide-in-from-bottom-4 duration-200">
          <Check className="h-3.5 w-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sticky ERP Page Header */}
      <ErpPageHeader
        category="Finance & Accounting"
        title="Financial Overview & Ledger"
        description="Real-time financial visibility, procurement tracking, and supply chain traceability"
        icon={DollarSign}
        iconBgColor="bg-emerald-500 text-white"
        tabs={[
          { id: "financial-trend", label: "Financial Trend", icon: BarChart3 },
          { id: "financial-kpis", label: "Metrics & Margins", icon: TrendingUp },
          { id: "financial-transactions", label: "Transactions Ledger", icon: CreditCard, count: allTransactions.length },
        ]}
      />

      <div className="mx-auto max-w-7xl space-y-6">
        {/* Comparative Financial Trend Chart */}
      <div id="financial-trend" className="rounded-md border border-neutral-200 bg-white p-5 shadow-2xs">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">Financial Trend (Past 14 Days)</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Comparative overview of Sales Revenue vs Procurement Outflow</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-neutral-600">
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-md bg-emerald-500" />
              <span>Sales Revenue</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-md bg-sky-500" />
              <span>Procurement Spend</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-md bg-amber-500" />
              <span>Goods Receipts</span>
            </div>
          </div>
        </div>

        {/* Bar Chart Grid */}
        <div className="h-40 flex items-end gap-2 pt-4 border-b border-neutral-100 pb-2">
          {timeline.map((point) => {
            const salesHeight = (point.sales / maxTimelineValue) * 100;
            const procHeight = (point.procurement / maxTimelineValue) * 100;
            const grnHeight = (point.receipts / maxTimelineValue) * 100;
            const dateLabel = format(new Date(point.date), "MMM d");

            return (
              <div key={point.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                {/* Tooltip */}
                <div className="absolute -top-16 hidden group-hover:flex flex-col bg-neutral-900 text-white p-2 rounded-md text-[11px] shadow-lg z-20 whitespace-nowrap">
                  <span className="font-semibold text-neutral-200">{dateLabel}</span>
                  <span className="text-emerald-300">Sales: {formatCurrency(point.sales)}</span>
                  <span className="text-sky-300">POs: {formatCurrency(point.procurement)}</span>
                  <span className="text-amber-300">GRNs: {formatCurrency(point.receipts)}</span>
                </div>

                <div className="w-full flex items-end justify-center gap-1 h-32">
                  <div
                    className="w-2.5 bg-emerald-500/80 hover:bg-emerald-600 rounded-t-md transition-all"
                    style={{ height: `${Math.max(salesHeight, 4)}%` }}
                  />
                  <div
                    className="w-2.5 bg-sky-500/80 hover:bg-sky-600 rounded-t-md transition-all"
                    style={{ height: `${Math.max(procHeight, 4)}%` }}
                  />
                  <div
                    className="w-2.5 bg-amber-500/80 hover:bg-amber-600 rounded-t-md transition-all"
                    style={{ height: `${Math.max(grnHeight, 4)}%` }}
                  />
                </div>
                <span className="text-[10px] text-neutral-400 font-normal">{dateLabel}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Financial KPI Cards - Rendered Below Bar Chart */}
      <div id="financial-kpis" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Card 1: Sales Revenue */}
        <div className="flex items-center gap-3.5 rounded-md border border-neutral-200 bg-white p-4 shadow-2xs transition-all hover:border-neutral-300">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-neutral-100/90 text-neutral-700">
            <ShoppingCart className="h-5 w-5 stroke-[1.75]" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="text-sm font-bold text-neutral-900 truncate">
              {formatCurrency(metrics.totalSalesRevenue)} sales revenue
            </div>
            <div className="text-xs text-neutral-500 font-normal mt-0.5 truncate">
              in the last 14 days • {metrics.totalSalesCount} orders
            </div>
          </div>
        </div>

        {/* Card 2: Total Procurement */}
        <div className="flex items-center gap-3.5 rounded-md border border-neutral-200 bg-white p-4 shadow-2xs transition-all hover:border-neutral-300">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-neutral-100/90 text-neutral-700">
            <Truck className="h-5 w-5 stroke-[1.75]" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="text-sm font-bold text-neutral-900 truncate">
              {formatCurrency(metrics.totalPoValue)} procurement cost
            </div>
            <div className="text-xs text-neutral-500 font-normal mt-0.5 truncate">
              in the last 14 days • {metrics.pendingPosCount} pending POs
            </div>
          </div>
        </div>

        {/* Card 3: Goods Received */}
        <div className="flex items-center gap-3.5 rounded-md border border-neutral-200 bg-white p-4 shadow-2xs transition-all hover:border-neutral-300">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-neutral-100/90 text-neutral-700">
            <Receipt className="h-5 w-5 stroke-[1.75]" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="text-sm font-bold text-neutral-900 truncate">
              {formatCurrency(metrics.totalGrnValue)} goods received
            </div>
            <div className="text-xs text-neutral-500 font-normal mt-0.5 truncate">
              in the last 14 days • {grns.filter((g) => g.status === "POSTED").length} posted GRNs
            </div>
          </div>
        </div>

        {/* Card 4: Operating Margin */}
        <div className="flex items-center gap-3.5 rounded-md border border-neutral-200 bg-white p-4 shadow-2xs transition-all hover:border-neutral-300">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-neutral-100/90 text-neutral-700">
            <TrendingUp className="h-5 w-5 stroke-[1.75]" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="text-sm font-bold text-neutral-900 truncate">
              {formatCurrency(metrics.grossProfitMargin)} gross margin
            </div>
            <div className="text-xs text-neutral-500 font-normal mt-0.5 truncate">
              {metrics.marginPercentage.toFixed(1)}% estimated operating ratio
            </div>
          </div>
        </div>
      </div>


      {/* Main Data Table Container */}
      <div id="financial-transactions" className="rounded-md border border-neutral-200 bg-white shadow-2xs overflow-hidden">
        {/* Top View Tabs (Airtable / Figma Table View Tabs) */}
        <div className="flex items-center gap-1 bg-neutral-50/70 pl-0 pr-4 pt-2.5 overflow-x-auto select-none border-b border-neutral-200">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2.5 text-xs font-medium transition-all duration-300 ease-in-out cursor-pointer ${
              activeTab === "all"
                ? "relative bg-white text-neutral-900 border border-neutral-200 border-b-transparent shadow-2xs font-semibold translate-y-[1px] z-10"
                : "border border-transparent text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/50"
            }`}
          >
            <span>All Transactions</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-semibold text-white shrink-0">
              {allTransactions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("sales")}
            className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2.5 text-xs font-medium transition-all duration-300 ease-in-out cursor-pointer ${
              activeTab === "sales"
                ? "relative bg-white text-neutral-900 border border-neutral-200 border-b-transparent shadow-2xs font-semibold translate-y-[1px] z-10"
                : "border border-transparent text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/50"
            }`}
          >
            <span>Sales Revenue</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-semibold text-white shrink-0">
              {sales.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("pos")}
            className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2.5 text-xs font-medium transition-all duration-300 ease-in-out cursor-pointer ${
              activeTab === "pos"
                ? "relative bg-white text-neutral-900 border border-neutral-200 border-b-transparent shadow-2xs font-semibold translate-y-[1px] z-10"
                : "border border-transparent text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/50"
            }`}
          >
            <span>Purchase Orders</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-semibold text-white shrink-0">
              {pos.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("grns")}
            className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2.5 text-xs font-medium transition-all duration-300 ease-in-out cursor-pointer ${
              activeTab === "grns"
                ? "relative bg-white text-neutral-900 border border-neutral-200 border-b-transparent shadow-2xs font-semibold translate-y-[1px] z-10"
                : "border border-transparent text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/50"
            }`}
          >
            <span>Goods Receipts</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-semibold text-white shrink-0">
              {grns.length}
            </span>
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-2.5 border-b border-neutral-200 bg-white px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between text-xs text-neutral-600">
          <div className="flex items-center gap-3 overflow-x-auto py-0.5">
            {/* Filter by Status */}
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-neutral-400" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-transparent font-medium text-neutral-700 outline-none cursor-pointer hover:text-neutral-900"
              >
                <option value="all">Status: All</option>
                <option value="completed">Completed / Posted</option>
                <option value="pending">Pending / Active</option>
              </select>
            </div>

            <div className="h-3.5 w-px bg-neutral-200" />

            {/* Filter by Period */}
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-neutral-400" />
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bg-transparent font-medium text-neutral-700 outline-none cursor-pointer hover:text-neutral-900"
              >
                <option value="all">Period: All Time</option>
                <option value="7days">Past 7 Days</option>
                <option value="30days">Past 30 Days</option>
              </select>
            </div>

            <div className="h-3.5 w-px bg-neutral-200" />

            {/* Sort Options */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5 text-neutral-400" />
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as any)}
                className="bg-transparent font-medium text-neutral-700 outline-none cursor-pointer hover:text-neutral-900"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="amount-desc">Highest Amount</option>
                <option value="amount-asc">Lowest Amount</option>
              </select>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reference, entity, branch..."
              className="w-full rounded-md border border-neutral-200 bg-neutral-50/50 pl-8 pr-7 py-1 text-xs text-neutral-800 placeholder:text-neutral-400 outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1.5 text-neutral-400 hover:text-neutral-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Data Grid Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/60 text-xs font-semibold text-neutral-700">
                <th className="py-2.5 px-3 border-r border-neutral-200 w-8 text-center"></th>
                <th className="py-2.5 px-4 border-r border-neutral-200 w-[18%]">Reference ID</th>
                <th className="py-2.5 px-4 border-r border-neutral-200 w-[14%]">Transaction Type</th>
                <th className="py-2.5 px-4 border-r border-neutral-200 w-[20%]">Supplier / Customer</th>
                <th className="py-2.5 px-4 border-r border-neutral-200 w-[16%]">Branch Location</th>
                <th className="py-2.5 px-4 border-r border-neutral-200 w-[12%]">Date</th>
                <th className="py-2.5 px-4 border-r border-neutral-200 w-[14%] text-right">Amount</th>
                <th className="py-2.5 px-4 border-r border-neutral-200 w-[10%]">Status</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap w-20">Details</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-200 text-xs font-normal text-neutral-800">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-400 font-normal">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CreditCard className="h-8 w-8 text-neutral-300 animate-pulse" />
                      <p className="text-sm font-medium text-neutral-600">No transactions found</p>
                      <p className="text-xs text-neutral-400 max-w-sm">
                        No financial transactions found matching criteria or filters.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isExpanded = !!expandedRows[tx.id];
                  const formattedDate = format(new Date(tx.date), "MMM d, yyyy");

                  // Badge styles
                  let typeLabel = "Transaction";
                  if (tx.type === "PO") {
                    typeLabel = "Purchase Order";
                  } else if (tx.type === "GRN") {
                    typeLabel = "Goods Receipt";
                  } else if (tx.type === "SALE") {
                    typeLabel = "Sales Order";
                  }

                  return (
                    <React.Fragment key={`financial-row-${tx.id}`}>
                      {/* Main Table Row */}
                      <tr
                        onClick={() => toggleRow(tx.id)}
                        className={`h-11 border-b border-neutral-200 transition-colors group cursor-pointer ${
                          isExpanded ? "bg-neutral-50 font-medium" : "hover:bg-neutral-50/80"
                        }`}
                      >
                        {/* Expand Toggle */}
                        <td className="py-2.5 px-3 border-r border-neutral-200 text-center text-neutral-400">
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 inline-block text-indigo-600" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 inline-block group-hover:text-neutral-700" />
                          )}
                        </td>

                        {/* Reference Number */}
                        <td className="py-2.5 px-4 border-r border-neutral-200">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-neutral-900">{tx.reference_number}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(tx.reference_number, tx.reference_number);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-neutral-700 transition-opacity p-0.5 rounded-md hover:bg-neutral-100"
                              title="Copy reference"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        </td>

                        {/* Transaction Type */}
                        <td className="py-2.5 px-4 border-r border-neutral-200">
                          <div className="inline-flex items-center gap-2 rounded-md border border-slate-200/90 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs">
                            <span className={`h-2 w-2 rounded-[2px] shrink-0 ${
                              tx.type === "PO" ? "bg-sky-500" : tx.type === "GRN" ? "bg-amber-500" : tx.type === "SALE" ? "bg-emerald-500" : "bg-slate-500"
                            }`} />
                            <span>{typeLabel}</span>
                          </div>
                        </td>

                        {/* Entity / Supplier / Customer */}
                        <td className="py-2.5 px-4 border-r border-neutral-200 text-neutral-900 font-medium">
                          {tx.entity_name}
                        </td>

                        {/* Branch Location */}
                        <td className="py-2.5 px-4 border-r border-neutral-200 text-neutral-600">
                          {tx.location_name}
                        </td>

                        {/* Date */}
                        <td className="py-2.5 px-4 border-r border-neutral-200 text-neutral-500 whitespace-nowrap">
                          {formattedDate}
                        </td>

                        {/* Amount */}
                        <td className="py-2.5 px-4 border-r border-neutral-200 text-right font-semibold text-neutral-900">
                          {formatCurrency(tx.amount)}
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-4 border-r border-neutral-200">
                          <div className="inline-flex items-center gap-2 rounded-md border border-slate-200/90 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs">
                            <span className={`h-2 w-2 rounded-[2px] shrink-0 ${
                              ["COMPLETED", "POSTED", "PAID"].includes(tx.status)
                                ? "bg-emerald-500"
                                : ["APPROVED", "SENT", "PARTIAL", "CONFIRMED"].includes(tx.status)
                                ? "bg-sky-500"
                                : ["PENDING", "DRAFT"].includes(tx.status)
                                ? "bg-amber-500"
                                : "bg-slate-500"
                            }`} />
                            <span>{tx.status.charAt(0) + tx.status.slice(1).toLowerCase()}</span>
                          </div>
                        </td>

                        {/* Inspect Details Link */}
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <span className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline">
                            {isExpanded ? "Collapse" : "Inspect"}
                          </span>
                        </td>
                      </tr>

                      {/* Inline Expanded Row Drawer (Matching Audit Log Page Pattern) */}
                      {isExpanded && (
                        <tr className="bg-neutral-50/70 border-b border-neutral-200">
                          <td colSpan={9} className="px-5 py-4 font-sans">
                            <div className="space-y-3">
                              {/* Header Bar of Drawer */}
                              <div className="flex items-center justify-between border-b border-neutral-200 pb-2.5">
                                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800">
                                  <ClipboardList className="h-4 w-4 text-indigo-600" />
                                  <span>Transaction Details Breakdown for {tx.reference_number}</span>
                                  <span className="text-[11px] font-medium text-neutral-600 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-md">
                                    {typeLabel}
                                  </span>
                                  <span className="text-[11px] font-normal text-neutral-500">
                                    ({tx.items_count} items)
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  {tx.type === "GRN" && (
                                    <Link
                                      href={`/receiving/${tx.id}`}
                                      className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 hover:text-sky-800 hover:underline"
                                    >
                                      <span>Open Receipt</span>
                                      <ArrowRight className="h-3 w-3" />
                                    </Link>
                                  )}
                                  {tx.type === "PO" && (
                                    <Link
                                      href={`/purchase-orders/${tx.id}`}
                                      className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 hover:text-sky-800 hover:underline"
                                    >
                                      <span>Open Purchase Order</span>
                                      <ArrowRight className="h-3 w-3" />
                                    </Link>
                                  )}
                                  <button
                                    onClick={() => toggleRow(tx.id)}
                                    className="text-xs text-neutral-500 hover:text-neutral-800 hover:underline cursor-pointer"
                                  >
                                    Close
                                  </button>
                                </div>
                              </div>

                              {/* Item Table Container */}
                              {tx.items.length === 0 ? (
                                <div className="p-4 bg-white rounded-md border border-neutral-200 text-xs text-neutral-500 text-center">
                                  No item breakdown records found for this transaction.
                                </div>
                              ) : (
                                <div className="rounded-md border border-neutral-200 bg-white overflow-hidden shadow-2xs font-sans text-xs">
                                  <div className="bg-neutral-50/80 border-b border-neutral-200 px-4 py-2 flex items-center justify-between text-xs text-neutral-700 font-medium">
                                    <span>Item Line Breakdown</span>
                                    <span>Financial Summary</span>
                                  </div>
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                      <tr className="bg-neutral-50/40 border-b border-neutral-200 text-neutral-600 font-medium">
                                        <th className="py-2 px-4">Item Name</th>
                                        <th className="py-2 px-4 text-right">Quantity</th>
                                        <th className="py-2 px-4 text-right">Unit Price / Cost</th>
                                        <th className="py-2 px-4 text-right">Line Total</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100 text-neutral-800">
                                      {tx.items.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-neutral-50/50">
                                          <td className="py-2 px-4 font-medium text-neutral-900">{item.name}</td>
                                          <td className="py-2 px-4 text-right text-neutral-700">{item.quantity}</td>
                                          <td className="py-2 px-4 text-right text-neutral-700">{formatCurrency(item.unit_cost)}</td>
                                          <td className="py-2 px-4 text-right font-semibold text-neutral-900">{formatCurrency(item.total)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {/* Supply Chain Traceability Footer Card */}
                              {tx.type === "GRN" && tx.po_number && (
                                <div className="flex items-center justify-between rounded-md border border-neutral-200 bg-white px-4 py-2.5 text-xs text-neutral-700">
                                  <div className="flex items-center gap-2">
                                    <BadgeCheck className="h-4 w-4 text-sky-600" />
                                    <span>Supply Chain Traceability: Linked to Purchase Order</span>
                                    <Link href={`/purchase-orders/${tx.po_id}`} className="font-semibold text-sky-600 hover:underline">
                                      {tx.po_number}
                                    </Link>
                                  </div>
                                  <span className="text-neutral-500">Supplier: {tx.entity_name}</span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
}
