"use client";

import { useState } from "react";
import { Plus, Hash, Building2, FileText, Calendar, Activity, ClipboardList } from "lucide-react";
import { useTransition } from "react";
import { GoodsReceipt } from "@/modules/receiving/schemas/grn.schema";
import { Supplier } from "@/modules/suppliers/schemas/supplier.schema";
import { Location } from "@/modules/locations/schemas/location.schema";
import { deleteGrn } from "@/modules/receiving/services/grn.actions";
import { CreateGrnDialog } from "./create-grn-dialog";
import { useRouter } from "next/navigation";
import { TableToolbar } from "@/shared/components/ui/table-toolbar";
import { ErpPageHeader } from "@/shared/components/layout/erp-page-header";

interface GrnListTableProps {
  grns: GoodsReceipt[];
  suppliers: Supplier[];
  warehouseLocations: Location[];
  purchaseOrders: any[];
  canCreate: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-yellow-100 text-yellow-800",
  POSTED: "bg-green-100 text-green-800",
  CANCELLED: "bg-zinc-100 text-zinc-600",
};

export function GrnListTable({ grns, suppliers, warehouseLocations, purchaseOrders, canCreate }: GrnListTableProps) {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [activeSort, setActiveSort] = useState("date-desc");

  const sortOptions = [
    { label: "Date (Newest)", value: "date-desc" },
    { label: "Date (Oldest)", value: "date-asc" },
    { label: "GRN # (A-Z)", value: "number-asc" },
    { label: "GRN # (Z-A)", value: "number-desc" },
    { label: "Status (A-Z)", value: "status-asc" },
  ];
  const [showFilters, setShowFilters] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filtered = (statusFilter ? grns.filter((g) => g.status === statusFilter) : grns).sort((a, b) => {
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

      <div id="grn-table" className="space-y-4">

      <TableToolbar 
        sortOptions={sortOptions}
        activeSort={activeSort}
        onSortChange={setActiveSort}
        onFilter={() => setShowFilters(!showFilters)} 
      />

      {showFilters && (
        <div className="mb-4 flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-sky-600"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="POSTED">Posted</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      )}

      <div className="rounded-md border border-neutral-200 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/60 text-xs font-semibold text-neutral-700">
                <th className="py-2.5 px-4 border-r border-neutral-200"><div className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5 text-neutral-400" />GRN #</div></th>
                <th className="py-2.5 px-4 border-r border-neutral-200"><div className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-neutral-400" />Supplier</div></th>
                <th className="py-2.5 px-4 border-r border-neutral-200"><div className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-neutral-400" />Invoice #</div></th>
                <th className="py-2.5 px-4 border-r border-neutral-200"><div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-neutral-400" />Received Date</div></th>
                <th className="py-2.5 px-4"><div className="flex items-center justify-center gap-1.5"><Activity className="w-3.5 h-3.5 text-neutral-400" />Status</div></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-xs font-normal text-neutral-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-zinc-500">
                  No goods receipts found. Create your first GRN to start receiving stock.
                </td>
              </tr>
            ) : (
              filtered.map((grn) => (
                <tr key={grn.id} onClick={() => router.push(`/receiving/${grn.id}`)} className="h-11 border-b border-neutral-200 transition-colors group cursor-pointer hover:bg-neutral-50/80">
                  <td className="py-2.5 px-4 border-r border-neutral-200 font-medium text-neutral-900">
                    {grn.grn_number}
                  </td>
                  <td className="py-2.5 px-4 border-r border-neutral-200 text-neutral-600">
                    {getSupplierName(grn.supplier_id)}
                  </td>
                  <td className="py-2.5 px-4 border-r border-neutral-200 text-neutral-600">
                    {grn.invoice_number || "-"}
                  </td>
                  <td className="py-2.5 px-4 border-r border-neutral-200 text-neutral-600 whitespace-nowrap">
                    {grn.received_date}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[grn.status] || ""}`}>
                      {grn.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          </table>
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
    </div>
  );
}

