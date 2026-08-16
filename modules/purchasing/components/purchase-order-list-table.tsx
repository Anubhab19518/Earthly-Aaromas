"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { 
  Plus, 
  Search, 
  FileText, 
  Hash, 
  Building2, 
  MapPin, 
  Calendar, 
  IndianRupee, 
  Activity,
  ChevronRight,
  Filter,
  Layers,
  X
} from "lucide-react";
import { ErpPageHeader } from "@/shared/components/layout/erp-page-header";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { dot: string, label: string }> = {
    DRAFT: { dot: "bg-slate-500", label: "Draft" },
    APPROVED: { dot: "bg-sky-500", label: "Approved" },
    SENT: { dot: "bg-indigo-500", label: "Sent" },
    PARTIAL: { dot: "bg-amber-500", label: "Partial" },
    COMPLETED: { dot: "bg-emerald-500", label: "Completed" },
    CANCELLED: { dot: "bg-rose-500", label: "Cancelled" },
  };

  const style = styles[status] || styles.DRAFT;

  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-slate-200/90 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs">
      <span className={`h-2 w-2 rounded-[2px] shrink-0 ${style.dot}`} />
      <span>{style.label}</span>
    </div>
  );
}

export function PurchaseOrderListTable({
  purchaseOrders,
  suppliers,
  locations,
  canCreate,
}: {
  purchaseOrders: any[];
  suppliers: any[];
  locations: any[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [supplierFilter, setSupplierFilter] = useState<string>("ALL");
  const [activeSort, setActiveSort] = useState("date-desc");

  // Filter and Sort Logic
  const filteredOrders = purchaseOrders.filter((po) => {
    const matchesSearch = po.po_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || po.status === statusFilter;
    const matchesSupplier = supplierFilter === "ALL" || po.supplier_id === supplierFilter;
    return matchesSearch && matchesStatus && matchesSupplier;
  }).sort((a, b) => {
    const [by, dir] = activeSort.split("-");
    const mod = dir === "asc" ? 1 : -1;
    if (by === "number") {
      return a.po_number.toLowerCase().localeCompare(b.po_number.toLowerCase()) * mod;
    }
    if (by === "status") {
      return a.status.localeCompare(b.status) * mod;
    }
    if (by === "amount") {
      return (Number(a.total_amount) - Number(b.total_amount)) * mod;
    }
    if (by === "date") {
      return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * mod;
    }
    return 0;
  });

  // Calculate counts for tabs
  const getCount = (status: string) => status === "ALL" 
    ? purchaseOrders.length 
    : purchaseOrders.filter(po => po.status === status).length;

  const tabs = [
    { id: "ALL", label: "All Orders" },
    { id: "DRAFT", label: "Drafts" },
    { id: "APPROVED", label: "Approved" },
    { id: "SENT", label: "Sent" },
    { id: "COMPLETED", label: "Completed" },
    { id: "PARTIAL", label: "Partial" },
  ];

  return (
    <div className="space-y-6">
      {/* Sticky ERP Page Header */}
      <ErpPageHeader
        category="Procurement & Purchasing"
        title="Purchase Orders Directory"
        description="Create, track, and manage raw material purchase orders sent to approved suppliers"
        icon={FileText}
        iconBgColor="bg-sky-600 text-white"
        tabs={[
          { id: "pos-table", label: "Purchase Orders Master", icon: FileText, count: purchaseOrders.length },
        ]}
        actions={
          canCreate ? (
            <Link
              href="/purchase-orders/new"
              className="flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New PO</span>
            </Link>
          ) : undefined
        }
      />

      {/* Main Card Container */}
      <div id="pos-table" className="bg-white shadow-xs overflow-hidden rounded-xl border border-slate-200">
        
        {/* Top View Tabs (Airtable / Linear Style) */}
        <div className="flex items-center gap-1 bg-slate-50/70 pl-0 pr-4 pt-2.5 overflow-x-auto select-none border-b border-slate-200/80">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2.5 text-xs font-medium transition-all duration-300 ease-in-out cursor-pointer whitespace-nowrap ${
                statusFilter === tab.id
                  ? "relative bg-white text-slate-900 border border-slate-200/90 border-b-transparent shadow-2xs font-semibold translate-y-[1px] z-10"
                  : "border border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/50"
              }`}
            >
              <span>{tab.label}</span>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-semibold text-white shrink-0">
                {getCount(tab.id)}
              </span>
            </button>
          ))}
          
          <div className="h-4 w-px bg-slate-200/80 mx-1" />
          
          {canCreate && (
            <Link
              href="/purchase-orders/new"
              className="flex items-center gap-1 rounded-t-lg px-3 py-2.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/50 transition-all duration-300 ease-in-out cursor-pointer whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5 text-slate-500" />
              <span>New</span>
            </Link>
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

            {/* Supplier Filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-slate-500" />
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="bg-transparent font-medium text-slate-700 outline-none cursor-pointer hover:text-slate-900 focus:outline-none"
              >
                <option value="ALL">All Suppliers</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

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
                <option value="number-asc">PO Number (A-Z)</option>
                <option value="number-desc">PO Number (Z-A)</option>
                <option value="status-asc">Status (A-Z)</option>
                <option value="amount-desc">Total Amount (High-Low)</option>
                <option value="amount-asc">Total Amount (Low-High)</option>
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
              placeholder="Search PO Number..."
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

        {/* Data Grid Table */}
        <div className="overflow-x-auto">
          {filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <FileText className="mb-4 h-12 w-12 text-slate-300" />
              <h3 className="text-[14px] font-medium text-slate-900">No Purchase Orders</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm">
                You don't have any purchase orders matching these filters. Try adjusting your search or create a new one.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/90 bg-slate-50/50 text-xs font-semibold text-slate-700">
                  <th className="py-2.5 px-4 border-r border-slate-200/80 w-[15%]"><div className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5 text-slate-400" />PO Number</div></th>
                  <th className="py-2.5 px-4 border-r border-slate-200/80 w-[20%]"><div className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-slate-400" />Supplier</div></th>
                  <th className="py-2.5 px-4 border-r border-slate-200/80 w-[20%]"><div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400" />Destination</div></th>
                  <th className="py-2.5 px-4 border-r border-slate-200/80 w-[15%]"><div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400" />Date</div></th>
                  <th className="py-2.5 px-4 border-r border-slate-200/80 w-[15%]"><div className="flex items-center gap-1.5"><IndianRupee className="w-3.5 h-3.5 text-slate-400" />Cost</div></th>
                  <th className="py-2.5 px-4 border-r border-slate-200/80 w-[10%]"><div className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-slate-400" />Status</div></th>
                  <th className="py-2.5 px-4 text-right w-[5%]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 text-xs font-normal text-slate-800">
                {filteredOrders.map((po) => {
                  const supplier = suppliers.find((s) => s.id === po.supplier_id);
                  const location = locations.find((l) => l.id === po.location_id);
                  return (
                    <tr 
                      key={po.id} 
                      onClick={() => router.push(`/purchase-orders/${po.id}`)} 
                      className="border-b border-slate-200/80 hover:bg-slate-50/60 transition-colors group cursor-pointer"
                    >
                      <td className="py-3 px-4 border-r border-slate-200/80 font-medium text-slate-900">{po.po_number}</td>
                      <td className="py-3 px-4 border-r border-slate-200/80 text-slate-700">{supplier?.name || "Unknown"}</td>
                      <td className="py-3 px-4 border-r border-slate-200/80 text-slate-700">{location?.name || "Unknown"}</td>
                      <td className="py-3 px-4 border-r border-slate-200/80 text-slate-600 font-normal">
                        {format(new Date(po.created_at), "MMM d, yyyy")}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200/80 font-medium text-slate-700">
                        {new Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: "INR",
                        }).format(po.total_expected_cost)}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200/80">
                        <StatusBadge status={po.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end">
                          <ChevronRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:text-slate-600 transition-all -translate-x-2 group-hover:translate-x-0" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
