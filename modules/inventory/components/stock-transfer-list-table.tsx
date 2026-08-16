"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import {
  Plus,
  Search,
  X,
  FileText,
  ArrowLeftRight,
  Activity,
  Truck,
  CheckCircle2,
  Clock,
  Check,
  Copy,
  Building2,
  ChevronRight,
} from "lucide-react";
import { ErpPageHeader } from "@/shared/components/layout/erp-page-header";

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "SHIPPED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/80 whitespace-nowrap shadow-2xs">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
          <span>Shipped</span>
        </span>
      );
    case "RECEIVED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 whitespace-nowrap shadow-2xs">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span>Received</span>
        </span>
      );
    case "CANCELLED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200/80 whitespace-nowrap shadow-2xs">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
          <span>Cancelled</span>
        </span>
      );
    case "DRAFT":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap shadow-2xs">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
          <span>Draft</span>
        </span>
      );
  }
}

export function StockTransferListTable({
  transfers,
  locations,
  activeBranchId,
  canCreate,
}: {
  transfers: any[];
  locations: any[];
  activeBranchId?: string;
  canCreate?: boolean;
}) {
  const router = useRouter();

  // State
  const [activeTab, setActiveTab] = useState<"ALL" | "DRAFT" | "SHIPPED" | "RECEIVED" | "CANCELLED">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopy = (text: string, label: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedItem(text);
    showToast(`Copied ${label} to clipboard`);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  // Metrics counters
  const metrics = useMemo(() => {
    let shipped = 0;
    let received = 0;
    let draft = 0;
    let cancelled = 0;

    transfers.forEach((tr) => {
      if (tr.status === "SHIPPED") shipped++;
      else if (tr.status === "RECEIVED") received++;
      else if (tr.status === "DRAFT") draft++;
      else if (tr.status === "CANCELLED") cancelled++;
    });

    return {
      all: transfers.length,
      shipped,
      received,
      draft,
      cancelled,
    };
  }, [transfers]);

  // Filtered dataset
  const filteredTransfers = useMemo(() => {
    return transfers.filter((tr) => {
      // Tab domain filter
      if (activeTab !== "ALL" && tr.status !== activeTab) {
        return false;
      }

      // Search query filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const source = locations.find((l) => l.id === tr.source_location_id)?.name || "";
        const dest = locations.find((l) => l.id === tr.destination_location_id)?.name || "";
        const matchNum = (tr.transfer_number || "").toLowerCase().includes(q);
        const matchSource = source.toLowerCase().includes(q);
        const matchDest = dest.toLowerCase().includes(q);
        return matchNum || matchSource || matchDest;
      }

      return true;
    });
  }, [transfers, locations, activeTab, searchTerm]);

  return (
    <div className="space-y-4 font-sans text-slate-800">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-[100] flex items-center gap-2 rounded-md bg-slate-900 px-3.5 py-2.5 text-xs font-medium text-white shadow-xl animate-in slide-in-from-bottom-2 duration-150">
          <Check className="h-3.5 w-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sticky ERP Page Header — Spans full width under top navbar */}
      <ErpPageHeader
        category="Logistics & Internal Movements"
        title="Inter-Branch Stock Transfers"
        description="Transfer inventory items between warehouses, shops, and outlets with transit tracking"
        icon={ArrowLeftRight}
        iconBgColor="bg-sky-600 text-white"
        tabs={[
          { id: "wh-metrics", label: "KPI Overview", icon: Activity },
          { id: "transfers-table", label: "Transfers Master", icon: ArrowLeftRight, count: transfers.length },
        ]}
        actions={
          canCreate ? (
            <Link
              href="/stock-transfers/new"
              className="flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Transfer</span>
            </Link>
          ) : undefined
        }
      />

      {/* Main Content Container below header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-6 space-y-4">
        {/* KPI Metric Summary Cards */}
        <div id="wh-metrics" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl bg-white border border-slate-200/80 shadow-2xs p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-xs font-semibold text-slate-500">Total Transfers</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                <ArrowLeftRight className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900 tracking-tight leading-none">{metrics.all}</p>
            <p className="mt-1.5 text-xs text-slate-500 font-medium">All recorded transfer movements</p>
          </div>

          <div className="rounded-xl bg-white border border-slate-200/80 shadow-2xs p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-xs font-semibold text-slate-500">In Transit</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Truck className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900 tracking-tight leading-none">{metrics.shipped}</p>
            <p className="mt-1.5 text-xs text-slate-500 font-medium">Shipped and en-route</p>
          </div>

          <div className="rounded-xl bg-white border border-slate-200/80 shadow-2xs p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-xs font-semibold text-slate-500">Received</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900 tracking-tight leading-none">{metrics.received}</p>
            <p className="mt-1.5 text-xs text-slate-500 font-medium">Completed stock in</p>
          </div>

          <div className="rounded-xl bg-white border border-slate-200/80 shadow-2xs p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <p className="text-xs font-semibold text-slate-500">Drafts</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900 tracking-tight leading-none">{metrics.draft}</p>
            <p className="mt-1.5 text-xs text-slate-500 font-medium">Pending dispatch</p>
          </div>
        </div>

        {/* Main Table Container Card */}
        <div id="transfers-table" className="bg-white rounded-lg border border-slate-200/80 shadow-2xs overflow-hidden">
          {/* View Tabs Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200/80 bg-slate-50/80 pl-0 pr-3 pt-2.5">
            <div className="flex items-center gap-1 overflow-x-auto select-none">
              <button
                onClick={() => setActiveTab("ALL")}
                className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2.5 text-xs font-medium transition-all duration-300 ease-in-out cursor-pointer ${
                  activeTab === "ALL"
                    ? "relative bg-white text-slate-900 border border-slate-200/90 border-b-transparent shadow-2xs font-semibold translate-y-[1px] z-10"
                    : "border border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/50"
                }`}
              >
                <ArrowLeftRight className="h-3.5 w-3.5 text-slate-500" />
                <span>All transfers</span>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-semibold text-white shrink-0">
                  {metrics.all}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("SHIPPED")}
                className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2.5 text-xs font-medium transition-all duration-300 ease-in-out cursor-pointer ${
                  activeTab === "SHIPPED"
                    ? "relative bg-white text-slate-900 border border-slate-200/90 border-b-transparent shadow-2xs font-semibold translate-y-[1px] z-10"
                    : "border border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/50"
                }`}
              >
                <Truck className="h-3.5 w-3.5 text-blue-500" />
                <span>Shipped</span>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-semibold text-white shrink-0">
                  {metrics.shipped}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("RECEIVED")}
                className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2.5 text-xs font-medium transition-all duration-300 ease-in-out cursor-pointer ${
                  activeTab === "RECEIVED"
                    ? "relative bg-white text-slate-900 border border-slate-200/90 border-b-transparent shadow-2xs font-semibold translate-y-[1px] z-10"
                    : "border border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/50"
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Received</span>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-semibold text-white shrink-0">
                  {metrics.received}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("DRAFT")}
                className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2.5 text-xs font-medium transition-all duration-300 ease-in-out cursor-pointer ${
                  activeTab === "DRAFT"
                    ? "relative bg-white text-slate-900 border border-slate-200/90 border-b-transparent shadow-2xs font-semibold translate-y-[1px] z-10"
                    : "border border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/50"
                }`}
              >
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                <span>Draft</span>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-semibold text-white shrink-0">
                  {metrics.draft}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("CANCELLED")}
                className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2.5 text-xs font-medium transition-all duration-300 ease-in-out cursor-pointer ${
                  activeTab === "CANCELLED"
                    ? "relative bg-white text-slate-900 border border-slate-200/90 border-b-transparent shadow-2xs font-semibold translate-y-[1px] z-10"
                    : "border border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/50"
                }`}
              >
                <X className="h-3.5 w-3.5 text-rose-500" />
                <span>Cancelled</span>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-semibold text-white shrink-0">
                  {metrics.cancelled}
                </span>
              </button>
            </div>

            {/* Integrated Search Box on the Right */}
            <div className="relative w-full sm:w-64 py-1.5 sm:py-1">
              <Search className="absolute left-2.5 top-3 sm:top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search transfer # or location..."
                className="w-full rounded-md border border-slate-200 bg-white pl-8 pr-7 py-1 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans">
              <thead>
                <tr className="border-b border-slate-200/90 bg-slate-50/60 text-xs font-semibold text-slate-700">
                  <th className="py-2.5 px-4 border-r border-slate-200/80 whitespace-nowrap">Transfer #</th>
                  <th className="py-2.5 px-4 border-r border-slate-200/80 whitespace-nowrap">Source Branch</th>
                  <th className="py-2.5 px-4 border-r border-slate-200/80 whitespace-nowrap">Destination Branch</th>
                  <th className="py-2.5 px-4 border-r border-slate-200/80 whitespace-nowrap">Date Created</th>
                  <th className="py-2.5 px-4 border-r border-slate-200/80 whitespace-nowrap">Status</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap w-24">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200/80 text-xs font-normal text-slate-800">
                {filteredTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-normal">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <FileText className="h-8 w-8 text-slate-300" />
                        <p className="text-sm font-medium text-slate-700">No stock transfers found</p>
                        <p className="text-xs text-slate-400">
                          Try adjusting search query or active view tab filter.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTransfers.map((tr) => {
                    const source = locations.find((l) => l.id === tr.source_location_id);
                    const destination = locations.find((l) => l.id === tr.destination_location_id);
                    const dateObj = new Date(tr.created_at);

                    return (
                      <tr
                        key={tr.id}
                        onClick={() => router.push(`/stock-transfers/${tr.id}`)}
                        className="h-11 border-b border-slate-200/80 hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      >
                        {/* Transfer # Cell with Copy Button */}
                        <td className="py-2.5 px-4 border-r border-slate-200/80 whitespace-nowrap font-medium text-slate-900">
                          <div className="group/ref flex items-center justify-between gap-1.5">
                            <span>{tr.transfer_number}</span>
                            <button
                              type="button"
                              onClick={(e) => handleCopy(tr.transfer_number, "Transfer Number", e)}
                              className="opacity-0 group-hover/ref:opacity-100 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all cursor-pointer shadow-2xs"
                              title="Copy Transfer Number"
                            >
                              {copiedItem === tr.transfer_number ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Source Location */}
                        <td className="py-2.5 px-4 border-r border-slate-200/80 whitespace-nowrap text-slate-700">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{source?.name || "Unknown"}</span>
                          </div>
                        </td>

                        {/* Destination Location */}
                        <td className="py-2.5 px-4 border-r border-slate-200/80 whitespace-nowrap text-slate-700">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{destination?.name || "Unknown"}</span>
                          </div>
                        </td>

                        {/* Date Created */}
                        <td className="py-2.5 px-4 border-r border-slate-200/80 whitespace-nowrap text-slate-600">
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-medium text-slate-800">{format(dateObj, "MMM d, yyyy")}</span>
                            <span className="text-slate-400 text-[11px]">
                              ({formatDistanceToNow(dateObj, { addSuffix: false })} ago)
                            </span>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-2.5 px-4 border-r border-slate-200/80 whitespace-nowrap">
                          <StatusBadge status={tr.status} />
                        </td>

                        {/* Action Cell */}
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 hover:text-sky-800 group-hover:underline">
                            <span>Inspect</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </span>
                        </td>
                      </tr>
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
