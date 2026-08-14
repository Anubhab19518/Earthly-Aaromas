"use client";

import { useState } from "react";
import { 
  Plus, 
  Hash, 
  Building2, 
  FileText, 
  Calendar, 
  Activity, 
  ClipboardList,
  ChevronRight,
  Filter,
  Layers,
  X,
  Search
} from "lucide-react";
import { useTransition } from "react";
import { GoodsReceipt } from "@/modules/receiving/schemas/grn.schema";
import { Supplier } from "@/modules/suppliers/schemas/supplier.schema";
import { Location } from "@/modules/locations/schemas/location.schema";
import { CreateGrnDialog } from "./create-grn-dialog";
import { useRouter } from "next/navigation";
import { ErpPageHeader } from "@/shared/components/layout/erp-page-header";

function StatusBadge({ status }: { status: string }) {
  // Matching the bright, modern pill design from the reference image
  const styles: Record<string, { bg: string, text: string, border: string, dot: string, label: string }> = {
    DRAFT: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200", dot: "bg-slate-500", label: "Draft" },
    POSTED: { bg: "bg-[#eafff5]", text: "text-[#008a5e]", border: "border-[#a7f3d0]", dot: "bg-[#059669]", label: "Posted" },
    CANCELLED: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", dot: "bg-rose-500", label: "Cancelled" },
  };

  const style = styles[status] || styles.DRAFT;

  return (
    <span className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1 text-[13px] font-semibold tracking-tight whitespace-nowrap ${style.bg} ${style.border} ${style.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${style.dot}`} />
      <span>{style.label}</span>
    </span>
  );
}

interface GrnListTableProps {
  grns: GoodsReceipt[];
  suppliers: Supplier[];
  warehouseLocations: Location[];
  purchaseOrders: any[];
  canCreate: boolean;
}

export function GrnListTable({ grns, suppliers, warehouseLocations, purchaseOrders, canCreate }: GrnListTableProps) {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [activeSort, setActiveSort] = useState("date-desc");

  // Filter and Sort Logic
  const filtered = grns.filter((g) => {
    const matchesSearch = g.grn_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (g.invoice_number && g.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "ALL" || g.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    const [by, dir] = activeSort.split("-");
    const mod = dir === "asc" ? 1 : -1;
    if (by === "number") {
      return a.grn_number.toLowerCase().localeCompare(b.grn_number.toLowerCase()) * mod;
    }
    if (by === "status") {
      return a.status.localeCompare(b.status) * mod;
    }
    if (by === "date") {
      return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * mod;
    }
    return 0;
  });

  const getSupplierName = (id: string) => suppliers.find((s) => s.id === id)?.name ?? "-";

  // Calculate counts for tabs
  const getCount = (status: string) => status === "ALL" 
    ? grns.length 
    : grns.filter(g => g.status === status).length;

  const tabs = [
    { id: "ALL", label: "All Receipts" },
    { id: "DRAFT", label: "Drafts" },
    { id: "POSTED", label: "Posted" },
    { id: "CANCELLED", label: "Cancelled" },
  ];

  return (
    <div className="space-y-6">
      {/* Sticky ERP Page Header */}
      <ErpPageHeader
        category="Goods Receiving & Inbound"
        title="Goods Receipt Notes (GRN)"
        description="Verify supplier deliveries against purchase orders and record warehouse inventory receipts"
        icon={ClipboardList}
        iconBgColor="bg-amber-500 text-white"
        tabs={[
          { id: "grn-table", label: "Receipt Notes Ledger", icon: ClipboardList, count: grns.length },
        ]}
        actions={
          canCreate ? (
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create GRN</span>
            </button>
          ) : undefined
        }
      />

      <div id="grn-table" className="bg-white shadow-xs overflow-hidden rounded-xl border border-slate-200">
        
        {/* Top View Tabs (Airtable / Linear Style) */}
        <div className="flex items-center gap-1 bg-slate-50/70 px-4 pt-2.5 overflow-x-auto select-none border-b border-slate-200/80">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2 text-xs font-medium transition-all whitespace-nowrap ${
                statusFilter === tab.id
                  ? "bg-white text-slate-900 border border-b-white border-slate-200/90 shadow-2xs font-semibold -mb-px z-10"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                statusFilter === tab.id ? "bg-slate-100 text-slate-500" : "text-slate-400"
              }`}>
                {getCount(tab.id)}
              </span>
            </button>
          ))}
          
          <div className="h-4 w-px bg-slate-200/80 mx-1" />
          
          {canCreate && (
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1 rounded-t-lg px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5 text-slate-500" />
              <span>New</span>
            </button>
          )}
        </div>

        {/* Inline Toolbar */}
        <div className="flex flex-col gap-2.5 border-b border-slate-200/80 bg-white px-4 py-2 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-600">
          <div className="flex items-center gap-3 overflow-x-auto py-0.5">
            <button className="flex items-center gap-1.5 font-medium text-slate-700 hover:text-slate-900 cursor-pointer">
              <Layers className="h-3.5 w-3.5 text-slate-500" />
              <span>Grouping</span>
            </button>

            <div className="h-3.5 w-px bg-slate-200" />

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-slate-700">Sort:</span>
              <select
                value={activeSort}
                onChange={(e) => setActiveSort(e.target.value)}
                className="bg-transparent font-medium text-slate-700 outline-none cursor-pointer hover:text-slate-900 focus:outline-none"
              >
                <option value="date-desc">Date (Newest)</option>
                <option value="date-asc">Date (Oldest)</option>
                <option value="number-asc">GRN Number (A-Z)</option>
                <option value="number-desc">GRN Number (Z-A)</option>
                <option value="status-asc">Status (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search GRN or Invoice..."
              className="w-full rounded-md border border-slate-200/80 bg-slate-50/50 pl-8 pr-7 py-1 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500/20 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <ClipboardList className="mb-4 h-12 w-12 text-slate-300" />
              <h3 className="text-[14px] font-medium text-slate-900">No Goods Receipts</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm">
                You don't have any GRNs matching these filters. Try adjusting your search or create a new one.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/90 bg-slate-50/50 text-xs font-semibold text-slate-700">
                  <th className="py-2.5 px-4 border-r border-slate-200/80 w-[20%]"><div className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5 text-slate-400" />GRN #</div></th>
                  <th className="py-2.5 px-4 border-r border-slate-200/80 w-[25%]"><div className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-slate-400" />Supplier</div></th>
                  <th className="py-2.5 px-4 border-r border-slate-200/80 w-[20%]"><div className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-slate-400" />Invoice #</div></th>
                  <th className="py-2.5 px-4 border-r border-slate-200/80 w-[15%]"><div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400" />Received Date</div></th>
                  <th className="py-2.5 px-4 border-r border-slate-200/80 w-[15%]"><div className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-slate-400" />Status</div></th>
                  <th className="py-2.5 px-4 text-right w-[5%]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 text-xs font-normal text-slate-800">
                {filtered.map((grn) => (
                  <tr 
                    key={grn.id} 
                    onClick={() => router.push(`/receiving/${grn.id}`)} 
                    className="border-b border-slate-200/80 hover:bg-slate-50/60 transition-colors group cursor-pointer"
                  >
                    <td className="py-3 px-4 border-r border-slate-200/80 font-medium text-slate-900">
                      {grn.grn_number}
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200/80 text-slate-700">
                      {getSupplierName(grn.supplier_id)}
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200/80 text-slate-700">
                      {grn.invoice_number || "-"}
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200/80 text-slate-600 font-normal whitespace-nowrap">
                      {grn.received_date}
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200/80">
                      <StatusBadge status={grn.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end">
                        <ChevronRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:text-slate-600 transition-all -translate-x-2 group-hover:translate-x-0" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <CreateGrnDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        suppliers={suppliers}
        warehouseLocations={warehouseLocations}
        purchaseOrders={purchaseOrders}
      />
    </div>
  );
}

