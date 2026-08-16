"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  ClipboardList,
  Search,
  X,
  FileText,
  Building2,
  MapPin,
  Calendar,
  Truck,
  CheckCircle2,
  Clock,
  ChevronRight,
  ExternalLink,
  Receipt,
  Filter,
} from "lucide-react";
import { GoodsReceipt } from "@/modules/receiving/schemas/grn.schema";
import { Supplier } from "@/modules/suppliers/schemas/supplier.schema";
import { Location } from "@/modules/locations/schemas/location.schema";
import { CreateGrnDialog } from "./create-grn-dialog";
import { ErpPageHeader } from "@/shared/components/layout/erp-page-header";
import { format } from "date-fns";

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "POSTED":
      return (
        <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>Posted</span>
        </span>
      );
    case "CANCELLED":
      return (
        <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/60">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          <span>Cancelled</span>
        </span>
      );
    case "DRAFT":
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          <span>Draft</span>
        </span>
      );
  }
}

interface GrnListTableProps {
  grns: GoodsReceipt[];
  suppliers: Supplier[];
  warehouseLocations: Location[];
  purchaseOrders: any[];
  canCreate: boolean;
}

export function GrnListTable({
  grns,
  suppliers,
  warehouseLocations,
  purchaseOrders,
  canCreate,
}: GrnListTableProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("ALL");

  const getSupplier = (id: string) => suppliers.find((s) => s.id === id);
  const getLocation = (id: string) => warehouseLocations.find((l) => l.id === id);
  const getPo = (id: string | null | undefined) =>
    id ? purchaseOrders.find((p) => p.id === id) : null;

  // Filtered list
  const filteredGrns = useMemo(() => {
    return grns.filter((g) => {
      // Status
      if (statusFilter !== "ALL" && g.status !== statusFilter) return false;

      // Warehouse
      if (selectedWarehouse !== "ALL" && g.warehouse_location_id !== selectedWarehouse)
        return false;

      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchGrn = g.grn_number.toLowerCase().includes(q);
        const matchInvoice = g.invoice_number?.toLowerCase().includes(q);
        const matchSupplier = getSupplier(g.supplier_id)?.name.toLowerCase().includes(q);
        const po = getPo(g.purchase_order_id);
        const matchPo = po?.po_number?.toLowerCase().includes(q);
        if (!matchGrn && !matchInvoice && !matchSupplier && !matchPo) return false;
      }

      return true;
    });
  }, [grns, statusFilter, selectedWarehouse, search, suppliers, purchaseOrders]);

  const tabs = [
    { id: "ALL", label: "All Receipts", count: grns.length },
    { id: "DRAFT", label: "Drafts", count: grns.filter((g) => g.status === "DRAFT").length },
    { id: "POSTED", label: "Posted", count: grns.filter((g) => g.status === "POSTED").length },
    {
      id: "CANCELLED",
      label: "Cancelled",
      count: grns.filter((g) => g.status === "CANCELLED").length,
    },
  ];

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Sticky ERP Page Header */}
      <ErpPageHeader
        category="Goods Receiving & Inbound"
        title="Goods Receipt Notes (GRN)"
        description="Verify supplier deliveries against purchase orders and record warehouse inventory receipts"
        icon={ClipboardList}
        iconBgColor="bg-blue-600 text-white"
        colorTheme="blue"
        tabs={[
          { id: "grn-table", label: "Receipts Ledger", icon: ClipboardList, count: grns.length },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create GRN</span>
            </button>
          </div>
        }
      />

      {/* Main Ledger Table Card */}
      <div id="grn-table" className="bg-white rounded-md border border-slate-200 shadow-xs overflow-hidden">
        {/* 1. Jira Status Filter Tabs */}
        <div className="bg-slate-50/70 border-b border-slate-200/80 px-3.5 py-2 flex items-center gap-1.5 overflow-x-auto select-none">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === tab.id
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] font-mono ${
                  statusFilter === tab.id ? "text-blue-100" : "text-slate-400"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* 2. Search & Secondary Filters Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 px-3.5 py-2.5 border-b border-slate-200/80 bg-white">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by GRN#, Invoice#, PO#, or Supplier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 rounded-md border border-slate-200 bg-slate-50/50 pl-8 pr-7 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500/20 transition-all font-sans"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Warehouse Filter */}
            {warehouseLocations.length > 1 && (
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="h-8 rounded-md border border-slate-200 bg-slate-50/50 px-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer font-sans"
              >
                <option value="ALL">All Warehouses</option>
                {warehouseLocations.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create GRN</span>
            </button>
          </div>
        </div>

        {/* 3. Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/90 bg-slate-50/50 text-[11px] font-medium text-slate-500 select-none">
                <th className="py-2.5 px-3.5 border-r border-slate-200/80 w-[16%]">GRN Reference</th>
                <th className="py-2.5 px-3.5 border-r border-slate-200/80 w-[14%]">Purchase Order</th>
                <th className="py-2.5 px-3.5 border-r border-slate-200/80 w-[20%]">Supplier</th>
                <th className="py-2.5 px-3.5 border-r border-slate-200/80 w-[16%]">Receiving Warehouse</th>
                <th className="py-2.5 px-3.5 border-r border-slate-200/80 w-[13%]">Invoice #</th>
                <th className="py-2.5 px-3.5 border-r border-slate-200/80 w-[11%]">Received Date</th>
                <th className="py-2.5 px-3.5 text-center w-[10%]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 text-xs text-slate-800 font-normal">
              {filteredGrns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <ClipboardList className="h-7 w-7 text-slate-300 mx-auto mb-1.5" />
                    <p className="text-xs font-medium text-slate-600">No goods receipt notes found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {search ? "Try clearing search filter" : "Click 'Create GRN' to record incoming stock deliveries"}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredGrns.map((grn) => {
                  const supplier = getSupplier(grn.supplier_id);
                  const location = getLocation(grn.warehouse_location_id);
                  const po = getPo(grn.purchase_order_id);

                  return (
                    <tr
                      key={grn.id}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                    >
                      {/* GRN Reference */}
                      <td className="py-2.5 px-3.5 border-r border-slate-200/80 font-medium">
                        <Link
                          href={`/receiving/${grn.id}`}
                          className="flex items-center gap-2 text-slate-900 group-hover:text-blue-600 transition-colors font-semibold"
                        >
                          <ClipboardList className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                          <span>{grn.grn_number}</span>
                        </Link>
                      </td>

                      {/* PO Reference */}
                      <td className="py-2.5 px-3.5 border-r border-slate-200/80 font-mono text-xs">
                        {po ? (
                          <Link
                            href={`/purchase-orders/${po.id}`}
                            className="inline-flex items-center gap-1 text-slate-700 hover:text-blue-600 hover:underline bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/70"
                          >
                            <FileText className="h-3 w-3 text-blue-600" />
                            <span>{po.po_number}</span>
                          </Link>
                        ) : (
                          <span className="text-slate-400 italic">Manual GRN</span>
                        )}
                      </td>

                      {/* Supplier */}
                      <td className="py-2.5 px-3.5 border-r border-slate-200/80">
                        <div className="flex items-center gap-1.5">
                          <div className="h-4.5 w-4.5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                            {supplier?.name?.charAt(0) || "S"}
                          </div>
                          <span className="font-medium text-slate-900 truncate">
                            {supplier?.name || "Unknown Supplier"}
                          </span>
                        </div>
                      </td>

                      {/* Destination Warehouse */}
                      <td className="py-2.5 px-3.5 border-r border-slate-200/80 text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <div className="h-4.5 w-4.5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                            {location?.name?.charAt(0) || "W"}
                          </div>
                          <span className="truncate">{location?.name || "Warehouse"}</span>
                        </div>
                      </td>

                      {/* Invoice # */}
                      <td className="py-2.5 px-3.5 border-r border-slate-200/80 font-mono text-xs text-slate-600">
                        {grn.invoice_number ? (
                          <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/60 inline-block truncate max-w-[120px]">
                            {grn.invoice_number}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Received Date */}
                      <td className="py-2.5 px-3.5 border-r border-slate-200/80 text-slate-600">
                        <div className="flex items-center gap-1 text-slate-600">
                          <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{format(new Date(grn.received_date), "MMM d, yyyy")}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3.5 text-center">
                        <StatusBadge status={grn.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create GRN Dialog */}
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
